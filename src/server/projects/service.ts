import type { Prisma } from "@/generated/prisma/client";
import { isUuid } from "@/lib/validation/ids";
import {
  projectSchema,
  projectStatusSchema,
  PROJECTS_PER_PAGE,
  type ProjectListParams,
  type ProjectStatus,
} from "@/lib/validation/project";
import type { Db } from "@/server/db/client";
import {
  forbidden,
  invalid,
  invalidFields,
  notFound,
  ok,
  type ServiceResult,
} from "@/server/result";
import { createTemplateTasks, findTemplate, NO_SUCH_TEMPLATE } from "@/server/templates/service";
import type { WorkspaceContext } from "@/server/workspace/service";

// Project rules. Every query is limited to the caller's workspace, and a
// project can only be linked to a client of that same workspace: the
// database can't check that on its own, so these functions do.

const projectFields = {
  id: true,
  name: true,
  description: true,
  status: true,
  startDate: true,
  dueDate: true,
  fee: true,
  createdAt: true,
  updatedAt: true,
  client: { select: { id: true, name: true } },
} as const;

export type ProjectRecord = Prisma.ProjectGetPayload<{ select: typeof projectFields }>;

const STATUS_FILTERS: Record<ProjectListParams["status"], ProjectStatus[] | undefined> = {
  open: ["PLANNING", "IN_PROGRESS", "ON_HOLD"],
  planning: ["PLANNING"],
  in_progress: ["IN_PROGRESS"],
  on_hold: ["ON_HOLD"],
  completed: ["COMPLETED"],
  cancelled: ["CANCELLED"],
  all: undefined,
};

const SORTS: Record<ProjectListParams["sort"], Prisma.ProjectOrderByWithRelationInput[]> = {
  // Soonest due first; projects without a due date go last.
  due: [{ dueDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }, { id: "asc" }],
  updated: [{ updatedAt: "desc" }, { id: "desc" }],
  name: [{ name: "asc" }, { id: "asc" }],
  newest: [{ createdAt: "desc" }, { id: "desc" }],
};

export async function listProjects(db: Db, ctx: WorkspaceContext, params: ProjectListParams) {
  const statuses = STATUS_FILTERS[params.status];
  const where: Prisma.ProjectWhereInput = {
    workspaceId: ctx.workspace.id,
    ...(statuses && { status: { in: statuses } }),
    ...(params.client === "none" && { clientId: null }),
    ...(params.client && params.client !== "none" && { clientId: params.client }),
    ...(params.q && {
      OR: [
        { name: { contains: params.q, mode: "insensitive" } },
        { client: { name: { contains: params.q, mode: "insensitive" } } },
      ],
    }),
  };
  const total = await db.project.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PROJECTS_PER_PAGE));
  const page = Math.min(params.page, pageCount);
  const items = await db.project.findMany({
    where,
    orderBy: SORTS[params.sort],
    skip: (page - 1) * PROJECTS_PER_PAGE,
    take: PROJECTS_PER_PAGE,
    select: projectFields,
  });
  return { items, total, page, pageCount, pageSize: PROJECTS_PER_PAGE };
}

export async function getProject(db: Db, ctx: WorkspaceContext, id: string) {
  if (!isUuid(id)) return null;
  return db.project.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    select: projectFields,
  });
}

/** A client's projects, newest change first (for the client's page). */
export async function projectsForClient(db: Db, ctx: WorkspaceContext, clientId: string) {
  if (!isUuid(clientId)) return [];
  return db.project.findMany({
    where: { workspaceId: ctx.workspace.id, clientId },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 50,
    select: projectFields,
  });
}

/**
 * What a client's projects add up to (cancelled ones left out), and how
 * many of them have a fee: every project, not only the 50 listed.
 */
export async function clientFees(db: Db, ctx: WorkspaceContext, clientId: string) {
  if (!isUuid(clientId)) return { total: 0, withFee: 0 };
  const result = await db.project.aggregate({
    where: {
      workspaceId: ctx.workspace.id,
      clientId,
      status: { not: "CANCELLED" },
      fee: { not: null },
    },
    _sum: { fee: true },
    _count: { _all: true },
  });
  return { total: result._sum.fee ?? 0, withFee: result._count._all };
}

/**
 * Clients a project can be linked to: the workspace's clients that aren't
 * archived, plus `includeId` (the current one, even if archived since).
 */
export async function clientOptions(db: Db, ctx: WorkspaceContext, includeId?: string | null) {
  return db.client.findMany({
    where: {
      workspaceId: ctx.workspace.id,
      OR: [
        { status: { not: "ARCHIVED" } },
        ...(includeId && isUuid(includeId) ? [{ id: includeId }] : []),
      ],
    },
    orderBy: { name: "asc" },
    take: 500,
    select: { id: true, name: true },
  });
}

