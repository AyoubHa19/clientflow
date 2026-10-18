import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { todayIn } from "@/lib/dates";
import { addDays } from "@/lib/followups";
import { createClient } from "@/server/clients/service";
import { createPrismaClient, type Db } from "@/server/db/client";
import { createProject } from "@/server/projects/service";
import { createTask } from "@/server/tasks/service";
import { getTestDatabaseUrl } from "@/test/test-database";
import { createWorkspace, type WorkspaceContext } from "@/server/workspace/service";
import {
  clientsHealth,
  deleteTimeEntry,
  logTime,
  projectTime,
  runningTimer,
  startTimer,
  stopTimer,
} from "./service";

// Stage 17: timers, logged time, real hourly rates and client health.

let db: Db;
const userIds: string[] = [];
const today = todayIn("UTC");

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
    data: { id, name: `${label} (sample)`, email: `time-${id}@example.com` },
  });
  const result = await createWorkspace(db, id, { name: `${label} (sample)`, timezone: "UTC" });
  if (!result.ok) throw new Error(result.message);
  return { user, workspace: result.value, role: "OWNER" };
}

function must<T>(result: { ok: true; value: T } | { ok: false; message: string }) {
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

async function project(ctx: WorkspaceContext, extra: Record<string, string> = {}) {
  return must(await createProject(db, ctx, { name: `P ${randomUUID()} (sample)`, ...extra }));
}

describe("timers", () => {
  it("start, then stop: whole minutes on today's day", async () => {
    const a = await owner("A");
    const p = await project(a);
    const start = new Date();
    must(await startTimer(db, a, { projectId: p.id }, start));
    expect((await runningTimer(db, a))?.project.id).toBe(p.id);
    const stopped = must(await stopTimer(db, a, new Date(start.getTime() + 25 * 60_000)));
    expect(stopped).toMatchObject({ minutes: 25, capped: false });
    expect(await runningTimer(db, a)).toBeNull();
    expect((await stopTimer(db, a)).ok).toBe(false);
    const time = await projectTime(db, a, p.id);
    expect(time.totalMinutes).toBe(25);
  });

  it("starting another timer stops the first; a forgotten one is capped at a day", async () => {
    const a = await owner("A");
    const first = await project(a);
    const second = await project(a);
    const start = new Date(Date.now() - 3 * 24 * 3600_000);
    must(await startTimer(db, a, { projectId: first.id }, start));
    const switched = must(await startTimer(db, a, { projectId: second.id }));
    expect(switched.stopped).toMatchObject({ minutes: 1440, capped: true });
    expect((await runningTimer(db, a))?.project.id).toBe(second.id);
  });

  it("the database refuses a second running timer for the same person", async () => {
    const a = await owner("A");
    const p = await project(a);
    must(await startTimer(db, a, { projectId: p.id }));
    await expect(
      db.timeEntry.create({
        data: {
          workspaceId: a.workspace.id,
          projectId: p.id,
          userId: a.user.id,
          day: new Date(`${today}T00:00:00Z`),
          startedAt: new Date(),
        },
      }),
    ).rejects.toThrow();
  });

  it("a timer can't start on another workspace's project, or a task of another project", async () => {
    const a = await owner("A");
    const b = await owner("B");
    const theirs = await project(b);
    const other = await startTimer(db, a, { projectId: theirs.id });
    expect(!other.ok && other.errors).toEqual({ projectId: "Choose a project from the list." });
    const mine = await project(a);
    const elsewhere = await project(a);
    const task = must(await createTask(db, a, { title: "T (sample)", projectId: elsewhere.id }));
    const wrongTask = await startTimer(db, a, { projectId: mine.id, taskId: task.id });
    expect(!wrongTask.ok && wrongTask.errors).toEqual({ taskId: "Choose a task of this project." });
  });
});

describe("logging time by hand", () => {
  it("records the day, minutes, task and note; refuses a future day and bad durations", async () => {
    const a = await owner("A");
    const p = await project(a);
    const task = must(await createTask(db, a, { title: "Draft (sample)", projectId: p.id }));
    must(
      await logTime(db, a, {
        projectId: p.id,
        taskId: task.id,
        day: today,
        duration: "1:30",
        note: "First draft",
      }),
    );
    const { entries, totalMinutes } = await projectTime(db, a, p.id);
    expect(totalMinutes).toBe(90);
    expect(entries[0]).toMatchObject({ minutes: 90, note: "First draft", task: { id: task.id } });

    const future = await logTime(db, a, { projectId: p.id, day: addDays(today, 1), duration: "1" });
    expect(!future.ok && future.errors).toEqual({ day: "This day hasn't happened yet." });
    const bad = await logTime(db, a, { projectId: p.id, day: today, duration: "25h" });
    expect(!bad.ok && Object.keys(bad.errors ?? {})).toEqual(["duration"]);
  });

  it("you delete your own time; the owner can delete anyone's; other workspaces can't", async () => {
    const a = await owner("A");
    const b = await owner("B");
    const p = await project(a);
    const entry = must(await logTime(db, a, { projectId: p.id, day: today, duration: "45m" }));
    const member = { ...a, user: { ...a.user, id: randomUUID() }, role: "MEMBER" as const };
    expect((await deleteTimeEntry(db, member, entry.id)).ok).toBe(false);
    expect((await deleteTimeEntry(db, b, entry.id)).ok).toBe(false);
    expect((await deleteTimeEntry(db, a, entry.id)).ok).toBe(true);
  });
});

describe("client health", () => {
  it("compares each client's real hourly rate with the average, and counts overdue work", async () => {
    const a = await owner("A");
    const good = must(await createClient(db, a, { name: "Good (sample)" }));
    const cheap = must(await createClient(db, a, { name: "Cheap (sample)" }));
    const quiet = must(await createClient(db, a, { name: "Quiet (sample)" }));
    // Good: 6,000 for 10 hours = 600/h. Cheap: 1,000 for 10 hours = 100/h.
    const p1 = await project(a, { clientId: good.id, fee: "6000" });
    const p2 = await project(a, { clientId: cheap.id, fee: "1000" });
    await logTime(db, a, { projectId: p1.id, day: today, duration: "10" });
    await logTime(db, a, { projectId: p2.id, day: today, duration: "10" });
    // Cheap also has late work: an overdue project and an overdue task.
    const late = await project(a, { clientId: cheap.id, dueDate: addDays(today, -3) });
    await createTask(db, a, {
      title: "Late (sample)",
      projectId: late.id,
      dueDate: addDays(today, -1),
    });
    // Time on a project without a fee doesn't change the rate.
    await logTime(db, a, { projectId: late.id, day: today, duration: "5" });

    const health = await clientsHealth(db, a, [good.id, cheap.id, quiet.id], today);
    // Average: 7,000 over 20 hours = 350/h.
    expect(health[good.id]).toMatchObject({
      rate: 60000,
      minutes: 600,
      overdue: 0,
      health: { level: "good" },
    });
    expect(health[good.id]!.health.reasons[0]).toBe("Pays 71% more per hour than your average");
    expect(health[cheap.id]).toMatchObject({ rate: 10000, overdue: 2, health: { level: "risk" } });
    expect(health[quiet.id]).toMatchObject({ rate: null, health: { level: "unknown" } });

    // Another workspace sees nothing of these clients.
    const b = await owner("B");
    const theirs = await clientsHealth(db, b, [good.id], today);
    expect(theirs[good.id]).toMatchObject({ rate: null, overdue: 0 });
  });
});
