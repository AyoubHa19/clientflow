import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseLeadListParams } from "@/lib/validation/lead";
import { createClient } from "@/server/clients/service";
import { createPrismaClient, type Db } from "@/server/db/client";
import { getTestDatabaseUrl } from "@/test/test-database";
import { createWorkspace, type WorkspaceContext } from "@/server/workspace/service";
import {
  boardLeads,
  convertLead,
  createLead,
  deleteLead,
  findMatchingClient,
  getLead,
  leadSources,
  listLeads,
  setLeadStatus,
  updateLead,
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
    data: { id, name: `${label} (sample)`, email: `leads-${id}@example.com` },
  });
  const result = await createWorkspace(db, id, { name: `${label} (sample)`, timezone: "UTC" });
  if (!result.ok) throw new Error(result.message);
  return { user, workspace: result.value, role: "OWNER" };
}

async function addLead(
  ctx: WorkspaceContext,
  contactName: string,
  extra: Record<string, string> = {},
) {
  const result = await createLead(db, ctx, { contactName, ...extra });
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

describe("leads", () => {
  it("creates a lead as New with tidy values, and logs it", async () => {
    const a = await owner("A");
    const lead = await addLead(a, " Karim Benali (sample) ", {
      company: "Riad Yasmine",
      email: "Karim@Riad.example",
      source: "Referral",
    });
    expect(lead).toMatchObject({
      contactName: "Karim Benali (sample)",
      email: "karim@riad.example",
      source: "Referral",
      status: "NEW",
      convertedClient: null,
    });
    const log = await db.activity.findFirst({ where: { entityId: lead.id } });
    expect(log).toMatchObject({ entityType: "LEAD", action: "CREATED" });
  });

  it("explains invalid input", async () => {
    const a = await owner("A");
    const result = await createLead(db, a, { contactName: "", email: "x", status: "MAYBE" });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(Object.keys(result.errors ?? {}).sort()).toEqual(["contactName", "email", "status"]);
  });

  it("moves along the pipeline and logs each move", async () => {
    const a = await owner("A");
    const lead = await addLead(a, "Mover (sample)");
    for (const status of ["CONTACTED", "QUALIFIED", "LOST"]) {
      const result = await setLeadStatus(db, a, lead.id, status);
      expect(result.ok && result.value.status).toBe(status);
    }
    expect((await setLeadStatus(db, a, lead.id, "ARCHIVED")).ok).toBe(false);
    const moves = await db.activity.count({
      where: { entityId: lead.id, action: "STATUS_CHANGED" },
    });
    expect(moves).toBe(3);
  });

  it("updates and deletes (owners only)", async () => {
    const a = await owner("A");
    const lead = await addLead(a, "Edit me (sample)");
    const updated = await updateLead(db, a, lead.id, {
      contactName: "Edited (sample)",
      status: "QUALIFIED",
    });
    expect(updated.ok && updated.value).toMatchObject({
      contactName: "Edited (sample)",
      status: "QUALIFIED",
    });

    const asMember = await deleteLead(db, { ...a, role: "MEMBER" }, lead.id);
    expect(asMember.ok).toBe(false);
    expect((await deleteLead(db, a, lead.id)).ok).toBe(true);
    expect(await getLead(db, a, lead.id)).toBeNull();
  });
});

describe("converting a lead into a client", () => {
  it("creates the client, marks the lead won and links them", async () => {
    const a = await owner("A");
    const lead = await addLead(a, "Karim (sample)", {
      company: "Riad Yasmine",
      email: "karim@riad.example",
      phone: "+212 600 00 00 00",
      notes: "Wants a booking site.",
    });

    const result = await convertLead(db, a, lead.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.created).toBe(true);
    expect(result.value.lead).toMatchObject({
      status: "WON",
      convertedClient: { id: result.value.client.id },
    });
    expect(result.value.lead.convertedAt).not.toBeNull();

    const client = await db.client.findUniqueOrThrow({ where: { id: result.value.client.id } });
    expect(client).toMatchObject({
      workspaceId: a.workspace.id,
      name: "Karim (sample)",
      company: "Riad Yasmine",
      email: "karim@riad.example",
      phone: "+212 600 00 00 00",
      notes: "Wants a booking site.",
      status: "ACTIVE",
    });
    const logs = await db.activity.findMany({
      where: { OR: [{ entityId: lead.id }, { entityId: client.id }] },
      select: { entityType: true, action: true },
    });
    expect(logs).toEqual(
      expect.arrayContaining([
        { entityType: "LEAD", action: "CONVERTED" },
        { entityType: "CLIENT", action: "CREATED" },
      ]),
    );
  });

  it("converts only once, and the lead then stays Won", async () => {
    const a = await owner("A");
    const lead = await addLead(a, "Once (sample)");
    expect((await convertLead(db, a, lead.id)).ok).toBe(true);

    const again = await convertLead(db, a, lead.id);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.code).toBe("CONFLICT");

    const moved = await setLeadStatus(db, a, lead.id, "LOST");
    expect(moved.ok).toBe(false);
    const edited = await updateLead(db, a, lead.id, {
      contactName: "Once (sample)",
      status: "NEW",
    });
    expect(edited.ok).toBe(false);
    expect(await db.client.count({ where: { workspaceId: a.workspace.id } })).toBe(1);
  });

  it("makes one client even when converted twice at the same moment", async () => {
    const a = await owner("A");
    const lead = await addLead(a, "Double click (sample)");
    const results = await Promise.all([convertLead(db, a, lead.id), convertLead(db, a, lead.id)]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await db.client.count({ where: { workspaceId: a.workspace.id } })).toBe(1);
  });

  it("links to an existing client with the same email instead of duplicating", async () => {
    const a = await owner("A");
    const existing = await createClient(db, a, {
      name: "Nour Architects (sample)",
      email: "studio@nour.example",
    });
    if (!existing.ok) throw new Error(existing.message);
    const lead = await addLead(a, "Nour again (sample)", { email: "STUDIO@nour.example" });

    const match = await findMatchingClient(db, a, lead);
    expect(match?.id).toBe(existing.value.id);

    const result = await convertLead(db, a, lead.id, { linkClientId: match?.id });
    expect(result.ok && result.value.created).toBe(false);
    expect(result.ok && result.value.client.id).toBe(existing.value.id);
    expect(await db.client.count({ where: { workspaceId: a.workspace.id } })).toBe(1);

    // That client now came from a lead: a second lead can't link to it.
    const other = await addLead(a, "Third (sample)", { email: "studio@nour.example" });
    expect(await findMatchingClient(db, a, other)).toBeNull();
    const second = await convertLead(db, a, other.id, { linkClientId: existing.value.id });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe("CONFLICT");
  });
});

