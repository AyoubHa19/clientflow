import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { toDateOnly } from "@/lib/dates";
import { parseTaskListParams } from "@/lib/validation/task";
import { createPrismaClient, type Db } from "@/server/db/client";
import { createProject, deleteProject } from "@/server/projects/service";
import { getTestDatabaseUrl } from "@/test/test-database";
import { createWorkspace, type WorkspaceContext } from "@/server/workspace/service";
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  projectOptions,
  projectProgress,
  setTaskDone,
  tasksForProject,
  updateTask,
} from "./service";

let db: Db;
const userIds: string[] = [];
const TODAY = "2026-10-16";

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
    data: { id, name: `${label} (sample)`, email: `tasks-${id}@example.com` },
  });
  const result = await createWorkspace(db, id, { name: `${label} (sample)`, timezone: "UTC" });
  if (!result.ok) throw new Error(result.message);
  return { user, workspace: result.value, role: "OWNER" };
}

async function addProject(ctx: WorkspaceContext, name: string, status = "IN_PROGRESS") {
  const result = await createProject(db, ctx, { name, status });
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

async function addTask(ctx: WorkspaceContext, title: string, extra: Record<string, string> = {}) {
  const result = await createTask(db, ctx, { title, ...extra });
  if (!result.ok) throw new Error(`${result.message} ${JSON.stringify(result.errors)}`);
  return result.value;
}

const list = (ctx: WorkspaceContext, query: Record<string, string> = {}) =>
  listTasks(db, ctx, parseTaskListParams(query), TODAY);

describe("tasks", () => {
  it("creates a task in a project with a due date", async () => {
    const a = await owner("A");
    const project = await addProject(a, "Website (sample)");
    const task = await addTask(a, " Send the quote (sample) ", {
      projectId: project.id,
      dueDate: "2026-10-20",
      priority: "HIGH",
      description: "",
    });
    expect(task).toMatchObject({
      title: "Send the quote (sample)",
      status: "TODO",
      priority: "HIGH",
      description: null,
      completedAt: null,
      project: { id: project.id, name: "Website (sample)" },
    });
    expect(toDateOnly(task.dueDate!)).toBe("2026-10-20");
  });

  it("explains invalid input", async () => {
    const a = await owner("A");
    const result = await createTask(db, a, {
      title: "",
      priority: "URGENT",
      dueDate: "2026-13-01",
      projectId: "x",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors ?? {}).sort()).toEqual([
        "dueDate",
        "priority",
        "projectId",
        "title",
      ]);
    }
  });

  it("records when a task is done, and forgets it when reopened", async () => {
    const a = await owner("A");
    const task = await addTask(a, "Tick me (sample)");

    const done = await setTaskDone(db, a, task.id, true);
    expect(done.ok && done.value.status).toBe("DONE");
    const completedAt = done.ok ? done.value.completedAt : null;
    expect(completedAt).toBeInstanceOf(Date);

    // Editing a done task keeps the moment it was completed.
    const edited = await updateTask(db, a, task.id, { title: "Ticked (sample)", status: "DONE" });
    expect(edited.ok && edited.value.completedAt?.getTime()).toBe(completedAt?.getTime());

    const reopened = await setTaskDone(db, a, task.id, false);
    expect(reopened.ok && reopened.value).toMatchObject({ status: "TODO", completedAt: null });

    const actions = await db.activity.findMany({
      where: { entityId: task.id },
      orderBy: { createdAt: "asc" },
      select: { action: true },
    });
    expect(actions.map((row) => row.action)).toEqual([
      "CREATED",
      "COMPLETED",
      "UPDATED",
      "STATUS_CHANGED",
    ]);
  });

  it("deletes (owners only), and keeps tasks when their project goes", async () => {
    const a = await owner("A");
    const project = await addProject(a, "Short-lived (sample)");
    const kept = await addTask(a, "Stays (sample)", { projectId: project.id });
    const gone = await addTask(a, "Goes (sample)");

    expect((await deleteTask(db, { ...a, role: "MEMBER" }, gone.id)).ok).toBe(false);
    expect((await deleteTask(db, a, gone.id)).ok).toBe(true);
    expect(await getTask(db, a, gone.id)).toBeNull();

    await deleteProject(db, a, project.id);
    expect((await getTask(db, a, kept.id))?.project).toBeNull();
  });

  it("counts each project's progress and offers open projects", async () => {
    const a = await owner("A");
    const open = await addProject(a, "Open (sample)");
    const finished = await addProject(a, "Finished (sample)", "COMPLETED");
    const t1 = await addTask(a, "One (sample)", { projectId: open.id });
    await addTask(a, "Two (sample)", { projectId: open.id });
    await addTask(a, "Three (sample)", { projectId: open.id, status: "DONE" });
    await setTaskDone(db, a, t1.id, true);

    expect(await projectProgress(db, a, [open.id, finished.id])).toEqual({
      [open.id]: { done: 2, total: 3 },
    });
    const tasks = await tasksForProject(db, a, open.id);
    expect(tasks.map((task) => task.title)[0]).toBe("Two (sample)");

    expect((await projectOptions(db, a)).map((project) => project.id)).toEqual([open.id]);
    expect((await projectOptions(db, a, finished.id)).map((p) => p.id).sort()).toEqual(
      [open.id, finished.id].sort(),
    );
  });
});

