import { Prisma } from "@/generated/prisma/client";
import { todayIn, toDateOnly } from "@/lib/dates";
import { clientHealth, type Health } from "@/lib/health";
import { hourlyRate, timerMinutes, MAX_ENTRY_MINUTES } from "@/lib/time";
import { isUuid } from "@/lib/validation/ids";
import { timeEntrySchema, timerSchema } from "@/lib/validation/time";
import type { Db } from "@/server/db/client";
import {
  conflict,
  forbidden,
  invalid,
  invalidFields,
  notFound,
  ok,
  type ServiceResult,
} from "@/server/result";
import type { WorkspaceContext } from "@/server/workspace/service";

// Time tracking (Stage 17). Entries belong to a project of the caller's
// workspace (and maybe one of its tasks). Each person has at most one
// running timer: the database enforces it too (a partial unique index).

const day = (value: string) => new Date(`${value}T00:00:00Z`);

const NO_SUCH_PROJECT = { projectId: "Choose a project from the list." };
const NO_SUCH_TASK = { taskId: "Choose a task of this project." };

/**
 * Checks the project (and task) belong to the workspace, and the task to the
 * project. Returns the field errors, or null when all is well.
 */
async function checkTarget(
  tx: Prisma.TransactionClient,
  ctx: WorkspaceContext,
  projectId: string,
  taskId: string | null,
) {
  const project = await tx.project.findFirst({
    where: { id: projectId, workspaceId: ctx.workspace.id },
    select: { id: true },
  });
  if (!project) return NO_SUCH_PROJECT;
  if (taskId) {
    const task = await tx.task.findFirst({
      where: { id: taskId, workspaceId: ctx.workspace.id, projectId },
      select: { id: true },
    });
    if (!task) return NO_SUCH_TASK;
  }
  return null;
}

const runningFields = {
  id: true,
  startedAt: true,
  project: { select: { id: true, name: true } },
  task: { select: { id: true, title: true } },
} as const;

export type RunningTimer = Prisma.TimeEntryGetPayload<{ select: typeof runningFields }>;

/** The caller's running timer, if any. */
export function runningTimer(db: Db, ctx: WorkspaceContext): Promise<RunningTimer | null> {
  return db.timeEntry.findFirst({
    where: { workspaceId: ctx.workspace.id, userId: ctx.user.id, minutes: null },
    select: runningFields,
  });
}

/** Stops the running timer inside a transaction; returns what was recorded. */
async function stopRunning(tx: Prisma.TransactionClient, ctx: WorkspaceContext, now: Date) {
  const running = await tx.timeEntry.findFirst({
    where: { workspaceId: ctx.workspace.id, userId: ctx.user.id, minutes: null },
    select: { id: true, startedAt: true, project: { select: { name: true } } },
  });
  if (!running?.startedAt) return null;
  const minutes = timerMinutes(running.startedAt, now);
  const capped = now.getTime() - running.startedAt.getTime() > MAX_ENTRY_MINUTES * 60_000;
  await tx.timeEntry.update({ where: { id: running.id }, data: { minutes } });
  return { minutes, capped, projectName: running.project.name };
}

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

/**
 * Starts a timer on a project (and maybe a task). A timer already running
 * is stopped first and its time recorded, so switching work is one click.
 */
export async function startTimer(
  db: Db,
  ctx: WorkspaceContext,
  input: unknown,
  now = new Date(),
): Promise<ServiceResult<{ stopped: Awaited<ReturnType<typeof stopRunning>> }>> {
  const parsed = timerSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    return await db.$transaction(async (tx) => {
      const problem = await checkTarget(tx, ctx, parsed.data.projectId, parsed.data.taskId);
      if (problem) return invalidFields(problem);
      const stopped = await stopRunning(tx, ctx, now);
      await tx.timeEntry.create({
        data: {
          workspaceId: ctx.workspace.id,
          projectId: parsed.data.projectId,
          taskId: parsed.data.taskId,
          userId: ctx.user.id,
          day: day(todayIn(ctx.workspace.timezone, now)),
          startedAt: now,
        },
      });
      return ok({ stopped });
    });
  } catch (error) {
    // Two starts at the same moment: the second finds the first running.
    if (isUniqueViolation(error)) return conflict("A timer is already running. Try again.");
    throw error;
  }
}

/** Stops the caller's timer, recording its minutes (a day at most). */
export async function stopTimer(db: Db, ctx: WorkspaceContext, now = new Date()) {
  const stopped = await db.$transaction((tx) => stopRunning(tx, ctx, now));
  return stopped ? ok(stopped) : notFound("running timer");
}

/** Logs time by hand. The day can't be in the future. */
export async function logTime(
  db: Db,
  ctx: WorkspaceContext,
  input: unknown,
  today = todayIn(ctx.workspace.timezone),
): Promise<ServiceResult<{ id: string; minutes: number }>> {
  const parsed = timeEntrySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { projectId, taskId, duration, note } = parsed.data;
  const worked = parsed.data.day;
  if (!worked) return invalidFields({ day: "Enter the day you worked." });
  if (toDateOnly(worked) > today) return invalidFields({ day: "This day hasn't happened yet." });
  return db.$transaction(async (tx) => {
    const problem = await checkTarget(tx, ctx, projectId, taskId);
    if (problem) return invalidFields(problem);
    const entry = await tx.timeEntry.create({
      data: {
        workspaceId: ctx.workspace.id,
        projectId,
        taskId,
        userId: ctx.user.id,
        day: worked,
        minutes: duration,
        note,
      },
      select: { id: true, minutes: true },
    });
    return ok({ id: entry.id, minutes: entry.minutes! });
  });
}

