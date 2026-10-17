import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, deleteClient, setClientArchived } from "@/server/clients/service";
import { createPrismaClient, type Db } from "@/server/db/client";
import { convertLead, createLead } from "@/server/leads/service";
import { createProject } from "@/server/projects/service";
import { createTask, setTaskDone } from "@/server/tasks/service";
import { getTestDatabaseUrl } from "@/test/test-database";
import { createWorkspace, type WorkspaceContext } from "@/server/workspace/service";
import { todayIn } from "@/lib/dates";
import { getDashboard, listActivity } from "./service";

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

async function owner(label: string, timezone = "UTC"): Promise<WorkspaceContext> {
  const id = randomUUID();
  userIds.push(id);
  const user = await db.user.create({
    data: { id, name: `${label} (sample)`, email: `dash-${id}@example.com` },
  });
  const result = await createWorkspace(db, id, { name: `${label} (sample)`, timezone });
  if (!result.ok) throw new Error(result.message);
  return { user, workspace: result.value, role: "OWNER" };
}

function must<T>(result: { ok: true; value: T } | { ok: false; message: string }): T {
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

describe("the dashboard", () => {
  it("starts empty, asking for a first client, lead, project and task", async () => {
    const a = await owner("Empty");
    const dashboard = await getDashboard(db, a, TODAY);
    expect(dashboard.counts).toEqual({
      activeClients: 0,
      openLeads: 0,
      openProjects: 0,
      onHoldProjects: 0,
      pendingTasks: 0,
      overdueTasks: 0,
    });
    expect(dashboard.started).toEqual({ client: false, lead: false, project: false, task: false });
    expect(dashboard.conversion.rate).toBeNull();
    expect(dashboard.deadlines).toEqual([]);
    expect(dashboard.weekly.every((week) => week.count === 0)).toBe(true);
  });

  it("counts exactly what the workspace holds, and nothing of another", async () => {
    const [a, b] = [await owner("A"), await owner("B")];

    // Clients: 2 active, 1 inactive, 1 archived.
    must(await createClient(db, a, { name: "Active 1 (sample)" }));
    must(await createClient(db, a, { name: "Active 2 (sample)" }));
    must(await createClient(db, a, { name: "Inactive (sample)", status: "INACTIVE" }));
    const archived = must(await createClient(db, a, { name: "Archived (sample)" }));
    await setClientArchived(db, a, archived.id, true);

    // Leads: 1 new, 1 contacted, 1 qualified, 1 won by conversion, 2 lost.
    for (const status of ["NEW", "CONTACTED", "QUALIFIED", "LOST", "LOST"]) {
      must(await createLead(db, a, { contactName: `${status} (sample)`, status }));
    }
    const winner = must(await createLead(db, a, { contactName: "Winner (sample)" }));
    must(await convertLead(db, a, winner.id)); // also adds an active client

    // Projects: planning, in progress and on hold are open; completed isn't.
    const website = must(
      await createProject(db, a, {
        name: "Website (sample)",
        status: "IN_PROGRESS",
        dueDate: "2026-10-20",
      }),
    );
    must(
      await createProject(db, a, {
        name: "Plan (sample)",
        status: "PLANNING",
        dueDate: "2026-11-30",
      }),
    );
    must(
      await createProject(db, a, {
        name: "Paused (sample)",
        status: "ON_HOLD",
        dueDate: "2026-10-01",
      }),
    );
    must(
      await createProject(db, a, {
        name: "Done (sample)",
        status: "COMPLETED",
        dueDate: "2026-10-02",
      }),
    );

    // Tasks: 3 pending (one overdue, one today), 2 done this week.
    must(
      await createTask(db, a, {
        title: "Late (sample)",
        dueDate: "2026-10-10",
        projectId: website.id,
      }),
    );
    must(await createTask(db, a, { title: "Today (sample)", dueDate: TODAY }));
    must(await createTask(db, a, { title: "Later (sample)", dueDate: "2026-12-01" }));
    const t1 = must(await createTask(db, a, { title: "Finished 1 (sample)" }));
    const t2 = must(await createTask(db, a, { title: "Finished 2 (sample)" }));
    await setTaskDone(db, a, t1.id, true);
    await setTaskDone(db, a, t2.id, true);

    // B's data must not show up in A's numbers.
    must(await createClient(db, b, { name: "B client (sample)" }));
    must(await createLead(db, b, { contactName: "B lead (sample)" }));
    must(await createTask(db, b, { title: "B late (sample)", dueDate: "2026-10-01" }));

    const dashboard = await getDashboard(db, a, TODAY);
    expect(dashboard.counts).toEqual({
      activeClients: 3, // 2 + the one converted from a lead
      openLeads: 3,
      openProjects: 3,
      onHoldProjects: 1,
      pendingTasks: 3,
      overdueTasks: 1,
    });
    expect(dashboard.funnel).toEqual([
      { status: "NEW", count: 1 },
      { status: "CONTACTED", count: 1 },
      { status: "QUALIFIED", count: 1 },
      { status: "WON", count: 1 },
      { status: "LOST", count: 2 },
    ]);
    expect(dashboard.conversion).toMatchObject({ won: 1, lost: 2, rate: 33 });
    expect(dashboard.started).toEqual({ client: true, lead: true, project: true, task: true });

    // Deadlines: unfinished work due by 30 Oct, overdue first. Completed
    // projects, later dates and other workspaces are left out.
    expect(
      dashboard.deadlines.map((deadline) => [deadline.kind, deadline.name, deadline.due]),
    ).toEqual([
      ["project", "Paused (sample)", "2026-10-01"],
      ["task", "Late (sample)", "2026-10-10"],
      ["task", "Today (sample)", "2026-10-16"],
      ["project", "Website (sample)", "2026-10-20"],
    ]);
    expect(dashboard.deadlines[1]?.context).toBe("Website (sample)");

    // Both completions are in a recent week (whatever today's real date is,
    // they happened during this test run).
    expect(dashboard.weekly).toHaveLength(8);

    const bDashboard = await getDashboard(db, b, TODAY);
    expect(bDashboard.counts).toMatchObject({
      activeClients: 1,
      openLeads: 1,
      pendingTasks: 1,
      overdueTasks: 1,
    });
  });

  it("counts completed tasks by week on the workspace's calendar", async () => {
    const a = await owner("Weeks", "Asia/Tokyo");
    const task = must(await createTask(db, a, { title: "Old one (sample)" }));
    // Completed on Sunday 11 Oct at 20:00 UTC: Monday 12 Oct 05:00 in Tokyo.
    await db.task.update({
      where: { id: task.id },
      data: { status: "DONE", completedAt: new Date("2026-10-11T20:00:00Z") },
    });
    const dashboard = await getDashboard(db, a, TODAY);
    expect(dashboard.weekly.at(-1)).toEqual({ weekStart: "2026-10-12", count: 1 });
    expect(dashboard.weekly.at(-2)).toEqual({ weekStart: "2026-10-05", count: 0 });
  });
});

describe("trends", () => {
  it("counts what was added each week, this week last, and only the workspace's own", async () => {
    const [a, b] = [await owner("Trends A"), await owner("Trends B")];
    const today = todayIn("UTC");
    for (const name of ["One (sample)", "Two (sample)"]) {
      if (!(await createClient(db, a, { name })).ok) throw new Error("client");
    }
    if (!(await createLead(db, a, { contactName: "Lead (sample)" })).ok) throw new Error("lead");
    if (!(await createClient(db, b, { name: "B's client (sample)" })).ok) throw new Error("b");

    const { trends } = await getDashboard(db, a, today);
    expect(trends.clients).toEqual([0, 0, 0, 0, 0, 0, 0, 2]);
    expect(trends.leads).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
    expect(trends.projects).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(trends.tasks).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe("activity", () => {
  it("lists what happened, newest first, with links only to records that exist", async () => {
    const [a, b] = [await owner("A"), await owner("B")];
    const kept = must(await createClient(db, a, { name: "Kept (sample)" }));
    const gone = must(await createClient(db, a, { name: "Gone (sample)" }));
    await deleteClient(db, a, gone.id);
    must(await createLead(db, a, { contactName: "Lead (sample)" }));
    must(await createClient(db, b, { name: "Not mine (sample)" }));

    const all = await listActivity(db, a, { type: "all", page: 1 });
    expect(all.items.map((item) => item.summary)).toEqual([
      "Added lead Lead (sample)",
      "Deleted Gone (sample)",
      "Added Gone (sample)",
      "Added Kept (sample)",
    ]);
    expect(all.items.every((item) => item.actor === "A (sample)")).toBe(true);
    const link = (summary: string) => all.items.find((item) => item.summary === summary)?.href;
    expect(link("Added Kept (sample)")).toBe(`/clients/${kept.id}`);
    expect(link("Added Gone (sample)")).toBeNull();

    const leadsOnly = await listActivity(db, a, { type: "lead", page: 1 });
    expect(leadsOnly.total).toBe(1);
    const paged = await listActivity(db, a, { type: "all", page: 2, perPage: 3 });
    expect(paged.items.map((item) => item.summary)).toEqual(["Added Kept (sample)"]);
  });
});
