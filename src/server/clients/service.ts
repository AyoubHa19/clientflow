import type { Prisma } from "@/generated/prisma/client";
import {
  clientSchema,
  CLIENTS_PER_PAGE,
  type ClientListParams,
  type ClientStatus,
} from "@/lib/validation/client";
import { isUuid } from "@/lib/validation/ids";
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

// Client rules. Every query is limited to the caller's workspace
// (`ctx.workspace.id`), so a client from another workspace behaves exactly
// like one that doesn't exist. Plain functions, tested on the test branch.

const clientFields = {
  id: true,
  name: true,
  email: true,
  phone: true,
  company: true,
  notes: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ClientRecord = Prisma.ClientGetPayload<{ select: typeof clientFields }>;

export type ClientPage = {
  items: ClientRecord[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

const STATUS_FILTERS: Record<ClientListParams["status"], ClientStatus[] | undefined> = {
  open: ["ACTIVE", "INACTIVE"],
  active: ["ACTIVE"],
  inactive: ["INACTIVE"],
  archived: ["ARCHIVED"],
  all: undefined,
};

const SORTS: Record<ClientListParams["sort"], Prisma.ClientOrderByWithRelationInput[]> = {
  updated: [{ updatedAt: "desc" }, { id: "desc" }],
  name: [{ name: "asc" }, { id: "asc" }],
  newest: [{ createdAt: "desc" }, { id: "desc" }],
};

/** One page of the workspace's clients, searched, filtered and sorted. */
export async function listClients(
  db: Db,
  ctx: WorkspaceContext,
  params: ClientListParams,
): Promise<ClientPage> {
  const statuses = STATUS_FILTERS[params.status];
  const contains = (field: "name" | "company" | "email" | "phone") => ({
    [field]: { contains: params.q, mode: "insensitive" as const },
  });
  const where: Prisma.ClientWhereInput = {
    workspaceId: ctx.workspace.id,
    ...(statuses && { status: { in: statuses } }),
    ...(params.q && {
      OR: [contains("name"), contains("company"), contains("email"), contains("phone")],
    }),
  };

  const total = await db.client.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / CLIENTS_PER_PAGE));
  // Past the last page (an old link, say): show the last one instead.
  const page = Math.min(params.page, pageCount);
  const items = await db.client.findMany({
    where,
    orderBy: SORTS[params.sort],
    skip: (page - 1) * CLIENTS_PER_PAGE,
    take: CLIENTS_PER_PAGE,
    select: clientFields,
  });
  return { items, total, page, pageCount, pageSize: CLIENTS_PER_PAGE };
}

/** One client of the caller's workspace, or null (also for a bad id). */
export async function getClient(db: Db, ctx: WorkspaceContext, id: string) {
  if (!isUuid(id)) return null;
  return db.client.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    select: clientFields,
  });
}

function logActivity(
  tx: Prisma.TransactionClient,
  ctx: WorkspaceContext,
  clientId: string,
  action: "CREATED" | "UPDATED" | "ARCHIVED" | "STATUS_CHANGED" | "DELETED",
  summary: string,
) {
  return tx.activity.create({
    data: {
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      entityType: "CLIENT",
      entityId: clientId,
      action,
      summary: summary.slice(0, 300),
    },
  });
}

export async function createClient(
  db: Db,
  ctx: WorkspaceContext,
  input: unknown,
): Promise<ServiceResult<ClientRecord>> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const client = await db.$transaction(async (tx) => {
    const created = await tx.client.create({
      data: { ...parsed.data, workspaceId: ctx.workspace.id },
      select: clientFields,
    });
    await logActivity(tx, ctx, created.id, "CREATED", `Added ${created.name}`);
    return created;
  });
  return ok(client);
}

export async function updateClient(
  db: Db,
  ctx: WorkspaceContext,
  id: string,
  input: unknown,
): Promise<ServiceResult<ClientRecord>> {
  if (!isUuid(id)) return notFound("client");
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  return db.$transaction(async (tx) => {
    const existing = await tx.client.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
      select: { id: true },
    });
    if (!existing) return notFound("client");
    const updated = await tx.client.update({
      where: { id },
      data: parsed.data,
      select: clientFields,
    });
    await logActivity(tx, ctx, id, "UPDATED", `Updated ${updated.name}`);
    return ok(updated);
  });
}

/** Archives a client (hidden from the usual list) or brings it back. */
export async function setClientArchived(
  db: Db,
  ctx: WorkspaceContext,
  id: string,
  archived: boolean,
): Promise<ServiceResult<ClientRecord>> {
  if (!isUuid(id)) return notFound("client");
  // An action can be called with anything: only a real true or false will do.
  if (typeof archived !== "boolean") {
    return invalidFields({ archived: "Say whether to archive the client." });
  }
  return db.$transaction(async (tx) => {
    const existing = await tx.client.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
      select: { id: true },
    });
    if (!existing) return notFound("client");
    const updated = await tx.client.update({
      where: { id },
      data: { status: archived ? "ARCHIVED" : "ACTIVE" },
      select: clientFields,
    });
    await logActivity(
      tx,
      ctx,
      id,
      archived ? "ARCHIVED" : "STATUS_CHANGED",
      archived ? `Archived ${updated.name}` : `Restored ${updated.name}`,
    );
    return ok(updated);
  });
}

/**
 * Deletes a client for good (owners only). Their projects stay, without a
 * client; the activity log keeps the name.
 */
export async function deleteClient(
  db: Db,
  ctx: WorkspaceContext,
  id: string,
): Promise<ServiceResult<{ id: string; name: string }>> {
  if (ctx.role !== "OWNER") {
    return forbidden("Only the workspace owner can delete clients. Archive it instead.");
  }
  if (!isUuid(id)) return notFound("client");
  return db.$transaction(async (tx) => {
    const existing = await tx.client.findFirst({
      where: { id, workspaceId: ctx.workspace.id },
      select: { id: true, name: true },
    });
    if (!existing) return notFound("client");
    await tx.client.delete({ where: { id } });
    await logActivity(tx, ctx, id, "DELETED", `Deleted ${existing.name}`);
    return ok(existing);
  });
}
