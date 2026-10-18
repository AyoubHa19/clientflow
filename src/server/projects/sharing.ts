import { randomBytes } from "node:crypto";
import { isUuid } from "@/lib/validation/ids";
import type { Db } from "@/server/db/client";
import { parseServerEnv } from "@/server/env";
import { forbidden, invalidFields, notFound, ok, type ServiceResult } from "@/server/result";
import type { WorkspaceContext } from "@/server/workspace/service";

// The client's status page (Stage 16). The owner turns sharing on for a
// project and gets a link with a long random secret in it; whoever has the
// link sees the project's progress, nothing else, without signing in. A new
// link replaces the old one, which stops working; turning sharing off does
// the same.

/** 32 random bytes as base64url: 43 characters, impossible to guess. */
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const newToken = () => randomBytes(32).toString("base64url");

export type ShareState = { token: string | null; sharedAt: Date | null; showTasks: boolean };

const ONLY_OWNER = "Only the workspace owner can share projects.";

async function ownProject(db: Db, ctx: WorkspaceContext, id: string) {
  if (!isUuid(id)) return null;
  return db.project.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    select: { id: true, name: true },
  });
}

async function change(
  db: Db,
  ctx: WorkspaceContext,
  id: string,
  data: { shareToken?: string | null; sharedAt?: Date | null; shareTasks?: boolean },
  summary: (name: string) => string | null,
): Promise<ServiceResult<ShareState>> {
  if (ctx.role !== "OWNER") return forbidden(ONLY_OWNER);
  const project = await ownProject(db, ctx, id);
  if (!project) return notFound("project");
  return db.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: project.id },
      data,
      select: { shareToken: true, sharedAt: true, shareTasks: true },
    });
    const text = summary(project.name);
    if (text) {
      await tx.activity.create({
        data: {
          workspaceId: ctx.workspace.id,
          actorId: ctx.user.id,
          entityType: "PROJECT",
          entityId: project.id,
          action: "UPDATED",
          summary: text.slice(0, 300),
        },
      });
    }
    return ok({
      token: updated.shareToken,
      sharedAt: updated.sharedAt,
      showTasks: updated.shareTasks,
    });
  });
}

/** Turns sharing on, or replaces the link (the old one stops working). */
export function shareProject(db: Db, ctx: WorkspaceContext, id: string) {
  return change(
    db,
    ctx,
    id,
    { shareToken: newToken(), sharedAt: new Date() },
    (name) => `Shared a status page for ${name}`,
  );
}

/** Turns sharing off: the link stops working. */
export function stopSharing(db: Db, ctx: WorkspaceContext, id: string) {
  return change(
    db,
    ctx,
    id,
    { shareToken: null, sharedAt: null },
    (name) => `Stopped sharing ${name}`,
  );
}

/** Whether the status page lists the tasks, or only the progress. */
export function setShareTasks(db: Db, ctx: WorkspaceContext, id: string, show: unknown) {
  if (typeof show !== "boolean") {
    return Promise.resolve(invalidFields({ showTasks: "Choose to show the tasks or not." }));
  }
  return change(db, ctx, id, { shareTasks: show }, () => null);
}

export async function getShareState(
  db: Db,
  ctx: WorkspaceContext,
  id: string,
): Promise<ShareState | null> {
  if (!isUuid(id)) return null;
  const project = await db.project.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    select: { shareToken: true, sharedAt: true, shareTasks: true },
  });
  return project
    ? { token: project.shareToken, sharedAt: project.sharedAt, showTasks: project.shareTasks }
    : null;
}

/**
 * What the status page shows, found by its secret: the workspace's name
 * and time zone, the project's name, client, status and dates, its
 * progress, and (if the owner allows) its tasks' titles, states and due
 * dates. Never the fee, the description, notes or anything else. Null for
 * a wrong, old or switched-off link.
 */
export async function getSharedProject(db: Db, token: string) {
  if (!SHARE_TOKEN_PATTERN.test(token)) return null;
  const project = await db.project.findUnique({
    where: { shareToken: token },
    select: {
      name: true,
      status: true,
      startDate: true,
      dueDate: true,
      updatedAt: true,
      shareTasks: true,
      client: { select: { name: true } },
      workspace: { select: { name: true, timezone: true } },
      tasks: {
        orderBy: [
          { completedAt: { sort: "desc", nulls: "first" } },
          { dueDate: { sort: "asc", nulls: "last" } },
          { createdAt: "asc" },
        ],
        take: 200,
        select: { title: true, status: true, dueDate: true, completedAt: true },
      },
    },
  });
  if (!project) return null;
  const done = project.tasks.filter((task) => task.status === "DONE").length;
  return {
    workspace: project.workspace,
    project: {
      name: project.name,
      status: project.status,
      startDate: project.startDate,
      dueDate: project.dueDate,
      updatedAt: project.updatedAt,
      clientName: project.client?.name ?? null,
    },
    progress: { done, total: project.tasks.length },
    tasks: project.shareTasks ? project.tasks : null,
  };
}

export type SharedProject = NonNullable<Awaited<ReturnType<typeof getSharedProject>>>;

/** The full address of a status page, on this site. */
export function shareUrl(token: string) {
  return new URL(`/status/${token}`, parseServerEnv(process.env).BETTER_AUTH_URL).toString();
}