describe("workspace isolation", () => {
  it("offers only the workspace's own lead sources, each once", async () => {
    const [a, b] = [await owner("A"), await owner("B")];
    await addLead(a, "One (sample)", { source: "Instagram" });
    await addLead(a, "Two (sample)", { source: "Instagram" });
    await addLead(a, "Three (sample)", { source: "Event" });
    await addLead(a, "Four (sample)");
    await addLead(b, "B's lead (sample)", { source: "B's secret source" });
    expect(await leadSources(db, a)).toEqual(["Event", "Instagram"]);
    expect(await leadSources(db, b)).toEqual(["B's secret source"]);
  });

  it("never shows, moves, edits, converts or deletes another workspace's lead", async () => {
    const [a, b] = [await owner("A"), await owner("B")];
    const bLead = await addLead(b, "B's lead (sample)");

    expect(await getLead(db, a, bLead.id)).toBeNull();
    const attempts = [
      await setLeadStatus(db, a, bLead.id, "QUALIFIED"),
      await updateLead(db, a, bLead.id, { contactName: "Hijacked (sample)" }),
      await convertLead(db, a, bLead.id),
      await deleteLead(db, a, bLead.id),
    ];
    for (const result of attempts) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("NOT_FOUND");
    }
    const untouched = await db.lead.findUniqueOrThrow({ where: { id: bLead.id } });
    expect(untouched).toMatchObject({
      contactName: "B's lead (sample)",
      status: "NEW",
      convertedClientId: null,
    });
    expect(await db.client.count({ where: { workspaceId: a.workspace.id } })).toBe(0);
  });

  it("can't link a lead to another workspace's client", async () => {
    const [a, b] = [await owner("A"), await owner("B")];
    const bClient = await createClient(db, b, {
      name: "B's client (sample)",
      email: "same@example.com",
    });
    if (!bClient.ok) throw new Error(bClient.message);
    const aLead = await addLead(a, "A's lead (sample)", { email: "same@example.com" });

    expect(await findMatchingClient(db, a, aLead)).toBeNull();
    const result = await convertLead(db, a, aLead.id, { linkClientId: bClient.value.id });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
    expect((await getLead(db, a, aLead.id))?.convertedClient).toBeNull();
  });
});

describe("the list and the board", () => {
  it("filters, searches and groups", async () => {
    const a = await owner("A");
    const statuses = ["NEW", "NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"];
    for (const [n, status] of statuses.entries()) {
      await addLead(a, `Lead ${n} (sample)`, { status, source: n % 2 ? "LinkedIn" : "Website" });
    }
    await addLead(a, "Zara Studio (sample)", { company: "Atlas Group", source: "Referral" });

    const all = await listLeads(db, a, parseLeadListParams({ view: "list" }));
    expect(all.total).toBe(7);
    const open = await listLeads(db, a, parseLeadListParams({ status: "open" }));
    expect(open.total).toBe(5);
    const linkedIn = await listLeads(db, a, parseLeadListParams({ source: "linkedin" }));
    expect(linkedIn.total).toBe(3);
    const atlas = await listLeads(db, a, parseLeadListParams({ q: "ATLAS" }));
    expect(atlas.items.map((lead) => lead.contactName)).toEqual(["Zara Studio (sample)"]);

    const board = await boardLeads(db, a, { q: "", source: "" });
    expect(board.map((column) => [column.status, column.total])).toEqual([
      ["NEW", 3],
      ["CONTACTED", 1],
      ["QUALIFIED", 1],
      ["WON", 1],
      ["LOST", 1],
    ]);
  });
});
