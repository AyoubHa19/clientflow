import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient, type Db } from "@/server/db/client";
import { createClient } from "@/server/clients/service";
import { createTask, setTaskDone } from "@/server/tasks/service";
import { getTestDatabaseUrl } from "@/test/test-database";
import { createWorkspace, type WorkspaceContext } from "@/server/workspace/service";
import { createProject } from "./service";
import {
  getSharedProject,
  getShareState,
  SHARE_TOKEN_PATTERN,
  setShareTasks,
  shareProject,
  stopSharing,
} from "./sharing";

// Stage 16: a project's status page for its client.

let db: Db;
const userIds: string[] = [];

beforeAll(() => {
  db = createPrismaClient(getTestDatabaseUrl());
});

afterAll(async () => {
  await db.workspace.deleteMany({ where: { memberships: { some: { userId: { in: userIds } } } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
});

async function owner(label: string): Promise<WorkspaceContext> {
  const id = randomUUID();
  userIds.push(id);
  const user = await db.user.create({
    data: { id, name: `${label} (sample)`, email: `sharing-${id}@example.com` },
  });
  const result = await createWorkspace(db, id, {
    name: `${label} Studio (sample)`,
    timezone: "UTC",
  });
  if (!result.ok) throw new Error(result.message);
  return { user, workspace: result.value, role: "OWNER" };
}

function must<T>(result: { ok: true; value: T } | { ok: false; message: string }) {
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

async function projectWithTasks(ctx: WorkspaceContext) {
  const client = must(await createClient(db, ctx, { name: "Atlas (sample)" }));
  const project = must(
    await createProject(db, ctx, {
      name: "Menu (sample)",
      clientId: client.id,
      description: "Private notes about the budget",
      fee: "7500",
      status: "IN_PROGRESS",
    }),
  );
  const first = must(await createTask(db, ctx, { title: "Draft (sample)", projectId: project.id }));
  await createTask(db, ctx, { title: "Print (sample)", projectId: project.id });
  await setTaskDone(db, ctx, first.id, true);
  return project;
}

describe("sharing a project", () => {
  it("makes a long random link that shows the progress, and never the fee or description", async () => {
    const a = await owner("A");
    const project = await projectWithTasks(a);
    const share = must(await shareProject(db, a, project.id));
    expect(share.token).toMatch(SHARE_TOKEN_PATTERN);

    const shared = await getSharedProject(db, share.token!);
    expect(shared).toMatchObject({
      workspace: { name: "A Studio (sample)", timezone: "UTC" },
      project: { name: "Menu (sample)", status: "IN_PROGRESS", clientName: "Atlas (sample)" },
      progress: { done: 1, total: 2 },
    });
    expect(shared?.tasks?.map((task) => task.title)).toEqual(["Print (sample)", "Draft (sample)"]);
    const everything = JSON.stringify(shared);
    for (const secret of ["7500", "750000", "Private notes", a.workspace.id, project.id]) {
      expect(everything).not.toContain(secret);
    }
  });

  it("can hide the tasks, keeping the progress", async () => {
    const a = await owner("A");
    const project = await projectWithTasks(a);
    const share = must(await shareProject(db, a, project.id));
    must(await setShareTasks(db, a, project.id, false));
    const shared = await getSharedProject(db, share.token!);
    expect(shared?.tasks).toBeNull();
    expect(shared?.progress).toEqual({ done: 1, total: 2 });
    expect((await setShareTasks(db, a, project.id, "no")).ok).toBe(false);
  });

  it("a new link replaces the old one; stopping turns it off", async () => {
    const a = await owner("A");
    const project = await projectWithTasks(a);
    const first = must(await shareProject(db, a, project.id)).token!;
    const second = must(await shareProject(db, a, project.id)).token!;
    expect(second).not.toBe(first);
    expect(await getSharedProject(db, first)).toBeNull();
    expect(await getSharedProject(db, second)).not.toBeNull();
    must(await stopSharing(db, a, project.id));
    expect(await getSharedProject(db, second)).toBeNull();
    expect(await getShareState(db, a, project.id)).toMatchObject({ token: null });
    const logs = await db.activity.count({ where: { entityId: project.id, action: "UPDATED" } });
    expect(logs).toBeGreaterThanOrEqual(3);
  });

  it("only the owner shares, and only their own workspace's projects", async () => {
    const a = await owner("A");
    const b = await owner("B");
    const project = await projectWithTasks(a);
    expect((await shareProject(db, { ...a, role: "MEMBER" }, project.id)).ok).toBe(false);
    const other = await shareProject(db, b, project.id);
    expect(!other.ok && other.code).toBe("NOT_FOUND");
    expect(await getShareState(db, b, project.id)).toBeNull();
    expect((await getShareState(db, a, project.id))?.token).toBeNull();
  });

  it("odd links find nothing", async () => {
    for (const token of [
      "",
      "abc",
      "x".repeat(43),
      "a".repeat(44),
      "../../etc",
      "\u0000".repeat(43),
    ]) {
      expect(await getSharedProject(db, token)).toBeNull();
    }
  });
});
