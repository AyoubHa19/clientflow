import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { todayIn } from "@/lib/dates";
import { createPrismaClient, type Db } from "@/server/db/client";
import { seedSampleWorkspace } from "@/server/sample/seed";
import { getTestDatabaseUrl } from "@/test/test-database";
import { createWorkspace } from "@/server/workspace/service";
import { canStartDemo, cleanUpDemos, DEMO_DOMAIN, DEMOS_PER_HOUR, isDemoEmail } from "./service";

// Stage 13: "Try the demo".

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

async function account(email: string, createdAt = new Date()) {
  const id = randomUUID();
  userIds.push(id);
  const user = await db.user.create({ data: { id, name: "Demo visitor", email, createdAt } });
  const workspace = await createWorkspace(db, id, { name: "Demo Studio", timezone: "UTC" });
  if (!workspace.ok) throw new Error(workspace.message);
  return { user, workspace: workspace.value };
}

describe("demo accounts", () => {
  it("knows a demo address", () => {
    expect(isDemoEmail(`visitor-1@${DEMO_DOMAIN}`)).toBe(true);
    expect(isDemoEmail(`Visitor-1@${DEMO_DOMAIN.toUpperCase()}`)).toBe(true);
    expect(isDemoEmail("sara@example.com")).toBe(false);
    expect(isDemoEmail(`sara@not-${DEMO_DOMAIN}`)).toBe(false);
  });

  it("deletes demos older than a day with their workspaces, and nothing else", async () => {
    // A fixed "now" far in the future, so only these test accounts are old.
    const now = new Date("2100-01-02T12:00:00Z");
    const old = await account(
      `visitor-${randomUUID()}@${DEMO_DOMAIN}`,
      new Date("2100-01-01T11:00:00Z"),
    );
    const fresh = await account(
      `visitor-${randomUUID()}@${DEMO_DOMAIN}`,
      new Date("2100-01-02T10:00:00Z"),
    );
    const real = await account(
      `real-${randomUUID()}@example.com`,
      new Date("2100-01-01T00:00:00Z"),
    );

    expect(await cleanUpDemos(db, now)).toBeGreaterThanOrEqual(1);
    expect(await db.user.findUnique({ where: { id: old.user.id } })).toBeNull();
    expect(await db.workspace.findUnique({ where: { id: old.workspace.id } })).toBeNull();
    expect(await db.user.findUnique({ where: { id: fresh.user.id } })).not.toBeNull();
    expect(await db.user.findUnique({ where: { id: real.user.id } })).not.toBeNull();
    // Tidy up the future accounts.
    await cleanUpDemos(db, new Date("2100-01-04T00:00:00Z"));
  });

  it(`allows ${DEMOS_PER_HOUR} new demos an hour`, async () => {
    const now = new Date("2101-06-01T12:00:00Z");
    const inTheHour = new Date("2101-06-01T11:30:00Z");
    const ids = Array.from({ length: DEMOS_PER_HOUR }, () => randomUUID());
    userIds.push(...ids);
    expect(await canStartDemo(db, now)).toBe(true);
    await db.user.createMany({
      data: ids.map((id) => ({
        id,
        name: "Demo visitor",
        email: `visitor-${id}@${DEMO_DOMAIN}`,
        createdAt: inTheHour,
      })),
    });
    expect(await canStartDemo(db, now)).toBe(false);
    // An hour and more later, room again.
    expect(await canStartDemo(db, new Date("2101-06-01T12:31:00Z"))).toBe(true);
  });
});

describe("the sample data", () => {
  it("fills a workspace through the app's rules", async () => {
    const { user, workspace } = await account(`seed-${randomUUID()}@example.com`);
    await seedSampleWorkspace(
      db,
      { user: { id: user.id, name: user.name, email: user.email }, workspace, role: "OWNER" },
      todayIn("UTC"),
    );
    const where = { workspaceId: workspace.id };
    const [clients, leads, projects, tasks, time] = await Promise.all([
      db.client.count({ where }),
      db.lead.count({ where }),
      db.project.count({ where }),
      db.task.count({ where }),
      db.timeEntry.aggregate({ where, _sum: { minutes: true } }),
    ]);
    // 6 clients plus the one converted from a lead; 8 leads; 5 projects;
    // 11 tasks; 18h + 30h + 10h of time.
    expect({ clients, leads, projects, tasks, minutes: time._sum.minutes }).toEqual({
      clients: 7,
      leads: 8,
      projects: 5,
      tasks: 11,
      minutes: 58 * 60,
    });
  });
});
