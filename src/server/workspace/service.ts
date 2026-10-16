import { Prisma, type MemberRole } from "@/generated/prisma/client";
import { fieldErrors } from "@/lib/validation/errors";
import { workspaceSchema } from "@/lib/validation/workspace";
import type { Db } from "@/server/db/client";

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

export type ServiceResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      code: "INVALID" | "ALREADY_HAS_WORKSPACE" | "FORBIDDEN";
      message: string;
      errors?: Record<string, string>;
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
 * person for now: a second one is refused, even from two requests at once
 * (the check and the insert run in one serializable transaction).
 */
export async function createWorkspace(
  db: Db,
  userId: string,
  input: unknown,
): Promise<ServiceResult<WorkspaceSummary>> {
  const parsed = workspaceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID",
      message: "Check the form and try again.",
      errors: fieldErrors(parsed.error),
    };
  }

  const alreadyHas = {
    ok: false,
    code: "ALREADY_HAS_WORKSPACE",
    message: "You already have a workspace.",
  } as const;

  try {
    return await db.$transaction(
      async (tx) => {
        const existing = await tx.workspaceMembership.findFirst({ where: { userId } });
        if (existing) return alreadyHas;
        const workspace = await tx.workspace.create({
          data: { ...parsed.data, memberships: { create: { userId, role: "OWNER" } } },
          select: summary,
        });
        return { ok: true, value: workspace } as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    // Two requests at once: PostgreSQL lets one through and stops the
    // other with a serialization failure (P2034).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return alreadyHas;
    }
    throw error;
  }
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
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Only the workspace owner can change these settings.",
    };
  }
  const parsed = workspaceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID",
      message: "Check the form and try again.",
      errors: fieldErrors(parsed.error),
    };
  }
  const workspace = await db.workspace.update({
    where: { id: ctx.workspace.id },
    data: { name: parsed.data.name, timezone: parsed.data.timezone },
    select: summary,
  });
  return { ok: true, value: workspace };
}
