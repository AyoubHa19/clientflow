import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { getTestDatabaseUrl } from "@/test/test-database";
import { createPrismaClient, type Db } from "./client";

// These tests run against Neon's test branch, migrated by
// src/test/db-global-setup.ts. Every record is named "(sample)", and the
// ones made here are deleted at the end (deleting a workspace removes
// everything in it).

let db: Db;
const createdUserIds: string[] = [];
const createdWorkspaceIds: string[] = [];

beforeAll(() => {
  db = createPrismaClient(getTestDatabaseUrl());
});

afterAll(async () => {
  await db.workspace.deleteMany({ where: { id: { in: createdWorkspaceIds } } });
  await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await db.$disconnect();
});

async function makeUser() {
  const id = randomUUID();
  createdUserIds.push(id);
  return db.user.create({
    data: { id, name: "Sara (sample)", email: `sara-${id}@example.com` },
  });
}

async function makeWorkspace() {
  const user = await makeUser();
  const workspace = await db.workspace.create({
    data: {
      name: "Studio (sample)",
      memberships: { create: { userId: user.id } },
    },
  });
  createdWorkspaceIds.push(workspace.id);
  return { user, workspace };
}

/** The Prisma error code a promise fails with, e.g. "P2002". */
async function errorCode(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
    throw error;
  }
  throw new Error("Expected the query to fail");
}

