import { addDays, startOfDayInZone, weekStart } from "@/lib/dashboard";
import type { Db } from "@/server/db/client";
import { followUps } from "@/server/leads/service";
import { openTasksDue } from "@/server/tasks/service";
import type { WorkspaceContext } from "@/server/workspace/service";

// The Today page and the weekly review (Stage 18). Everything is counted
// for the caller's workspace, with days and weeks in its time zone.

const date = (day: string) => new Date(`${day}T00:00:00Z`);

/** Days of the "coming next" list after today. */
export const COMING_DAYS = 7;

/** Minutes logged on days in [from, to), finished entries only. */
async function minutesLogged(db: Db, ctx: WorkspaceContext, from: string, to: string) {
  const sum = await db.timeEntry.aggregate({
    where: {
      workspaceId: ctx.workspace.id,
      minutes: { not: null },
      day: { gte: date(from), lt: date(to) },
    },
    _sum: { minutes: true },
  });
  return sum._sum.minutes ?? 0;
}

/**
 * What needs doing today: unfinished tasks due today or late, the next
 * week's tasks, the leads to follow up, and the time logged today and this
 * week.
 */
export async function getToday(db: Db, ctx: WorkspaceContext, today: string) {
  const [due, coming, leads, minutesToday, minutesThisWeek] = await Promise.all([
    openTasksDue(db, ctx, { from: null, to: today }),
    openTasksDue(db, ctx, { from: addDays(today, 1), to: addDays(today, COMING_DAYS) }, 20),
    followUps(db, ctx, today),
    minutesLogged(db, ctx, today, addDays(today, 1)),
    minutesLogged(db, ctx, weekStart(today), addDays(today, 1)),
  ]);
  return { due, coming, leads, minutesToday, minutesThisWeek };
}

/**
 * A week in review (Monday `monday` to Sunday), with last week's counts
 * beside it: tasks finished, tasks that slipped (due that week, before
 * today, and still not done), projects completed, time by project, and
 * leads contacted, won and added.
 */
export async function getWeekReview(db: Db, ctx: WorkspaceContext, monday: string, today: string) {
  const workspaceId = ctx.workspace.id;
  const tz = ctx.workspace.timezone;
  const next = addDays(monday, 7);
  const previous = addDays(monday, -7);
  const from = startOfDayInZone(monday, tz);
  const to = startOfDayInZone(next, tz);
  const lastFrom = startOfDayInZone(previous, tz);
  // Slipped: due during the week, but only days already past.
  const slippedTo = next < today ? next : today;

  const [
    done,
    doneLastWeek,
    slipped,
    projectsCompleted,
    timeByProject,
    minutesLastWeek,
    contacted,
    won,
    added,
  ] = await Promise.all([
    db.task.findMany({
      where: { workspaceId, status: "DONE", completedAt: { gte: from, lt: to } },
      orderBy: [{ completedAt: "desc" }, { id: "asc" }],
      take: 100,
      select: { id: true, title: true, completedAt: true, project: { select: { name: true } } },
    }),
    db.task.count({
      where: { workspaceId, status: "DONE", completedAt: { gte: lastFrom, lt: from } },
    }),
    db.task.findMany({
      where: {
        workspaceId,
        status: { not: "DONE" },
        dueDate: { gte: date(monday), lt: date(slippedTo) },
      },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      take: 50,
      select: { id: true, title: true, dueDate: true, project: { select: { name: true } } },
    }),
    db.activity.findMany({
      where: {
        workspaceId,
        entityType: "PROJECT",
        action: "COMPLETED",
        createdAt: { gte: from, lt: to },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { entityId: true, summary: true },
    }),
    db.timeEntry.groupBy({
      by: ["projectId"],
      where: {
        workspaceId,
        minutes: { not: null },
        day: { gte: date(monday), lt: date(next) },
      },
      _sum: { minutes: true },
    }),
    minutesLogged(db, ctx, previous, monday),
    db.activity.count({
      where: {
        workspaceId,
        entityType: "LEAD",
        action: "CONTACTED",
        createdAt: { gte: from, lt: to },
      },
    }),
    db.lead.aggregate({
      where: { workspaceId, status: "WON", wonAt: { gte: from, lt: to } },
      _count: { _all: true },
      _sum: { value: true },
    }),
    db.lead.count({ where: { workspaceId, createdAt: { gte: from, lt: to } } }),
  ]);

  // Project names for the time, biggest first.
  const names = await db.project.findMany({
    where: { workspaceId, id: { in: timeByProject.map((row) => row.projectId) } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(names.map((project) => [project.id, project.name]));
  const time = timeByProject
    .map((row) => ({
      projectId: row.projectId,
      name: nameOf.get(row.projectId) ?? "A project",
      minutes: row._sum.minutes ?? 0,
    }))
    .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
  const minutes = time.reduce((sum, row) => sum + row.minutes, 0);

  return {
    done,
    doneLastWeek,
    slipped,
    projectsCompleted,
    time,
    minutes,
    minutesLastWeek,
    leads: {
      contacted,
      won: won._count._all,
      wonValue: won._sum.value ?? 0,
      added,
    },
  };
}

export type WeekReview = Awaited<ReturnType<typeof getWeekReview>>;
