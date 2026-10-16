import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { toDateOnly } from "@/lib/dates";
import { parseProjectListParams } from "@/lib/validation/project";
import { createClient, deleteClient, setClientArchived } from "@/server/clients/service";
import { createPrismaClient, type Db } from "@/server/db/client";
import { getTestDatabaseUrl } from "@/test/test-database";
import { createWorkspace, type WorkspaceContext } from "@/server/workspace/service";
import {
  clientOptions,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  projectsForClient,
  setProjectStatus,
  updateProject,
} from "./service";

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
    data: { id, name: `${label} (sample)`, email: `projects-${id}@example.com` },
  });
  const result = await createWorkspace(db, id, { name: `${label} (sample)`, timezone: "UTC" });
  if (!result.ok) throw new Error(result.message);
  return { user, workspace: result.value, role: "OWNER" };
}

async function addClient(ctx: WorkspaceContext, name: string) {
  const result = await createClient(db, ctx, { name });
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

async function addProject(ctx: WorkspaceContext, name: string, extra: Record<string, string> = {}) {
  const result = await createProject(db, ctx, { name, ...extra });
  if (!result.ok) throw new Error(`${result.message} ${JSON.stringify(result.errors)}`);
  return result.value;
}

describe("projects", () => {
  it("creates a project with a client and calendar dates", async () => {
    const a = await owner("A");
    const client = await addClient(a, "Atlas Café (sample)");
    const project = await addProject(a, " Website (sample) ", {
      clientId: client.id,
      startDate: "2026-10-01",
      dueDate: "2026-12-31",
      description: "",
    });
    expect(project).toMatchObject({
      name: "Website (sample)",
      status: "PLANNING",
      description: null,
      client: { id: client.id, name: "Atlas Café (sample)" },
    });
    expect(toDateOnly(project.startDate!)).toBe("2026-10-01");
    expect(toDateOnly(project.dueDate!)).toBe("2026-12-31");
    const log = await db.activity.findFirst({ where: { entityId: project.id } });
    expect(log).toMatchObject({ entityType: "PROJECT", action: "CREATED" });
  });

  it("explains bad dates and a due date before the start", async () => {
    const a = await owner("A");
    const bad = await createProject(db, a, { name: "X", startDate: "2026-02-30", dueDate: "soon" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors ?? {}).sort()).toEqual(["dueDate", "startDate"]);

    const backwards = await createProject(db, a, {
      name: "Backwards (sample)",
      startDate: "2026-11-10",
      dueDate: "2026-11-01",
    });
    expect(backwards.ok).toBe(false);
    if (!backwards.ok) {
      expect(backwards.errors).toEqual({ dueDate: "The due date can't be before the start date." });
    }
  });

  it("updates, changes status (logging completion) and deletes", async () => {
    const a = await owner("A");
    const project = await addProject(a, "Rebrand (sample)");
    const updated = await updateProject(db, a, project.id, {
      name: "Rebrand 2 (sample)",
      status: "IN_PROGRESS",
      dueDate: "2026-11-15",
    });
    expect(updated.ok && updated.value).toMatchObject({
      name: "Rebrand 2 (sample)",
      status: "IN_PROGRESS",
    });

    expect((await setProjectStatus(db, a, project.id, "COMPLETED")).ok).toBe(true);
    expect((await setProjectStatus(db, a, project.id, "DONE")).ok).toBe(false);
    const completed = await db.activity.count({
      where: { entityId: project.id, action: "COMPLETED" },
    });
    expect(completed).toBe(1);

    expect((await deleteProject(db, { ...a, role: "MEMBER" }, project.id)).ok).toBe(false);
    expect((await deleteProject(db, a, project.id)).ok).toBe(true);
    expect(await getProject(db, a, project.id)).toBeNull();
  });

  it("keeps a project when its client is deleted", async () => {
    const a = await owner("A");
    const client = await addClient(a, "Leaving (sample)");
    const project = await addProject(a, "Kept (sample)", { clientId: client.id });
    await deleteClient(db, a, client.id);
    expect((await getProject(db, a, project.id))?.client).toBeNull();
  });

  it("offers active clients, plus the current one even if archived", async () => {
    const a = await owner("A");
    const active = await addClient(a, "Active (sample)");
    const archived = await addClient(a, "Archived (sample)");
    await setClientArchived(db, a, archived.id, true);

    expect((await clientOptions(db, a)).map((client) => client.id)).toEqual([active.id]);
    const withCurrent = await clientOptions(db, a, archived.id);
    expect(withCurrent.map((client) => client.id).sort()).toEqual([active.id, archived.id].sort());
  });
});

describe("workspace isolation", () => {
  it("never links a project to another workspace's client", async () => {
    const [a, b] = [await owner("A"), await owner("B")];
    const bClient = await addClient(b, "B's client (sample)");

    const created = await createProject(db, a, { name: "Sneaky (sample)", clientId: bClient.id });
    expect(created.ok).toBe(false);
    if (!created.ok) expect(created.errors).toEqual({ clientId: "Choose a client from the list." });

    const project = await addProject(a, "Mine (sample)");
    const updated = await updateProject(db, a, project.id, {
      name: "Mine (sample)",
      clientId: bClient.id,
    });
    expect(updated.ok).toBe(false);
    expect((await getProject(db, a, project.id))?.client).toBeNull();
    expect(await clientOptions(db, a, bClient.id)).toEqual([]);
  });

  it("never shows, changes or deletes another workspace's project", async () => {
    const [a, b] = [await owner("A"), await owner("B")];
    const bClient = await addClient(b, "B's client (sample)");
    const bProject = await addProject(b, "B's project (sample)", { clientId: bClient.id });

    expect(await getProject(db, a, bProject.id)).toBeNull();
    expect(await projectsForClient(db, a, bClient.id)).toEqual([]);
    for (const result of [
      await updateProject(db, a, bProject.id, { name: "Hijacked (sample)" }),
      await setProjectStatus(db, a, bProject.id, "CANCELLED"),
      await deleteProject(db, a, bProject.id),
    ]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("NOT_FOUND");
    }
    const untouched = await db.project.findUniqueOrThrow({ where: { id: bProject.id } });
    expect(untouched).toMatchObject({ name: "B's project (sample)", status: "PLANNING" });
  });
});

describe("the list", () => {
  it("filters by status and client, searches client names, and sorts by due date", async () => {
    const a = await owner("A");
    const atlas = await addClient(a, "Atlas Café (sample)");
    const nour = await addClient(a, "Nour Architects (sample)");
    await addProject(a, "Menu design (sample)", { clientId: atlas.id, dueDate: "2026-11-20" });
    await addProject(a, "Website (sample)", { clientId: atlas.id, dueDate: "2026-11-05" });
    await addProject(a, "Office plans (sample)", { clientId: nour.id });
    await addProject(a, "Internal (sample)", { dueDate: "2026-10-30" });
    await addProject(a, "Old job (sample)", { status: "COMPLETED", dueDate: "2026-01-01" });

    const open = await listProjects(db, a, parseProjectListParams({}));
    // Soonest due first, no due date last; completed hidden by default.
    expect(open.items.map((project) => project.name)).toEqual([
      "Internal (sample)",
      "Website (sample)",
      "Menu design (sample)",
      "Office plans (sample)",
    ]);

    const forAtlas = await listProjects(db, a, parseProjectListParams({ client: atlas.id }));
    expect(forAtlas.total).toBe(2);
    const noClient = await listProjects(
      db,
      a,
      parseProjectListParams({ client: "none", status: "all" }),
    );
    expect(noClient.items.map((project) => project.name).sort()).toEqual([
      "Internal (sample)",
      "Old job (sample)",
    ]);
    const byClientName = await listProjects(db, a, parseProjectListParams({ q: "nour" }));
    expect(byClientName.items.map((project) => project.name)).toEqual(["Office plans (sample)"]);
    const done = await listProjects(db, a, parseProjectListParams({ status: "completed" }));
    expect(done.items.map((project) => project.name)).toEqual(["Old job (sample)"]);

    expect(
      (await projectsForClient(db, a, atlas.id)).map((project) => project.name).sort(),
    ).toEqual(["Menu design (sample)", "Website (sample)"]);
  });
});
