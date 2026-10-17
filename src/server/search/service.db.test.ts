import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@/server/clients/service";
import { createPrismaClient, type Db } from "@/server/db/client";
import { createLead } from "@/server/leads/service";
import { createProject } from "@/server/projects/service";
import { createTask } from "@/server/tasks/service";
import { getTestDatabaseUrl } from "@/test/test-database";
import { createWorkspace, type WorkspaceContext } from "@/server/workspace/service";
import { SEARCH_PER_KIND, searchWorkspace } from "./service";

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
    data: { id, name: `${label} (sample)`, email: `search-${id}@example.com` },
  });
  const result = await createWorkspace(db, id, { name: `${label} (sample)`, timezone: "UTC" });
  if (!result.ok) throw new Error(result.message);
  return { user, workspace: result.value, role: "OWNER" };
}

function must<T>(result: { ok: true; value: T } | { ok: false; message: string }): T {
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

describe("searching the workspace", () => {
  it("finds clients, leads, projects and tasks by name, any case", async () => {
    const a = await owner("Search A");
    const client = must(
      await createClient(db, a, { name: "Atlas Café (sample)", company: "Atlas" }),
    );
    must(await createLead(db, a, { contactName: "Leila (sample)", company: "ATLAS Studio" }));
    const project = must(
      await createProject(db, a, { name: "Atlas menu (sample)", clientId: client.id }),
    );
    must(
      await createTask(db, a, { title: "Print the atlas menu (sample)", projectId: project.id }),
    );
    must(await createClient(db, a, { name: "Nour Architects (sample)" }));

    const hits = await searchWorkspace(db, a, "atlas");
    expect(hits.map((hit) => [hit.kind, hit.title, hit.detail])).toEqual([
      ["client", "Atlas Café (sample)", "Atlas"],
      ["lead", "Leila (sample)", "ATLAS Studio"],
      ["project", "Atlas menu (sample)", "Atlas Café (sample)"],
      ["task", "Print the atlas menu (sample)", "Atlas menu (sample)"],
    ]);
    expect(hits[0]!.href).toBe(`/clients/${client.id}`);
  });

  it("never shows another workspace's records", async () => {
    const [a, b] = [await owner("Search own"), await owner("Search other")];
    must(await createClient(db, b, { name: "Secret Atlas (sample)" }));
    must(await createTask(db, b, { title: "Secret atlas task (sample)" }));
    expect(await searchWorkspace(db, a, "secret")).toEqual([]);
    expect((await searchWorkspace(db, b, "secret")).length).toBe(2);
  });

  it("ignores empty or odd input, and limits each kind", async () => {
    const a = await owner("Search input");
    for (let i = 1; i <= SEARCH_PER_KIND + 2; i++) {
      must(await createClient(db, a, { name: `Studio ${i} (sample)` }));
    }
    expect(await searchWorkspace(db, a, "")).toEqual([]);
    expect(await searchWorkspace(db, a, "   ")).toEqual([]);
    expect(await searchWorkspace(db, a, 42)).toEqual([]);
    expect(await searchWorkspace(db, a, null)).toEqual([]);
    // A null character is dropped rather than crashing PostgreSQL.
    expect((await searchWorkspace(db, a, "studio\u0000")).length).toBe(SEARCH_PER_KIND);
  });
});
