import type { Prisma } from "@/generated/prisma/client";
import { isUuid } from "@/lib/validation/ids";
import {
  LEAD_STATUSES,
  leadSchema,
  leadStatusSchema,
  LEADS_PER_COLUMN,
  LEADS_PER_PAGE,
  type LeadListParams,
  type LeadStatus,
} from "@/lib/validation/lead";
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

// Lead rules. Like clients, every query is limited to the caller's
// workspace, so another workspace's lead behaves as if it didn't exist.

const leadFields = {
  id: true,
  contactName: true,
  company: true,
  email: true,
  phone: true,
  source: true,
  status: true,
  notes: true,
  convertedAt: true,
  createdAt: true,
  updatedAt: true,
  convertedClient: { select: { id: true, name: true } },
} as const;

export type LeadRecord = Prisma.LeadGetPayload<{ select: typeof leadFields }>;

const STATUS_FILTERS: Record<LeadListParams["status"], LeadStatus[] | undefined> = {
  all: undefined,
  open: ["NEW", "CONTACTED", "QUALIFIED"],
  new: ["NEW"],
  contacted: ["CONTACTED"],
  qualified: ["QUALIFIED"],
  won: ["WON"],
  lost: ["LOST"],
};

const SORTS: Record<LeadListParams["sort"], Prisma.LeadOrderByWithRelationInput[]> = {
  updated: [{ updatedAt: "desc" }, { id: "desc" }],
  name: [{ contactName: "asc" }, { id: "asc" }],
  newest: [{ createdAt: "desc" }, { id: "desc" }],
};

/** The search and source filters, shared by the list and the board. */
function searchWhere(ctx: WorkspaceContext, q: string, source: string): Prisma.LeadWhereInput {
  const contains = (field: "contactName" | "company" | "email" | "phone") => ({
    [field]: { contains: q, mode: "insensitive" as const },
  });
  return {
    workspaceId: ctx.workspace.id,
    ...(source && { source: { equals: source, mode: "insensitive" } }),
    ...(q && {
      OR: [contains("contactName"), contains("company"), contains("email"), contains("phone")],
    }),
  };
}

export async function listLeads(db: Db, ctx: WorkspaceContext, params: LeadListParams) {
  const statuses = STATUS_FILTERS[params.status];
  const where: Prisma.LeadWhereInput = {
    ...searchWhere(ctx, params.q, params.source),
    ...(statuses && { status: { in: statuses } }),
  };
  const total = await db.lead.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / LEADS_PER_PAGE));
  const page = Math.min(params.page, pageCount);
  const items = await db.lead.findMany({
    where,
    orderBy: SORTS[params.sort],
    skip: (page - 1) * LEADS_PER_PAGE,
    take: LEADS_PER_PAGE,
    select: leadFields,
  });
  return { items, total, page, pageCount, pageSize: LEADS_PER_PAGE };
}

export type BoardColumn = { status: LeadStatus; total: number; items: LeadRecord[] };

/** The board: each status with its count and most recently updated leads. */
export async function boardLeads(
  db: Db,
  ctx: WorkspaceContext,
  params: Pick<LeadListParams, "q" | "source">,
): Promise<BoardColumn[]> {
  const where = searchWhere(ctx, params.q, params.source);
  return Promise.all(
    LEAD_STATUSES.map(async (status) => {
      const columnWhere = { ...where, status };
      const [total, items] = await Promise.all([
        db.lead.count({ where: columnWhere }),
        db.lead.findMany({
          where: columnWhere,
          orderBy: SORTS.updated,
          take: LEADS_PER_COLUMN,
          select: leadFields,
        }),
      ]);
      return { status, total, items };
    }),
  );
}

export async function getLead(db: Db, ctx: WorkspaceContext, id: string) {
  if (!isUuid(id)) return null;
  return db.lead.findFirst({ where: { id, workspaceId: ctx.workspace.id }, select: leadFields });
}

/** The distinct sources used in the workspace, for the list's filter. */
export async function leadSources(db: Db, ctx: WorkspaceContext) {
  const rows = await db.lead.findMany({
    where: { workspaceId: ctx.workspace.id, source: { not: null } },
    distinct: ["source"],
    select: { source: true },
    orderBy: { source: "asc" },
    take: 100,
  });
  return rows.map((row) => row.source).filter((source): source is string => Boolean(source));
}

type Action = "CREATED" | "UPDATED" | "STATUS_CHANGED" | "CONVERTED" | "DELETED";

function logActivity(
  tx: Prisma.TransactionClient,
  ctx: WorkspaceContext,
  entity: { type: "LEAD" | "CLIENT"; id: string },
  action: Action,
  summary: string,
) {
  return tx.activity.create({
    data: {
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      entityType: entity.type,
      entityId: entity.id,
      action,
      summary: summary.slice(0, 300),
    },
  });
}

const STAYS_WON = "This lead became a client, so it stays Won.";

export async function createLead(
  db: Db,
  ctx: WorkspaceContext,
  input: unknown,
): Promise<ServiceResult<LeadRecord>> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const lead = await db.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: { ...parsed.data, workspaceId: ctx.workspace.id },
      select: leadFields,
    });
    await logActivity(
      tx,
      ctx,
      { type: "LEAD", id: created.id },
      "CREATED",
      `Added lead ${created.contactName}`,
    );
    return created;
  });
  return ok(lead);
}

