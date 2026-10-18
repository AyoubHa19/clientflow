import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDays } from "@/lib/dashboard";
import { todayIn, toDateOnly } from "@/lib/dates";
import { createPrismaClient, type Db } from "@/server/db/client";
import { createProject } from "@/server/projects/service";
import { createTask } from "@/server/tasks/service";
import { getTestDatabaseUrl } from "@/test/test-database";
import { createWorkspace, type WorkspaceContext } from "@/server/workspace/service";
import { deleteTemplate, listTemplates, saveAsTemplate, templateChoices } from "./service";

// Stage 19: project templates.

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
    data: { id, name: `${label} (sample)`, email: `templates-${id}@example.com` },
  });
  const result = await createWorkspace(db, id, { name: `${label} (sample)`, timezone: "UTC" });
  if (!result.ok) throw new Error(result.message);
  return { user, workspace: result.value, role: "OWNER" };
}

function must<T>(result: { ok: true; value: T } | { ok: false; message: string }) {
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

const tasksOf = (projectId: string) =>
  db.task.findMany({
    where: { projectId },
    orderBy: [{ dueDate: "asc" }, { title: "asc" }],
    select: { title: true, priority: true, dueDate: true, status: true },
  });

describe("starting a project from a template", () => {
  it("a built-in template adds its tasks, dated from the start, and its description", async () => {
    const a = await owner("A");
    const project = must(
      await createProject(
        db,
        a,
        { name: "Site (sample)", startDate: "2026-11-02" },
        { template: "builtin:website" },
      ),
    );
    expect(project.description).toBe("A small business website: from the brief to the launch.");
    const tasks = await tasksOf(project.id);
    expect(tasks).toHaveLength(7);
    expect(tasks[0]).toMatchObject({
      title: "Kick-off call and brief",
      priority: "HIGH",
      status: "TODO",
    });
    expect(toDateOnly(tasks[0]!.dueDate!)).toBe("2026-11-03");
    expect(toDateOnly(tasks.at(-1)!.dueDate!)).toBe("2026-12-02");
    const log = await db.activity.findFirst({ where: { entityId: project.id } });
    expect(log?.summary).toBe("Added project Site (sample) from the Website template");
  });

  it("without a start date, due dates count from today; a typed description wins", async () => {
    const a = await owner("A");
    const project = must(
      await createProject(
        db,
        a,
        { name: "Logo (sample)", description: "Our own words" },
        { template: "builtin:logo" },
      ),
    );
    expect(project.description).toBe("Our own words");
    const tasks = await tasksOf(project.id);
    expect(toDateOnly(tasks[0]!.dueDate!)).toBe(addDays(todayIn("UTC"), 2));
  });

  it("an unknown template, or another workspace's, is refused and nothing is made", async () => {
    const a = await owner("A");
    const b = await owner("B");
    const source = must(await createProject(db, b, { name: "Theirs (sample)" }));
    await createTask(db, b, { title: "Secret step (sample)", projectId: source.id });
    const theirs = must(await saveAsTemplate(db, b, source.id, { name: "Their way" }));
    for (const template of ["builtin:nope", theirs.id, "not-an-id"]) {
      const result = await createProject(db, a, { name: "Mine (sample)" }, { template });
      expect(!result.ok && result.errors).toEqual({ template: "Choose a template from the list." });
    }
    expect(await db.project.count({ where: { workspaceId: a.workspace.id } })).toBe(0);
  });
});

describe("saving templates", () => {
  it("saves a project's tasks as days after its start, then starts a new project from it", async () => {
    const a = await owner("A");
    const source = must(
      await createProject(db, a, { name: "Brand (sample)", startDate: "2026-10-01" }),
    );
    await createTask(db, a, {
      title: "Workshop (sample)",
      projectId: source.id,
      dueDate: "2026-10-04",
      priority: "HIGH",
    });
    await createTask(db, a, { title: "Whenever (sample)", projectId: source.id });
    const saved = must(await saveAsTemplate(db, a, source.id, { name: " Brand kit " }));
    expect(saved).toMatchObject({ name: "Brand kit", tasks: 2 });

    const choices = await templateChoices(db, a);
    expect(choices.at(-1)).toEqual({
      value: saved.id,
      label: "Brand kit (2 tasks)",
      ownTemplate: true,
    });
    const next = must(
      await createProject(
        db,
        a,
        { name: "Next brand (sample)", startDate: "2027-01-10" },
        { template: saved.id },
      ),
    );
    const tasks = await tasksOf(next.id);
    expect(tasks.map((t) => [t.title, t.dueDate && toDateOnly(t.dueDate)])).toEqual([
      ["Workshop (sample)", "2027-01-13"],
      ["Whenever (sample)", null],
    ]);
  });

  it("names are unique per workspace; only the owner deletes; other workspaces can't", async () => {
    const a = await owner("A");
    const b = await owner("B");
    const p = must(await createProject(db, a, { name: "P (sample)" }));
    const saved = must(await saveAsTemplate(db, a, p.id, { name: "Kit" }));
    const again = await saveAsTemplate(db, a, p.id, { name: "Kit" });
    expect(!again.ok && again.errors).toEqual({
      name: "You already have a template with this name.",
    });
    expect((await saveAsTemplate(db, a, p.id, { name: "  " })).ok).toBe(false);
    expect((await saveAsTemplate(db, b, p.id, { name: "Stolen" })).ok).toBe(false);

    expect((await deleteTemplate(db, { ...a, role: "MEMBER" }, saved.id)).ok).toBe(false);
    expect((await deleteTemplate(db, b, saved.id)).ok).toBe(false);
    expect((await deleteTemplate(db, a, saved.id)).ok).toBe(true);
    expect(await listTemplates(db, a)).toEqual([]);
  });
});
