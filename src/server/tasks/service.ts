import type { Prisma } from "@/generated/prisma/client";
import { isUuid } from "@/lib/validation/ids";
import {
  dueRange,
  taskSchema,
  TASKS_PER_PAGE,
  type TaskListParams,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/validation/task";
import type { Db } from "@/server/db/client";
import {
  forbidden,
  invalid,
  invalidFields,
  notFound,
  ok,
  type ServiceResult,
} from "@/server/result";
import type { WorkspaceContext } from "@/server/workspace/service";

// Task rules. Every query is limited to the caller's workspace, and a task
// can only belong to a project of that same workspace.

const taskFields = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  project: { select: { id: true, name: true } },
} as const;

export type TaskRecord = Prisma.TaskGetPayload<{ select: typeof taskFields }>;

const STATUS_FILTERS: Record<TaskListParams["status"], TaskStatus[] | undefined> = {
  open: ["TODO", "IN_PROGRESS"],
  todo: ["TODO"],
  in_progress: ["IN_PROGRESS"],
  done: ["DONE"],
  all: undefined,
};

const PRIORITY_FILTERS: Record<TaskListParams["priority"], TaskPriority | undefined> = {
  any: undefined,
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

// The priority enum is stored LOW, MEDIUM, HIGH, so "desc" puts HIGH first.
const SORTS: Record<TaskListParams["sort"], Prisma.TaskOrderByWithRelationInput[]> = {
  due: [
    { dueDate: { sort: "asc", nulls: "last" } },
    { priority: "desc" },
    { createdAt: "desc" },
    { id: "asc" },
  ],
  priority: [{ priority: "desc" }, { dueDate: { sort: "asc", nulls: "last" } }, { id: "asc" }],
  updated: [{ updatedAt: "desc" }, { id: "desc" }],
  newest: [{ createdAt: "desc" }, { id: "desc" }],
};

/**
 * One page of tasks. `today` ("YYYY-MM-DD", in the workspace's time zone)
 * decides what the due filters mean.
 */
export async function listTasks(
  db: Db,
  ctx: WorkspaceContext,
  params: TaskListParams,
  today: string,
) {
  const statuses = STATUS_FILTERS[params.status];
  const priority = PRIORITY_FILTERS[params.priority];
  const range = dueRange(params.due, today);
  const where: Prisma.TaskWhereInput = {
    workspaceId: ctx.workspace.id,
    ...(statuses && { status: { in: statuses } }),
    ...(priority && { priority }),
    ...(params.project === "none" && { projectId: null }),
    ...(params.project && params.project !== "none" && { projectId: params.project }),
    ...(range !== undefined && { dueDate: range }),
    // Overdue means not done yet, whatever the status filter says.
    ...(params.due === "overdue" && { status: { not: "DONE" } }),
    ...(params.q && { title: { contains: params.q, mode: "insensitive" } }),
  };
  const total = await db.task.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / TASKS_PER_PAGE));
  const page = Math.min(params.page, pageCount);
  const items = await db.task.findMany({
    where,
    orderBy: SORTS[params.sort],
    skip: (page - 1) * TASKS_PER_PAGE,
    take: TASKS_PER_PAGE,
    select: taskFields,
  });
  return { items, total, page, pageCount, pageSize: TASKS_PER_PAGE };
}

export async function getTask(db: Db, ctx: WorkspaceContext, id: string) {
  if (!isUuid(id)) return null;
  return db.task.findFirst({ where: { id, workspaceId: ctx.workspace.id }, select: taskFields });
}

/** A project's tasks: open ones first by due date, then done ones. */
export async function tasksForProject(db: Db, ctx: WorkspaceContext, projectId: string) {
  if (!isUuid(projectId)) return [];
  return db.task.findMany({
    where: { workspaceId: ctx.workspace.id, projectId },
    orderBy: [{ completedAt: { sort: "desc", nulls: "first" } }, ...SORTS.due],
    take: 100,
    select: taskFields,
  });
}

export type Progress = { done: number; total: number };

/** How many of each project's tasks are done. */
export async function projectProgress(
  db: Db,
  ctx: WorkspaceContext,
  projectIds: string[],
): Promise<Record<string, Progress>> {
  const ids = projectIds.filter(isUuid);
  if (ids.length === 0) return {};
  const rows = await db.task.groupBy({
    by: ["projectId", "status"],
    where: { workspaceId: ctx.workspace.id, projectId: { in: ids } },
    _count: { _all: true },
  });
  const progress: Record<string, Progress> = {};
  for (const row of rows) {
    if (!row.projectId) continue;
    const entry = (progress[row.projectId] ??= { done: 0, total: 0 });
    entry.total += row._count._all;
    if (row.status === "DONE") entry.done += row._count._all;
  }
  return progress;
}

