import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDays, weekStart } from "@/lib/dashboard";
import { todayIn } from "@/lib/dates";
import { createPrismaClient, type Db } from "@/server/db/client";
import { createLead, logContact, setLeadStatus } from "@/server/leads/service";
import { createProject, setProjectStatus } from "@/server/projects/service";
import { createTask, setTaskDone } from "@/server/tasks/service";
import { logTime } from "@/server/time/service";
import { getTestDatabaseUrl } from "@/test/test-database";
import { createWorkspace, type WorkspaceContext } from "@/server/workspace/service";
import { getToday, getWeekReview } from "./service";

// Stage 18: the Today page and the weekly review.

let db: Db;
const userIds: string[] = [];
const today = todayIn("UTC");
const monday = weekStart(today);

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
    data: { id, name: `${label} (sample)`, email: `review-${id}@example.com` },
  });
  const result = await createWorkspace(db, id, { name: `${label} (sample)`, timezone: "UTC" });
  if (!result.ok) throw new Error(result.message);
  return { user, workspace: result.value, role: "OWNER" };
}

function must<T>(result: { ok: true; value: T } | { ok: false; message: string }) {
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

const task = async (ctx: WorkspaceContext, title: string, extra: Record<string, string> = {}) =>
  must(await createTask(db, ctx, { title, ...extra }));

describe("today", () => {
  it("lists what's due today or late, then the next week, and the time logged", async () => {
    const a = await owner("A");
    const b = await owner("B");
    await task(a, "Late (sample)", { dueDate: addDays(today, -2) });
    await task(a, "Today (sample)", { dueDate: today });
    await task(a, "Soon (sample)", { dueDate: addDays(today, 3) });
    await task(a, "Later (sample)", { dueDate: addDays(today, 30) });
    const finished = await task(a, "Finished (sample)", { dueDate: today });
    await setTaskDone(db, a, finished.id, true);
    await task(b, "Theirs (sample)", { dueDate: today });
    const p = must(await createProject(db, a, { name: "P (sample)" }));
    await logTime(db, a, { projectId: p.id, day: today, duration: "1:30" });
    // Logged on Monday (or today, if today is Monday): in this week either way.
    await logTime(db, a, { projectId: p.id, day: monday, duration: "2" });

    const result = await getToday(db, a, today);
    expect(result.due.items.map((t) => t.title)).toEqual(["Late (sample)", "Today (sample)"]);
    expect(result.coming.items.map((t) => t.title)).toEqual(["Soon (sample)"]);
    expect(result.minutesToday).toBe(today === monday ? 210 : 90);
    expect(result.minutesThisWeek).toBe(210);
  });
});

describe("the weekly review", () => {
  it("counts the week's finished, slipped and completed work, time and leads", async () => {
    const a = await owner("A");
    const p = must(await createProject(db, a, { name: "Site (sample)", status: "IN_PROGRESS" }));
    const one = await task(a, "One (sample)", { projectId: p.id });
    const two = await task(a, "Two (sample)", { projectId: p.id });
    await setTaskDone(db, a, one.id, true);
    await setTaskDone(db, a, two.id, true);
    // Finished last week: counts for the comparison only.
    const old = await task(a, "Old (sample)");
    await setTaskDone(db, a, old.id, true);
    await db.task.update({
      where: { id: old.id },
      data: { completedAt: new Date(`${addDays(monday, -3)}T12:00:00Z`) },
    });
    // Slipped: due this week before today, not done.
    const slippedDay = today === monday ? null : monday;
    if (slippedDay) await task(a, "Slipped (sample)", { dueDate: slippedDay });
    await setProjectStatus(db, a, p.id, "COMPLETED");
    await logTime(db, a, { projectId: p.id, day: today, duration: "3" });
    await logTime(db, a, { projectId: p.id, day: addDays(monday, -1), duration: "1" });
    const lead = must(await createLead(db, a, { contactName: "Lina (sample)", value: "2000" }));
    await logContact(db, a, lead.id, { contactedOn: today }, today);
    await setLeadStatus(db, a, lead.id, "WON");

    const review = await getWeekReview(db, a, monday, today);
    expect(review.done.map((t) => t.title).sort()).toEqual(["One (sample)", "Two (sample)"]);
    expect(review.doneLastWeek).toBe(1);
    expect(review.slipped.map((t) => t.title)).toEqual(slippedDay ? ["Slipped (sample)"] : []);
    expect(review.projectsCompleted.map((p) => p.entityId)).toEqual([p.id]);
    expect(review.time).toEqual([{ projectId: p.id, name: "Site (sample)", minutes: 180 }]);
    expect(review.minutes).toBe(180);
    expect(review.minutesLastWeek).toBe(60);
    expect(review.leads).toEqual({ contacted: 1, won: 1, wonValue: 200000, added: 1 });

    // Last week's review has the old task and the hour.
    const last = await getWeekReview(db, a, addDays(monday, -7), today);
    expect(last.done.map((t) => t.title)).toEqual(["Old (sample)"]);
    expect(last.minutes).toBe(60);
  });

  it("another workspace's week is empty", async () => {
    const a = await owner("A");
    const b = await owner("B");
    const t = await task(a, "Mine (sample)");
    await setTaskDone(db, a, t.id, true);
    const review = await getWeekReview(db, b, monday, today);
    expect(review.done).toEqual([]);
    expect(review.leads).toEqual({ contacted: 0, won: 0, wonValue: 0, added: 0 });
  });
});