/** Finds the caller's lead inside a transaction, locking it until the end. */
async function lockLead(tx: Prisma.TransactionClient, ctx: WorkspaceContext, id: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM leads
    WHERE id = ${id}::uuid AND "workspaceId" = ${ctx.workspace.id}::uuid
    FOR UPDATE`;
  if (rows.length === 0) return null;
  return tx.lead.findUniqueOrThrow({ where: { id }, select: leadFields });
}

export async function updateLead(
  db: Db,
  ctx: WorkspaceContext,
  id: string,
  input: unknown,
): Promise<ServiceResult<LeadRecord>> {
  if (!isUuid(id)) return notFound("lead");
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  return db.$transaction(async (tx) => {
    const existing = await lockLead(tx, ctx, id);
    if (!existing) return notFound("lead");
    if (existing.convertedClient && parsed.data.status !== "WON") {
      return invalidFields({ status: STAYS_WON });
    }
    const updated = await tx.lead.update({ where: { id }, data: parsed.data, select: leadFields });
    await logActivity(
      tx,
      ctx,
      { type: "LEAD", id },
      "UPDATED",
      `Updated lead ${updated.contactName}`,
    );
    return ok(updated);
  });
}

/** Moves a lead along the pipeline (the board, or its page). */
export async function setLeadStatus(
  db: Db,
  ctx: WorkspaceContext,
  id: string,
  status: unknown,
): Promise<ServiceResult<LeadRecord>> {
  if (!isUuid(id)) return notFound("lead");
  const parsed = leadStatusSchema.safeParse(status);
  if (!parsed.success) return invalid(parsed.error);

  return db.$transaction(async (tx) => {
    const existing = await lockLead(tx, ctx, id);
    if (!existing) return notFound("lead");
    if (existing.status === parsed.data) return ok(existing);
    if (existing.convertedClient) return conflict(STAYS_WON);
    const updated = await tx.lead.update({
      where: { id },
      data: { status: parsed.data },
      select: leadFields,
    });
    await logActivity(
      tx,
      ctx,
      { type: "LEAD", id },
      "STATUS_CHANGED",
      `Moved ${updated.contactName} to ${parsed.data.toLowerCase()}`,
    );
    return ok(updated);
  });
}

export async function deleteLead(
  db: Db,
  ctx: WorkspaceContext,
  id: string,
): Promise<ServiceResult<{ id: string; contactName: string }>> {
  if (ctx.role !== "OWNER") return forbidden("Only the workspace owner can delete leads.");
  if (!isUuid(id)) return notFound("lead");
  return db.$transaction(async (tx) => {
    const existing = await lockLead(tx, ctx, id);
    if (!existing) return notFound("lead");
    await tx.lead.delete({ where: { id } });
    await logActivity(
      tx,
      ctx,
      { type: "LEAD", id },
      "DELETED",
      `Deleted lead ${existing.contactName}`,
    );
    return ok({ id, contactName: existing.contactName });
  });
}

/**
 * A client in the workspace with the lead's email, if any: converting
 * should link to them rather than create a duplicate. Skips clients that
 * already came from another lead.
 */
export async function findMatchingClient(
  db: Db,
  ctx: WorkspaceContext,
  lead: { email: string | null },
) {
  if (!lead.email) return null;
  return db.client.findFirst({
    where: {
      workspaceId: ctx.workspace.id,
      email: { equals: lead.email, mode: "insensitive" },
      convertedFromLead: null,
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, email: true },
  });
}

/**
 * Turns a lead into a client, once. With `linkClientId`, the lead is linked
 * to that existing client instead of creating one. The lead row is locked
 * for the whole transaction, so a double click waits, then finds the lead
 * already converted; the unique `convertedClientId` backs this up.
 */
export async function convertLead(
  db: Db,
  ctx: WorkspaceContext,
  id: string,
  options: { linkClientId?: string | null } = {},
): Promise<
  ServiceResult<{ lead: LeadRecord; client: { id: string; name: string }; created: boolean }>
> {
  if (!isUuid(id)) return notFound("lead");
  const linkClientId = options.linkClientId || null;
  if (linkClientId && !isUuid(linkClientId)) return notFound("client");

  return db.$transaction(async (tx) => {
    const lead = await lockLead(tx, ctx, id);
    if (!lead) return notFound("lead");
    if (lead.convertedClient) {
      return conflict(`This lead is already a client: ${lead.convertedClient.name}.`);
    }

    let client: { id: string; name: string };
    let created = false;
    if (linkClientId) {
      const existing = await tx.client.findFirst({
        where: { id: linkClientId, workspaceId: ctx.workspace.id },
        select: { id: true, name: true, convertedFromLead: { select: { id: true } } },
      });
      if (!existing) return notFound("client");
      if (existing.convertedFromLead) {
        return conflict(`${existing.name} already came from another lead.`);
      }
      client = { id: existing.id, name: existing.name };
    } else {
      client = await tx.client.create({
        data: {
          workspaceId: ctx.workspace.id,
          name: lead.contactName,
          company: lead.company,
          email: lead.email,
          phone: lead.phone,
          notes: lead.notes,
          status: "ACTIVE",
        },
        select: { id: true, name: true },
      });
      created = true;
      await logActivity(
        tx,
        ctx,
        { type: "CLIENT", id: client.id },
        "CREATED",
        `Added ${client.name} from a lead`,
      );
    }

    const updated = await tx.lead.update({
      where: { id },
      data: { status: "WON", convertedClientId: client.id, convertedAt: new Date() },
      select: leadFields,
    });
    await logActivity(
      tx,
      ctx,
      { type: "LEAD", id },
      "CONVERTED",
      `Converted ${lead.contactName} into client ${client.name}`,
    );
    return ok({ lead: updated, client, created });
  });
}