describe("migrations", () => {
  it("created every table", async () => {
    const rows = await db.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
      ORDER BY table_name`;
    expect(rows.map((row) => row.table_name)).toEqual([
      "activities",
      "clients",
      "leads",
      "projects",
      "tasks",
      "users",
      "workspace_memberships",
      "workspaces",
    ]);
  });
});

describe("defaults", () => {
  it("fills in ids, statuses and the time zone", async () => {
    const { workspace } = await makeWorkspace();
    const client = await db.client.create({
      data: { workspaceId: workspace.id, name: "Acme (sample)" },
    });
    const lead = await db.lead.create({
      data: { workspaceId: workspace.id, contactName: "Omar (sample)" },
    });
    const task = await db.task.create({
      data: { workspaceId: workspace.id, title: "Send the quote (sample)" },
    });
    const project = await db.project.create({
      data: { workspaceId: workspace.id, name: "Website (sample)" },
    });

    // UUID version 7: the 13th hex digit is "7".
    expect(workspace.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-/);
    expect(workspace.timezone).toBe("UTC");
    expect(client.status).toBe("ACTIVE");
    expect(lead.status).toBe("NEW");
    expect(project.status).toBe("PLANNING");
    expect(task.status).toBe("TODO");
    expect(task.priority).toBe("MEDIUM");
    expect(task.completedAt).toBeNull();
  });

  it("makes the creator an owner", async () => {
    const { user, workspace } = await makeWorkspace();
    const membership = await db.workspaceMembership.findUniqueOrThrow({
      where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    });
    expect(membership.role).toBe("OWNER");
  });
});

describe("constraints", () => {
  it("refuses the same person twice in a workspace", async () => {
    const { user, workspace } = await makeWorkspace();
    await expect(
      errorCode(
        db.workspaceMembership.create({ data: { userId: user.id, workspaceId: workspace.id } }),
      ),
    ).resolves.toBe("P2002");
  });

  it("refuses two users with the same email", async () => {
    const user = await makeUser();
    await expect(
      errorCode(
        db.user.create({ data: { id: randomUUID(), name: "Copy (sample)", email: user.email } }),
      ),
    ).resolves.toBe("P2002");
  });

  it("never lets two leads become the same client", async () => {
    const { workspace } = await makeWorkspace();
    const client = await db.client.create({
      data: { workspaceId: workspace.id, name: "Acme (sample)" },
    });
    await db.lead.create({
      data: {
        workspaceId: workspace.id,
        contactName: "First (sample)",
        status: "WON",
        convertedClientId: client.id,
        convertedAt: new Date(),
      },
    });
    await expect(
      errorCode(
        db.lead.create({
          data: {
            workspaceId: workspace.id,
            contactName: "Second (sample)",
            convertedClientId: client.id,
          },
        }),
      ),
    ).resolves.toBe("P2002");
  });

  it("refuses a record in a workspace that doesn't exist", async () => {
    await expect(
      errorCode(db.client.create({ data: { workspaceId: randomUUID(), name: "Orphan (sample)" } })),
    ).resolves.toBe("P2003");
  });

  it("caps text lengths in the database too", async () => {
    const { workspace } = await makeWorkspace();
    await expect(
      errorCode(db.client.create({ data: { workspaceId: workspace.id, name: "x".repeat(201) } })),
    ).resolves.toBe("P2000");
  });
});

describe("deleting", () => {
  it("removes everything in a workspace with it, but not its people", async () => {
    const { user, workspace } = await makeWorkspace();
    const client = await db.client.create({
      data: { workspaceId: workspace.id, name: "Acme (sample)" },
    });
    const project = await db.project.create({
      data: { workspaceId: workspace.id, clientId: client.id, name: "Website (sample)" },
    });
    await db.task.create({
      data: { workspaceId: workspace.id, projectId: project.id, title: "Draft (sample)" },
    });
    await db.lead.create({ data: { workspaceId: workspace.id, contactName: "Omar (sample)" } });
    await db.activity.create({
      data: {
        workspaceId: workspace.id,
        actorId: user.id,
        entityType: "CLIENT",
        entityId: client.id,
        action: "CREATED",
        summary: "Added Acme (sample)",
      },
    });

    await db.workspace.delete({ where: { id: workspace.id } });

    const where = { workspaceId: workspace.id };
    expect(await db.client.count({ where })).toBe(0);
    expect(await db.project.count({ where })).toBe(0);
    expect(await db.task.count({ where })).toBe(0);
    expect(await db.lead.count({ where })).toBe(0);
    expect(await db.activity.count({ where })).toBe(0);
    expect(await db.workspaceMembership.count({ where })).toBe(0);
    expect(await db.user.findUnique({ where: { id: user.id } })).not.toBeNull();
  });

  it("keeps a client's projects and its lead, without the link", async () => {
    const { workspace } = await makeWorkspace();
    const client = await db.client.create({
      data: { workspaceId: workspace.id, name: "Acme (sample)" },
    });
    const project = await db.project.create({
      data: { workspaceId: workspace.id, clientId: client.id, name: "Website (sample)" },
    });
    const lead = await db.lead.create({
      data: {
        workspaceId: workspace.id,
        contactName: "Omar (sample)",
        convertedClientId: client.id,
      },
    });

    await db.client.delete({ where: { id: client.id } });

    expect((await db.project.findUniqueOrThrow({ where: { id: project.id } })).clientId).toBeNull();
    expect(
      (await db.lead.findUniqueOrThrow({ where: { id: lead.id } })).convertedClientId,
    ).toBeNull();
  });

  it("keeps a project's tasks, without the project", async () => {
    const { workspace } = await makeWorkspace();
    const project = await db.project.create({
      data: { workspaceId: workspace.id, name: "Website (sample)" },
    });
    const task = await db.task.create({
      data: { workspaceId: workspace.id, projectId: project.id, title: "Draft (sample)" },
    });

    await db.project.delete({ where: { id: project.id } });

    expect((await db.task.findUniqueOrThrow({ where: { id: task.id } })).projectId).toBeNull();
  });

  it("keeps the activity log when a person is deleted", async () => {
    const { user, workspace } = await makeWorkspace();
    const activity = await db.activity.create({
      data: {
        workspaceId: workspace.id,
        actorId: user.id,
        entityType: "TASK",
        entityId: randomUUID(),
        action: "COMPLETED",
        summary: "Completed Draft (sample)",
      },
    });

    await db.user.delete({ where: { id: user.id } });

    const kept = await db.activity.findUniqueOrThrow({ where: { id: activity.id } });
    expect(kept.actorId).toBeNull();
    expect(await db.workspaceMembership.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe("dates", () => {
  it("stores a due date as the calendar day, whatever the time zone", async () => {
    const { workspace } = await makeWorkspace();
    const task = await db.task.create({
      data: {
        workspaceId: workspace.id,
        title: "Year-end (sample)",
        dueDate: new Date("2026-12-31"),
      },
    });
    const [row] = await db.$queryRaw<{ due: string }[]>`
      SELECT "dueDate"::text AS due FROM tasks WHERE id = ${task.id}::uuid`;
    expect(row?.due).toBe("2026-12-31");
    expect(task.dueDate?.toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });
});
