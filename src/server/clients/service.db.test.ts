import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseClientListParams } from "@/lib/validation/client";
import { createPrismaClient, type Db } from "@/server/db/client";
import { getTestDatabaseUrl } from "@/test/test-database";
import { createWorkspace, type WorkspaceContext } from "@/server/workspace/service";
import {
  createClient,
  deleteClient,
  getClient,
  listClients,
  setClientArchived,
  updateClient,
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
    data: { id, name: `${label} (sample)`, email: `clients-${id}@example.com` },
  });
  const result = await createWorkspace(db, id, { name: `${label} (sample)`, timezone: "UTC" });
  if (!result.ok) throw new Error(result.message);
  return { user, workspace: result.value, role: "OWNER" };
}

const params = (query: Record<string, string> = {}) => parseClientListParams(query);

async function addClient(ctx: WorkspaceContext, name: string, extra: Record<string, string> = {}) {
  const result = await createClient(db, ctx, { name, ...extra });
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

describe("creating and editing", () => {
  it("creates a client with tidy values and logs it", async () => {
    const a = await owner("A");
    const client = await addClient(a, "  Atlas Café (sample) ", {
      email: " Hello@Atlas.MA ",
      phone: "+212 6 12 34 56 78",
      company: "",
      notes: "",
    });

    expect(client).toMatchObject({
      name: "Atlas Café (sample)",
      email: "hello@atlas.ma",
      phone: "+212 6 12 34 56 78",
      company: null,
      notes: null,
      status: "ACTIVE",
    });
    const activity = await db.activity.findFirst({ where: { entityId: client.id } });
    expect(activity).toMatchObject({
      workspaceId: a.workspace.id,
      actorId: a.user.id,
      entityType: "CLIENT",
      action: "CREATED",
      summary: "Added Atlas Café (sample)",
    });
  });

  it("explains invalid input and saves nothing", async () => {
    const a = await owner("A");
    const result = await createClient(db, a, {
      name: "",
      email: "not-an-email",
      phone: "call me",
      status: "VIP",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors ?? {}).sort()).toEqual(["email", "name", "phone", "status"]);
    }
    expect(await db.client.count({ where: { workspaceId: a.workspace.id } })).toBe(0);
  });

  it("ignores a workspace id sent with the form", async () => {
    const [a, b] = [await owner("A"), await owner("B")];
    const result = await createClient(db, a, {
      name: "Sneaky (sample)",
      workspaceId: b.workspace.id,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const saved = await db.client.findUniqueOrThrow({ where: { id: result.value.id } });
      expect(saved.workspaceId).toBe(a.workspace.id);
    }
  });

  it("updates, archives and restores", async () => {
    const a = await owner("A");
    const client = await addClient(a, "Nour (sample)");

    const updated = await updateClient(db, a, client.id, {
      name: "Nour Architects (sample)",
      company: "Nour SARL",
      status: "INACTIVE",
    });
    expect(updated.ok && updated.value).toMatchObject({
      name: "Nour Architects (sample)",
      status: "INACTIVE",
    });

    const archived = await setClientArchived(db, a, client.id, true);
    expect(archived.ok && archived.value.status).toBe("ARCHIVED");
    const restored = await setClientArchived(db, a, client.id, false);
    expect(restored.ok && restored.value.status).toBe("ACTIVE");

    const actions = await db.activity.findMany({
      where: { entityId: client.id },
      orderBy: { createdAt: "asc" },
      select: { action: true },
    });
    expect(actions.map((row) => row.action)).toEqual([
      "CREATED",
      "UPDATED",
      "ARCHIVED",
      "STATUS_CHANGED",
    ]);
  });

  it("deletes for good, keeping the activity log", async () => {
    const a = await owner("A");
    const client = await addClient(a, "Gone (sample)");
    const result = await deleteClient(db, a, client.id);
    expect(result.ok).toBe(true);
    expect(await getClient(db, a, client.id)).toBeNull();
    const deleted = await db.activity.findFirst({
      where: { entityId: client.id, action: "DELETED" },
    });
    expect(deleted?.summary).toBe("Deleted Gone (sample)");
  });

  it("lets only owners delete", async () => {
    const a = await owner("A");
    const client = await addClient(a, "Kept (sample)");
    const member: WorkspaceContext = { ...a, role: "MEMBER" };
    const result = await deleteClient(db, member, client.id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(await getClient(db, a, client.id)).not.toBeNull();
  });
});

describe("workspace isolation", () => {
  it("never shows, changes or deletes another workspace's client", async () => {
    const [a, b] = [await owner("A"), await owner("B")];
    const bClient = await addClient(b, "B's client (sample)");

    expect(await getClient(db, a, bClient.id)).toBeNull();
    const update = await updateClient(db, a, bClient.id, { name: "Hijacked (sample)" });
    const archive = await setClientArchived(db, a, bClient.id, true);
    const remove = await deleteClient(db, a, bClient.id);
    for (const result of [update, archive, remove]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("NOT_FOUND");
    }

    const untouched = await db.client.findUniqueOrThrow({ where: { id: bClient.id } });
    expect(untouched).toMatchObject({ name: "B's client (sample)", status: "ACTIVE" });
    expect((await listClients(db, a, params({ status: "all" }))).total).toBe(0);
  });

  it("treats a malformed id as not found", async () => {
    const a = await owner("A");
    expect(await getClient(db, a, "not-a-uuid")).toBeNull();
    const result = await updateClient(db, a, "1 OR 1=1", { name: "X" });
    expect(result.ok).toBe(false);
  });
});

describe("unusual input", () => {
  // Server Actions can be called with any values, not just what the forms send.
  it("explains text with a null character instead of crashing", async () => {
    const a = await owner("Null character");
    const result = await createClient(db, a, { name: "Atlas\u0000Café (sample)" });
    expect(result).toMatchObject({ ok: false, code: "INVALID" });
    expect(await db.client.count({ where: { workspaceId: a.workspace.id } })).toBe(0);
  });

  it("searches safely with a null character in the address", async () => {
    const a = await owner("Null search");
    await addClient(a, "Atlas Café (sample)");
    const page = await listClients(db, a, parseClientListParams({ q: "Atlas\u0000" }));
    expect(page.items.map((client) => client.name)).toEqual(["Atlas Café (sample)"]);
  });

  it("archives only with a real true or false", async () => {
    const a = await owner("Archive flag");
    const client = await addClient(a, "Atlas Café (sample)");
    for (const value of ["false", 1, null, undefined]) {
      const result = await setClientArchived(db, a, client.id, value as unknown as boolean);
      expect(result).toMatchObject({ ok: false, code: "INVALID" });
    }
    expect((await getClient(db, a, client.id))?.status).toBe("ACTIVE");
  });
});

describe("the list", () => {
  it("searches, filters, sorts and pages", async () => {
    const a = await owner("A");
    for (let n = 1; n <= 23; n++) {
      await addClient(a, `Client ${String(n).padStart(2, "0")} (sample)`);
    }
    await addClient(a, "Zed Studio (sample)", { company: "Atlas Group", email: "zed@studio.ma" });
    const archived = await addClient(a, "Old Atlas (sample)");
    await setClientArchived(db, a, archived.id, true);

    // Default: active and inactive, 20 a page, newest change first.
    const first = await listClients(db, a, params());
    expect(first.total).toBe(24);
    expect(first.items).toHaveLength(20);
    expect(first.pageCount).toBe(2);
    expect(first.items[0]?.name).toBe("Zed Studio (sample)");

    const second = await listClients(db, a, params({ page: "2" }));
    expect(second.items).toHaveLength(4);

    // Past the end: the last page.
    expect((await listClients(db, a, params({ page: "99" }))).page).toBe(2);

    const byName = await listClients(db, a, params({ sort: "name" }));
    expect(byName.items[0]?.name).toBe("Client 01 (sample)");

    // Search covers name, company and email, any case; archived stays hidden.
    const atlas = await listClients(db, a, params({ q: "ATLAS" }));
    expect(atlas.items.map((client) => client.name)).toEqual(["Zed Studio (sample)"]);
    const atlasAll = await listClients(db, a, params({ q: "atlas", status: "all" }));
    expect(atlasAll.total).toBe(2);
    expect((await listClients(db, a, params({ q: "zed@studio" }))).total).toBe(1);

    const onlyArchived = await listClients(db, a, params({ status: "archived" }));
    expect(onlyArchived.items.map((client) => client.name)).toEqual(["Old Atlas (sample)"]);
  });
});
