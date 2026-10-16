import type { MemberRole } from "@/generated/prisma/client";
import { workspaceSchema } from "@/lib/validation/workspace";
import type { Db } from "@/server/db/client";
import { forbidden, invalid, ok, type ServiceResult } from "@/server/result";

// Workspace rules, kept apart from Next (no cookies, no redirects) so the
// tests can run them against the test database. The pages and Server
// Actions call these with the context from requireWorkspace().

export type WorkspaceSummary = { id: string; name: string; timezone: string };

/**
 * Who is asking and in which workspace. Always built on the server from
 * the session and the membership table, never from what the browser sends.
 */
export type WorkspaceContext = {
  user: { id: string; name: string; email: string };
  workspace: WorkspaceSummary;
  role: MemberRole;
};

const summary = { id: true, name: true, timezone: true } as const;

/** The user's workspace and role there, or null if they have none yet. */
export async function findMembership(db: Db, userId: string) {
  const membership = await db.workspaceMembership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { role: true, workspace: { select: summary } },
  });
  return membership;
}

/**
 * Creates the user's workspace with them as its owner. One workspace per
 * person for now: a second one is refused, even from two requests at once.
 * An advisory lock on the user id makes their requests take turns (others
 * aren't slowed down), so the check and the insert can't interleave.
 */
export async function createWorkspace(
  db: Db,
  userId: string,
  input: unknown,
): Promise<ServiceResult<WorkspaceSummary>> {
  const parsed = workspaceSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  return db.$transaction(async (tx) => {
    // Held until this transaction ends; a second request waits here.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
    const existing = await tx.workspaceMembership.findFirst({ where: { userId } });
    if (existing) {
      return {
        ok: false,
        code: "ALREADY_HAS_WORKSPACE",
        message: "You already have a workspace.",
      } as const;
    }
    const workspace = await tx.workspace.create({
      data: { ...parsed.data, memberships: { create: { userId, role: "OWNER" } } },
      select: summary,
    });
    return ok(workspace);
  });
}

/**
 * Renames the workspace or changes its time zone. Owners only. Which
 * workspace comes from the context alone, so a request naming another
 * workspace's id changes nothing but the caller's own.
 */
export async function updateWorkspaceSettings(
  db: Db,
  ctx: WorkspaceContext,
  input: unknown,
): Promise<ServiceResult<WorkspaceSummary>> {
  if (ctx.role !== "OWNER") {
    return forbidden("Only the workspace owner can change these settings.");
  }
  const parsed = workspaceSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const workspace = await db.workspace.update({
    where: { id: ctx.workspace.id },
    data: { name: parsed.data.name, timezone: parsed.data.timezone },
    select: summary,
  });
  return ok(workspace);
}