/** Whether a client id belongs to the caller's workspace. */
async function clientInWorkspace(
  tx: Prisma.TransactionClient,
  ctx: WorkspaceContext,
  clientId: string,
) {
  const client = await tx.client.findFirst({
    where: { id: clientId, workspaceId: ctx.workspace.id },
    select: { id: true },
  });
  return client !== null;
}

const NO_SUCH_CLIENT = { clientId: "Choose a client from the list." };

function logActivity(
  tx: Prisma.TransactionClient,
  ctx: WorkspaceContext,
  projectId: string,
  action: "CREATED" | "UPDATED" | "STATUS_CHANGED" | "COMPLETED" | "DELETED",
  summary: string,
) {
  return tx.activity.create({
    data: {
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      entityType: "PROJECT",
      entityId: projectId,
      action,
      summary: summary.slice(0, 300),
    },
  });
}

/**
 * Adds a project. With `template` ("builtin:website" or one of the
 * workspace's template ids), it starts with that template's tasks (due
 * dates counted from its start, or today) and, if it has none, the
 * template's description.
 */
export async function createProject(
  db: Db,
  ctx: WorkspaceContext,
  input: unknown,
  options: { template?: string | null } = {},
): Promise<ServiceResult<ProjectRecord>> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  return db.$transaction(async (tx) => {
    const { clientId } = parsed.data;
    if (clientId && !(await clientInWorkspace(tx, ctx, clientId))) {
      return invalidFields(NO_SUCH_CLIENT);
    }
    const template = options.template ? await findTemplate(tx, ctx, options.template) : null;
    if (options.template && !template) return invalidFields(NO_SUCH_TEMPLATE);
    const project = await tx.project.create({
      data: {
        ...parsed.data,
        description: parsed.data.description ?? template?.description ?? null,
        workspaceId: ctx.workspace.id,
      },
      select: projectFields,
    });
    if (template) await createTemplateTasks(tx, ctx, project, template.tasks);
    await logActivity(
      tx,
      ctx,
      project.id,
      "CREATED",
      template
        ? `Added project ${project.name} from the ${template.name} template`
        : `Added project ${project.name}`,
    );
    return ok(project);
  });
}

export async function updateProject(
  db: Db,
  ctx: WorkspaceContext,
  id: string,
  input: unknown,
): Promise<ServiceResult<ProjectRecord>> {
  if (!isUuid(id)) return notFound("project");
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  return db.$transaction(async (tx) => {
    const existing = await tx.project.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
      select: { id: true },
    });
    if (!existing) return notFound("project");
    const { clientId } = parsed.data;
    if (clientId && !(await clientInWorkspace(tx, ctx, clientId))) {
      return invalidFields(NO_SUCH_CLIENT);
    }
    const project = await tx.project.update({
      where: { id },
      data: parsed.data,
      select: projectFields,
    });
    await logActivity(tx, ctx, id, "UPDATED", `Updated project ${project.name}`);
    return ok(project);
  });
}

export async function setProjectStatus(
  db: Db,
  ctx: WorkspaceContext,
  id: string,
  status: unknown,
): Promise<ServiceResult<ProjectRecord>> {
  if (!isUuid(id)) return notFound("project");
  const parsed = projectStatusSchema.safeParse(status);
  if (!parsed.success) return invalid(parsed.error);

  return db.$transaction(async (tx) => {
    const existing = await tx.project.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
      select: { id: true, status: true },
    });
    if (!existing) return notFound("project");
    const project = await tx.project.update({
      where: { id },
      data: { status: parsed.data },
      select: projectFields,
    });
    if (existing.status !== parsed.data) {
      await logActivity(
        tx,
        ctx,
        id,
        parsed.data === "COMPLETED" ? "COMPLETED" : "STATUS_CHANGED",
        parsed.data === "COMPLETED"
          ? `Completed project ${project.name}`
          : `Moved project ${project.name} to ${parsed.data.toLowerCase().replace("_", " ")}`,
      );
    }
    return ok(project);
  });
}

/** Deletes a project for good (owners only). Its tasks stay, without it. */
export async function deleteProject(
  db: Db,
  ctx: WorkspaceContext,
  id: string,
): Promise<ServiceResult<{ id: string; name: string }>> {
  if (ctx.role !== "OWNER") return forbidden("Only the workspace owner can delete projects.");
  if (!isUuid(id)) return notFound("project");
  return db.$transaction(async (tx) => {
    const existing = await tx.project.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
      select: { id: true, name: true },
    });
    if (!existing) return notFound("project");
    await tx.project.delete({ where: { id } });
    await logActivity(tx, ctx, id, "DELETED", `Deleted project ${existing.name}`);
    return ok(existing);
  });
}