/** Deletes an entry: your own, or anyone's if you own the workspace. */
export async function deleteTimeEntry(
  db: Db,
  ctx: WorkspaceContext,
  id: string,
): Promise<ServiceResult<{ id: string }>> {
  if (!isUuid(id)) return notFound("time entry");
  const entry = await db.timeEntry.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    select: { id: true, userId: true },
  });
  if (!entry) return notFound("time entry");
  if (entry.userId !== ctx.user.id && ctx.role !== "OWNER") {
    return forbidden("You can only delete your own time.");
  }
  await db.timeEntry.delete({ where: { id: entry.id } });
  return ok({ id: entry.id });
}

const entryFields = {
  id: true,
  day: true,
  minutes: true,
  startedAt: true,
  note: true,
  userId: true,
  user: { select: { name: true } },
  task: { select: { id: true, title: true } },
} as const;

export type TimeEntryRecord = Prisma.TimeEntryGetPayload<{ select: typeof entryFields }>;

/** A project's time: the latest entries, and the total of every finished one. */
export async function projectTime(db: Db, ctx: WorkspaceContext, projectId: string) {
  if (!isUuid(projectId)) return { entries: [] as TimeEntryRecord[], totalMinutes: 0 };
  const where = { workspaceId: ctx.workspace.id, projectId };
  const [entries, sum] = await Promise.all([
    db.timeEntry.findMany({
      where,
      orderBy: [{ day: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: entryFields,
    }),
    db.timeEntry.aggregate({
      where: { ...where, minutes: { not: null } },
      _sum: { minutes: true },
    }),
  ]);
  return { entries, totalMinutes: sum._sum.minutes ?? 0 };
}

export type ClientHealthRow = {
  /** The client's real hourly rate (minor units), or null. */
  rate: number | null;
  minutes: number;
  fees: number;
  overdue: number;
  health: Health;
};

/**
 * Health for some of the workspace's clients. A client's rate counts only
 * projects with both a fee and logged time (cancelled ones left out): their
 * fees over their hours. The average is the same over every client.
 * Overdue: their open projects and unfinished tasks past due.
 */
export async function clientsHealth(
  db: Db,
  ctx: WorkspaceContext,
  clientIds: string[],
  today = todayIn(ctx.workspace.timezone),
): Promise<Record<string, ClientHealthRow>> {
  const ids = clientIds.filter(isUuid);
  if (ids.length === 0) return {};
  const workspaceId = ctx.workspace.id;
  const todayDate = day(today);

  const [minutesByProject, paidProjects, overdueProjects, overdueTasks] = await Promise.all([
    db.timeEntry.groupBy({
      by: ["projectId"],
      where: { workspaceId, minutes: { not: null } },
      _sum: { minutes: true },
    }),
    db.project.findMany({
      where: { workspaceId, status: { not: "CANCELLED" }, fee: { not: null } },
      select: { id: true, fee: true, clientId: true },
    }),
    db.project.groupBy({
      by: ["clientId"],
      where: {
        workspaceId,
        clientId: { in: ids },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { lt: todayDate },
      },
      _count: { _all: true },
    }),
    db.task.findMany({
      where: {
        workspaceId,
        status: { not: "DONE" },
        dueDate: { lt: todayDate },
        project: { clientId: { in: ids } },
      },
      select: { project: { select: { clientId: true } } },
    }),
  ]);

  const minutesOf = new Map(minutesByProject.map((row) => [row.projectId, row._sum.minutes ?? 0]));
  const totals = new Map<string, { fees: number; minutes: number }>();
  let allFees = 0;
  let allMinutes = 0;
  for (const project of paidProjects) {
    const minutes = minutesOf.get(project.id) ?? 0;
    if (minutes === 0 || project.fee === null) continue;
    allFees += project.fee;
    allMinutes += minutes;
    if (!project.clientId) continue;
    const total = totals.get(project.clientId) ?? { fees: 0, minutes: 0 };
    total.fees += project.fee;
    total.minutes += minutes;
    totals.set(project.clientId, total);
  }
  const averageRate = hourlyRate(allMinutes > 0 ? allFees : null, allMinutes);

  const overdue = new Map<string, number>();
  for (const row of overdueProjects) {
    if (row.clientId) overdue.set(row.clientId, row._count._all);
  }
  for (const task of overdueTasks) {
    const clientId = task.project?.clientId;
    if (clientId) overdue.set(clientId, (overdue.get(clientId) ?? 0) + 1);
  }

  return Object.fromEntries(
    ids.map((id) => {
      const total = totals.get(id) ?? { fees: 0, minutes: 0 };
      const rate = hourlyRate(total.minutes > 0 ? total.fees : null, total.minutes);
      const late = overdue.get(id) ?? 0;
      return [
        id,
        {
          rate,
          minutes: total.minutes,
          fees: total.fees,
          overdue: late,
          health: clientHealth({ rate, averageRate, overdue: late }),
        },
      ];
    }),
  );
}