/** Projects a task can go in: open ones, plus `includeId` (the current one). */
export async function projectOptions(db: Db, ctx: WorkspaceContext, includeId?: string | null) {
  return db.project.findMany({
    where: {
      workspaceId: ctx.workspace.id,
      OR: [
        { status: { notIn: ["COMPLETED", "CANCELLED"] } },
        ...(includeId && isUuid(includeId) ? [{ id: includeId }] : []),
      ],
    },
    orderBy: { name: "asc" },
    take: 500,
    select: { id: true, name: true },
  });
}

async function projectInWorkspace(
  tx: Prisma.TransactionClient,
  ctx: WorkspaceContext,
  projectId: string,
) {
  const project = await tx.project.findFirst({
    where: { id: projectId, workspaceId: ctx.workspace.id },
    select: { id: true },
  });
  return project !== null;
}

const NO_SUCH_PROJECT = { projectId: "Choose a project from the list." };

function logActivity(
  tx: Prisma.TransactionClient,
  ctx: WorkspaceContext,
  taskId: string,
  action: "CREATED" | "UPDATED" | "COMPLETED" | "STATUS_CHANGED" | "DELETED",
  summary: string,
) {
  return tx.activity.create({
    data: {
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      entityType: "TASK",
      entityId: taskId,
      action,
      summary: summary.slice(0, 300),
    },
  });
}

/** When a task is done: now if it just became done, kept if it already was. */
function completedAtFor(
  next: TaskStatus,
  previous?: { status: TaskStatus; completedAt: Date | null },
) {
  if (next !== "DONE") return null;
  return previous?.status === "DONE" && previous.completedAt ? previous.completedAt : new Date();
}

export async function createTask(
  db: Db,
  ctx: WorkspaceContext,
  input: unknown,
): Promise<ServiceResult<TaskRecord>> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  return db.$transaction(async (tx) => {
    const { projectId } = parsed.data;
    if (projectId && !(await projectInWorkspace(tx, ctx, projectId))) {
      return invalidFields(NO_SUCH_PROJECT);
    }
    const task = await tx.task.create({
      data: {
        ...parsed.data,
        workspaceId: ctx.workspace.id,
        completedAt: completedAtFor(parsed.data.status),
      },
      select: taskFields,
    });
    await logActivity(tx, ctx, task.id, "CREATED", `Added task ${task.title}`);
    return ok(task);
  });
}

export async function updateTask(
  db: Db,
  ctx: WorkspaceContext,
  id: string,
  input: unknown,
): Promise<ServiceResult<TaskRecord>> {
  if (!isUuid(id)) return notFound("task");
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  return db.$transaction(async (tx) => {
    const existing = await tx.task.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
      select: { status: true, completedAt: true },
    });
    if (!existing) return notFound("task");
    const { projectId } = parsed.data;
    if (projectId && !(await projectInWorkspace(tx, ctx, projectId))) {
      return invalidFields(NO_SUCH_PROJECT);
    }
    const task = await tx.task.update({
      where: { id },
      data: { ...parsed.data, completedAt: completedAtFor(parsed.data.status, existing) },
      select: taskFields,
    });
    const justDone = task.status === "DONE" && existing.status !== "DONE";
    await logActivity(
      tx,
      ctx,
      id,
      justDone ? "COMPLETED" : "UPDATED",
      justDone ? `Completed task ${task.title}` : `Updated task ${task.title}`,
    );
    return ok(task);
  });
}

/** Ticks a task off (done) or back to "to do". */
export async function setTaskDone(
  db: Db,
  ctx: WorkspaceContext,
  id: string,
  done: boolean,
): Promise<ServiceResult<TaskRecord>> {
  if (!isUuid(id)) return notFound("task");
  return db.$transaction(async (tx) => {
    const existing = await tx.task.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
      select: { status: true, completedAt: true },
    });
    if (!existing) return notFound("task");
    const status: TaskStatus = done ? "DONE" : "TODO";
    if ((existing.status === "DONE") === done) {
      const unchanged = await tx.task.findUniqueOrThrow({ where: { id }, select: taskFields });
      return ok(unchanged);
    }
    const task = await tx.task.update({
      where: { id },
      data: { status, completedAt: completedAtFor(status, existing) },
      select: taskFields,
    });
    await logActivity(
      tx,
      ctx,
      id,
      done ? "COMPLETED" : "STATUS_CHANGED",
      done ? `Completed task ${task.title}` : `Reopened task ${task.title}`,
    );
    return ok(task);
  });
}

export async function deleteTask(
  db: Db,
  ctx: WorkspaceContext,
  id: string,
): Promise<ServiceResult<{ id: string; title: string; projectId: string | null }>> {
  if (ctx.role !== "OWNER") return forbidden("Only the workspace owner can delete tasks.");
  if (!isUuid(id)) return notFound("task");
  return db.$transaction(async (tx) => {
    const existing = await tx.task.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
      select: { id: true, title: true, projectId: true },
    });
    if (!existing) return notFound("task");
    await tx.task.delete({ where: { id } });
    await logActivity(tx, ctx, id, "DELETED", `Deleted task ${existing.title}`);
    return ok(existing);
  });
}
