import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient, type Db } from "@/server/db/client";
import { getTestDatabaseUrl } from "@/test/test-database";
import {
  createWorkspace,
  findMembership,
  updateWorkspaceSettings,
  type WorkspaceContext,
} from "./service";

// Two people, A and B, each with a workspace: nothing A does may reach B's.

let db: Db;
const userIds: string[] = [];

beforeAll(() => {
  db = createPrismaClient(getTestDatabaseUrl());
});

afterAll(async () => {
  await db.workspace.deleteMany({
    where: { memberships: { some: { userId: { in: userIds } } } },
  });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
});

async function makeUser(name: string) {
  const id = randomUUID();
  userIds.push(id);
  return db.user.create({ data: { id, name, email: `ws-${id}@example.com` } });
}

/** A user with a workspace, and the context requireWorkspace() would build. */
async function owner(label: string): Promise<WorkspaceContext> {
  const user = await makeUser(`${label} (sample)`);
  const result = await createWorkspace(db, user.id, {
    name: `${label} Studio (sample)`,
    timezone: "Africa/Casablanca",
  });
  if (!result.ok) throw new Error(result.message);
  return {
    user: { id: user.id, name: user.name, email: user.email },
    workspace: result.value,
    role: "OWNER",
  };
}

describe("creating a workspace", () => {
  it("makes the creator its owner", async () => {
    const a = await owner("A");
    const membership = await findMembership(db, a.user.id);
    expect(membership?.role).toBe("OWNER");
    expect(membership?.workspace).toEqual(a.workspace);
    expect(a.workspace.timezone).toBe("Africa/Casablanca");
  });

  it("refuses a second workspace for the same person", async () => {
    const a = await owner("A");
    const again = await createWorkspace(db, a.user.id, {
      name: "Another (sample)",
      timezone: "UTC",
    });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.code).toBe("ALREADY_HAS_WORKSPACE");
    expect(await db.workspaceMembership.count({ where: { userId: a.user.id } })).toBe(1);
  });

  it("makes only one even when two requests arrive at once", async () => {
    const user = await makeUser("Double click (sample)");
    const input = { name: "Twice (sample)", timezone: "UTC" };
    const results = await Promise.all([
      createWorkspace(db, user.id, input),
      createWorkspace(db, user.id, input),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await db.workspaceMembership.count({ where: { userId: user.id } })).toBe(1);
  });

  it("checks the form on the server", async () => {
    const user = await makeUser("Careless (sample)");
    const result = await createWorkspace(db, user.id, { name: "", timezone: "Mars/Base" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INVALID");
      expect(Object.keys(result.errors ?? {}).sort()).toEqual(["name", "timezone"]);
    }
    expect(await findMembership(db, user.id)).toBeNull();
  });

  it("finds nothing for someone without a workspace", async () => {
    const user = await makeUser("New (sample)");
    expect(await findMembership(db, user.id)).toBeNull();
  });
});

describe("workspace isolation", () => {
  it("shows each person only their own workspace", async () => {
    const [a, b] = [await owner("A"), await owner("B")];
    expect((await findMembership(db, a.user.id))?.workspace.id).toBe(a.workspace.id);
    expect((await findMembership(db, b.user.id))?.workspace.id).toBe(b.workspace.id);
    expect(a.workspace.id).not.toBe(b.workspace.id);
  });

  it("changes only the caller's workspace, whatever id the request names", async () => {
    const [a, b] = [await owner("A"), await owner("B")];
    const result = await updateWorkspaceSettings(db, a, {
      name: "Renamed by A (sample)",
      timezone: "Europe/Paris",
      // A tampered request pointing at B's workspace: ignored.
      workspaceId: b.workspace.id,
      id: b.workspace.id,
    });

    expect(result.ok).toBe(true);
    const [afterA, afterB] = await Promise.all([
      db.workspace.findUniqueOrThrow({ where: { id: a.workspace.id } }),
      db.workspace.findUniqueOrThrow({ where: { id: b.workspace.id } }),
    ]);
    expect(afterA.name).toBe("Renamed by A (sample)");
    expect(afterA.timezone).toBe("Europe/Paris");
    expect(afterB.name).toBe("B Studio (sample)");
    expect(afterB.timezone).toBe("Africa/Casablanca");
  });

  it("lets only owners change the settings", async () => {
    const a = await owner("A");
    const member = await makeUser("Member (sample)");
    await db.workspaceMembership.create({
      data: { userId: member.id, workspaceId: a.workspace.id, role: "MEMBER" },
    });
    const memberCtx: WorkspaceContext = {
      user: { id: member.id, name: member.name, email: member.email },
      workspace: a.workspace,
      role: "MEMBER",
    };

    const result = await updateWorkspaceSettings(db, memberCtx, {
      name: "Taken over (sample)",
      timezone: "UTC",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    const unchanged = await db.workspace.findUniqueOrThrow({ where: { id: a.workspace.id } });
    expect(unchanged.name).toBe("A Studio (sample)");
  });

  it("rejects invalid settings without changing anything", async () => {
    const a = await owner("A");
    const result = await updateWorkspaceSettings(db, a, { name: "x".repeat(101), timezone: "UTC" });
    expect(result.ok).toBe(false);
    const unchanged = await db.workspace.findUniqueOrThrow({ where: { id: a.workspace.id } });
    expect(unchanged.name).toBe("A Studio (sample)");
  });
});
