import type { ActivityEntity, Prisma } from "@/generated/prisma/client";
import {
  addDays,
  conversionRate,
  countByWeek,
  lastWeekStarts,
  startOfDayInZone,
} from "@/lib/dashboard";
import { todayIn, toDateOnly } from "@/lib/dates";
import { LEAD_STATUSES } from "@/lib/validation/lead";
import type { Db } from "@/server/db/client";
import type { WorkspaceContext } from "@/server/workspace/service";

// The dashboard's numbers, all counted from the database for the caller's
// workspace only. `today` is "YYYY-MM-DD" in the workspace's time zone.

/** Days ahead that count as "upcoming" for deadlines. */
export const DEADLINE_DAYS = 14;

export type Deadline = {
  kind: "project" | "task";
  id: string;
  name: string;
  due: string;
  context: string | null;
};

export async function getDashboard(db: Db, ctx: WorkspaceContext, today: string) {
  const workspaceId = ctx.workspace.id;
  const tz = ctx.workspace.timezone;
  const todayDate = new Date(`${today}T00:00:00Z`);
  const horizon = new Date(`${addDays(today, DEADLINE_DAYS)}T00:00:00Z`);
  const weeks = lastWeekStarts(today, 8);
  const monthStart = startOfDayInZone(`${today.slice(0, 8)}01`, tz);
  const firstWeek = startOfDayInZone(weeks[0]!, tz);

  const [
    activeClients,
    openLeads,
    openProjects,
    onHoldProjects,
    pendingTasks,
    overdueTasks,
    leadsByStatus,
    convertedThisMonth,
    projectDeadlines,
    taskDeadlines,
    completed,
    anyClient,
    anyLead,
    anyProject,
    anyTask,
  ] = await Promise.all([
    db.client.count({ where: { workspaceId, status: "ACTIVE" } }),
    db.lead.count({ where: { workspaceId, status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } } }),
    // Same as the projects list's default "Open" filter.
    db.project.count({ where: { workspaceId, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    db.project.count({ where: { workspaceId, status: "ON_HOLD" } }),
    db.task.count({ where: { workspaceId, status: { not: "DONE" } } }),
    db.task.count({ where: { workspaceId, status: { not: "DONE" }, dueDate: { lt: todayDate } } }),
    db.lead.groupBy({ by: ["status"], where: { workspaceId }, _count: { _all: true } }),
    db.lead.count({ where: { workspaceId, convertedAt: { gte: monthStart } } }),
    // Unfinished work due by the horizon, overdue included.
    db.project.findMany({
      where: {
        workspaceId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { not: null, lte: horizon },
      },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      take: 10,
      select: { id: true, name: true, dueDate: true, client: { select: { name: true } } },
    }),
    db.task.findMany({
      where: { workspaceId, status: { not: "DONE" }, dueDate: { not: null, lte: horizon } },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { id: "asc" }],
      take: 10,
      select: { id: true, title: true, dueDate: true, project: { select: { name: true } } },
    }),
    db.task.findMany({
      where: { workspaceId, completedAt: { gte: firstWeek } },
      select: { completedAt: true },
    }),
    db.client.count({ where: { workspaceId }, take: 1 }),
    db.lead.count({ where: { workspaceId }, take: 1 }),
    db.project.count({ where: { workspaceId }, take: 1 }),
    db.task.count({ where: { workspaceId }, take: 1 }),
  ]);

  const leadCount = (status: string) =>
    leadsByStatus.find((row) => row.status === status)?._count._all ?? 0;
  const won = leadCount("WON");
  const lost = leadCount("LOST");

  const deadlines: Deadline[] = [
    ...projectDeadlines.map((project) => ({
      kind: "project" as const,
      id: project.id,
      name: project.name,
      due: toDateOnly(project.dueDate!),
      context: project.client?.name ?? null,
    })),
    ...taskDeadlines.map((task) => ({
      kind: "task" as const,
      id: task.id,
      name: task.title,
      due: toDateOnly(task.dueDate!),
      context: task.project?.name ?? null,
    })),
  ]
    .sort((a, b) => a.due.localeCompare(b.due) || a.kind.localeCompare(b.kind))
    .slice(0, 10);

  const completedDays = completed
    .filter((task) => task.completedAt)
    .map((task) => todayIn(tz, task.completedAt!));

  return {
    counts: {
      activeClients,
      openLeads,
      openProjects,
      onHoldProjects,
      pendingTasks,
      overdueTasks,
    },
    funnel: LEAD_STATUSES.map((status) => ({ status, count: leadCount(status) })),
    conversion: { won, lost, rate: conversionRate(won, lost), convertedThisMonth },
    deadlines,
    weekly: countByWeek(completedDays, weeks),
    started: {
      client: anyClient > 0,
      lead: anyLead > 0,
      project: anyProject > 0,
      task: anyTask > 0,
    },
  };
}

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export const ACTIVITY_PER_PAGE = 25;

export type ActivityItem = {
  id: string;
  entityType: ActivityEntity;
  entityId: string;
  action: string;
  summary: string;
  createdAt: Date;
  actor: string | null;
  /** Where to open the record, or null once it was deleted. */
  href: string | null;
};

const PATHS: Record<ActivityEntity, string> = {
  CLIENT: "/clients",
  LEAD: "/leads",
  PROJECT: "/projects",
  TASK: "/tasks",
};

/** Adds a link to each activity whose record still exists. */
async function withLinks(
  db: Db,
  workspaceId: string,
  rows: Prisma.ActivityGetPayload<{ include: { actor: { select: { name: true } } } }>[],
): Promise<ActivityItem[]> {
  const idsOf = (type: ActivityEntity) => [
    ...new Set(rows.filter((row) => row.entityType === type).map((row) => row.entityId)),
  ];
  const [clients, leads, projects, tasks] = await Promise.all([
    db.client.findMany({
      where: { workspaceId, id: { in: idsOf("CLIENT") } },
      select: { id: true },
    }),
    db.lead.findMany({ where: { workspaceId, id: { in: idsOf("LEAD") } }, select: { id: true } }),
    db.project.findMany({
      where: { workspaceId, id: { in: idsOf("PROJECT") } },
      select: { id: true },
    }),
    db.task.findMany({ where: { workspaceId, id: { in: idsOf("TASK") } }, select: { id: true } }),
  ]);
  const existing = new Set([...clients, ...leads, ...projects, ...tasks].map((row) => row.id));
  return rows.map((row) => ({
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action,
    summary: row.summary,
    createdAt: row.createdAt,
    actor: row.actor?.name ?? null,
    href: existing.has(row.entityId) ? `${PATHS[row.entityType]}/${row.entityId}` : null,
  }));
}

export const ACTIVITY_TYPES = ["all", "client", "lead", "project", "task"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export async function listActivity(
  db: Db,
  ctx: WorkspaceContext,
  options: { type: ActivityType; page: number; perPage?: number },
) {
  const perPage = options.perPage ?? ACTIVITY_PER_PAGE;
  const where: Prisma.ActivityWhereInput = {
    workspaceId: ctx.workspace.id,
    ...(options.type !== "all" && {
      entityType: options.type.toUpperCase() as ActivityEntity,
    }),
  };
  const total = await db.activity.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(options.page, pageCount);
  const rows = await db.activity.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * perPage,
    take: perPage,
    include: { actor: { select: { name: true } } },
  });
  return {
    items: await withLinks(db, ctx.workspace.id, rows),
    total,
    page,
    pageCount,
    pageSize: perPage,
  };
}