describe("workspace isolation", () => {
  it("never puts a task in another workspace's project", async () => {
    const [a, b] = [await owner("A"), await owner("B")];
    const bProject = await addProject(b, "B's project (sample)");

    const created = await createTask(db, a, { title: "Sneaky (sample)", projectId: bProject.id });
    expect(created.ok).toBe(false);
    if (!created.ok)
      expect(created.errors).toEqual({ projectId: "Choose a project from the list." });

    const task = await addTask(a, "Mine (sample)");
    const moved = await updateTask(db, a, task.id, {
      title: "Mine (sample)",
      projectId: bProject.id,
    });
    expect(moved.ok).toBe(false);
    expect(await projectProgress(db, a, [bProject.id])).toEqual({});
    expect(await projectOptions(db, a, bProject.id)).toEqual([]);
  });

  it("never shows, ticks, changes or deletes another workspace's task", async () => {
    const [a, b] = [await owner("A"), await owner("B")];
    const bTask = await addTask(b, "B's task (sample)");

    expect(await getTask(db, a, bTask.id)).toBeNull();
    for (const result of [
      await setTaskDone(db, a, bTask.id, true),
      await updateTask(db, a, bTask.id, { title: "Hijacked (sample)" }),
      await deleteTask(db, a, bTask.id),
    ]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("NOT_FOUND");
    }
    const untouched = await db.task.findUniqueOrThrow({ where: { id: bTask.id } });
    expect(untouched).toMatchObject({
      title: "B's task (sample)",
      status: "TODO",
      completedAt: null,
    });
  });
});

describe("unusual input", () => {
  // Server Actions can be called with any values, not just what the forms send.
  it("explains a null character or an impossible year instead of crashing", async () => {
    const a = await owner("Unusual");
    const nullTitle = await createTask(db, a, { title: "Call\u0000 Karim (sample)" });
    expect(nullTitle).toMatchObject({ ok: false, code: "INVALID" });
    const yearZero = await createTask(db, a, { title: "Old (sample)", dueDate: "0000-01-01" });
    expect(yearZero).toMatchObject({
      ok: false,
      errors: { dueDate: "Enter a valid due date." },
    });
    expect(await db.task.count({ where: { workspaceId: a.workspace.id } })).toBe(0);
  });

  it("ticks a task only with a real true or false", async () => {
    const a = await owner("Done flag");
    const task = await addTask(a, "Send proofs (sample)");
    for (const value of ["true", 1, null, undefined]) {
      const result = await setTaskDone(db, a, task.id, value as unknown as boolean);
      expect(result).toMatchObject({ ok: false, code: "INVALID" });
    }
    expect((await getTask(db, a, task.id))?.status).toBe("TODO");
  });
});

describe("the list", () => {
  it("filters by due date, priority, project and status, and sorts", async () => {
    const a = await owner("A");
    const project = await addProject(a, "Website (sample)");
    await addTask(a, "Late (sample)", { dueDate: "2026-10-10", priority: "LOW" });
    await addTask(a, "Late but done (sample)", { dueDate: "2026-10-09", status: "DONE" });
    await addTask(a, "Today high (sample)", {
      dueDate: TODAY,
      priority: "HIGH",
      projectId: project.id,
    });
    await addTask(a, "Today low (sample)", { dueDate: TODAY, priority: "LOW" });
    await addTask(a, "In six days (sample)", { dueDate: "2026-10-22" });
    await addTask(a, "In seven days (sample)", { dueDate: "2026-10-23" });
    await addTask(a, "Someday (sample)");

    const titles = async (query: Record<string, string>) =>
      (await list(a, query)).items.map((task) => task.title);

    // Open tasks, soonest due first, high before low on the same day, undated last.
    expect(await titles({})).toEqual([
      "Late (sample)",
      "Today high (sample)",
      "Today low (sample)",
      "In six days (sample)",
      "In seven days (sample)",
      "Someday (sample)",
    ]);
    expect(await titles({ due: "overdue", status: "all" })).toEqual(["Late (sample)"]);
    expect(await titles({ due: "today" })).toEqual(["Today high (sample)", "Today low (sample)"]);
    expect(await titles({ due: "week" })).toEqual([
      "Today high (sample)",
      "Today low (sample)",
      "In six days (sample)",
    ]);
    expect(await titles({ due: "none" })).toEqual(["Someday (sample)"]);
    expect(await titles({ priority: "high" })).toEqual(["Today high (sample)"]);
    expect(await titles({ project: project.id })).toEqual(["Today high (sample)"]);
    expect((await list(a, { project: "none" })).total).toBe(5);
    expect(await titles({ status: "done" })).toEqual(["Late but done (sample)"]);
    expect(await titles({ q: "SIX" })).toEqual(["In six days (sample)"]);
    expect((await titles({ sort: "priority" }))[0]).toBe("Today high (sample)");
  });
});
