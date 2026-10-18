import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { todayIn } from "@/lib/dates";
import { parseLeadListParams } from "@/lib/validation/lead";
import { createPrismaClient, type Db } from "@/server/db/client";
import {
  boardLeads,
  convertLead,
  createLead,
  listLeads,
  setLeadStatus,
  updateLead,
} from "@/server/leads/service";
import { clientFees, createProject } from "@/server/projects/service";
import { createClient } from "@/server/clients/service";
import { getTestDatabaseUrl } from "@/test/test-database";
import {
  createWorkspace,
  updateWorkspaceSettings,
  type WorkspaceContext,
} from "@/server/workspace/service";
import { getMoney } from "./service";

// Stage 15: currencies, lead values, project fees and the money on the dashboard.

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

async function owner(label: string, timezone = "UTC"): Promise<WorkspaceContext> {
  const id = randomUUID();
  userIds.push(id);
  const user = await db.user.create({
    data: { id, name: `${label} (sample)`, email: `money-${id}@example.com` },
  });
  const result = await createWorkspace(db, id, { name: `${label} (sample)`, timezone });
  if (!result.ok) throw new Error(result.message);
  return { user, workspace: result.value, role: "OWNER" };
}

function must<T>(result: { ok: true; value: T } | { ok: false; message: string }) {
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

describe("currency", () => {
  it("a new workspace's currency follows its time zone; the owner can change it", async () => {
    const a = await owner("Casablanca", "Africa/Casablanca");
    expect(a.workspace.currency).toBe("MAD");
    const changed = must(
      await updateWorkspaceSettings(db, a, {
        name: "Casablanca (sample)",
        timezone: "Africa/Casablanca",
        currency: "EUR",
      }),
    );
    expect(changed.currency).toBe("EUR");
    const refused = await updateWorkspaceSettings(db, a, {
      name: "Casablanca (sample)",
      timezone: "UTC",
      currency: "BTC",
    });
    expect(!refused.ok && refused.errors).toEqual({ currency: "Choose a currency from the list." });
    const member = await updateWorkspaceSettings(
      db,
      { ...a, role: "MEMBER" },
      { name: "x", timezone: "UTC", currency: "USD" },
    );
    expect(member.ok).toBe(false);
  });
});

describe("lead values and the day they're won", () => {
  it("stores what was typed in minor units, and refuses nonsense", async () => {
    const a = await owner("A");
    const lead = must(await createLead(db, a, { contactName: "Val (sample)", value: "1,500.50" }));
    expect(lead.value).toBe(150050);
    const bad = await createLead(db, a, { contactName: "Bad (sample)", value: "-20" });
    expect(!bad.ok && Object.keys(bad.errors ?? {})).toEqual(["value"]);
    const huge = await createLead(db, a, { contactName: "Huge (sample)", value: "10000000.01" });
    expect(huge.ok).toBe(false);
  });

  it("wonAt is set on Won, kept through edits, and cleared when the lead leaves Won", async () => {
    const a = await owner("A");
    const lead = must(await createLead(db, a, { contactName: "Win (sample)", value: "100" }));
    expect(lead.wonAt).toBeNull();
    const won = must(await setLeadStatus(db, a, lead.id, "WON"));
    expect(won.wonAt).toBeInstanceOf(Date);
    const edited = must(
      await updateLead(db, a, lead.id, {
        contactName: "Win (sample)",
        status: "WON",
        value: "200",
      }),
    );
    expect(edited.wonAt).toEqual(won.wonAt);
    const lost = must(await setLeadStatus(db, a, lead.id, "LOST"));
    expect(lost.wonAt).toBeNull();
    // Created as Won, and converted: both count as won now.
    const direct = must(await createLead(db, a, { contactName: "Direct (sample)", status: "WON" }));
    expect(direct.wonAt).toBeInstanceOf(Date);
    const other = must(await createLead(db, a, { contactName: "Convert (sample)" }));
    const converted = must(await convertLead(db, a, other.id));
    expect(converted.lead.wonAt).toBeInstanceOf(Date);
  });

  it("the list sorts by value; board columns add up every lead", async () => {
    const a = await owner("A");
    await createLead(db, a, { contactName: "Small (sample)", value: "100" });
    await createLead(db, a, { contactName: "Big (sample)", value: "900" });
    await createLead(db, a, { contactName: "None (sample)" });
    const list = await listLeads(db, a, parseLeadListParams({ view: "list", sort: "value" }));
    expect(list.items.map((lead) => lead.contactName)).toEqual([
      "Big (sample)",
      "Small (sample)",
      "None (sample)",
    ]);
    const board = await boardLeads(db, a, { q: "", source: "" });
    expect(board.find((column) => column.status === "NEW")?.value).toBe(100000);
    expect(board.find((column) => column.status === "WON")?.value).toBe(0);
  });
});

describe("the money on the dashboard", () => {
  it("adds open leads, leads won this month and open projects, in this workspace only", async () => {
    const a = await owner("A");
    const b = await owner("B");
    await createLead(db, a, { contactName: "Open (sample)", value: "1000", status: "QUALIFIED" });
    await createLead(db, a, { contactName: "No value (sample)" });
    await createLead(db, a, { contactName: "Lost (sample)", value: "5000", status: "LOST" });
    const winner = must(await createLead(db, a, { contactName: "Won (sample)", value: "2500" }));
    await setLeadStatus(db, a, winner.id, "WON");
    // Won last month: not this month's.
    const old = must(await createLead(db, a, { contactName: "Old win (sample)", value: "700" }));
    await setLeadStatus(db, a, old.id, "WON");
    await db.lead.update({
      where: { id: old.id },
      data: { wonAt: new Date(Date.UTC(2020, 0, 15)) },
    });
    await createProject(db, a, { name: "Open (sample)", fee: "3000", status: "IN_PROGRESS" });
    await createProject(db, a, { name: "Done (sample)", fee: "9999", status: "COMPLETED" });
    // Another workspace's money stays there.
    await createLead(db, b, { contactName: "Theirs (sample)", value: "8000" });

    const money = await getMoney(db, a, today);
    expect(money).toEqual({
      currency: "USD",
      pipeline: { total: 100000, count: 1 },
      wonThisMonth: { total: 250000, count: 1 },
      openProjects: { total: 300000, count: 1 },
    });
  });

  it("a client's fees leave cancelled projects out", async () => {
    const a = await owner("A");
    const client = must(await createClient(db, a, { name: "Client (sample)" }));
    await createProject(db, a, { name: "One (sample)", clientId: client.id, fee: "1000" });
    await createProject(db, a, { name: "Two (sample)", clientId: client.id, fee: "500.25" });
    await createProject(db, a, {
      name: "Cancelled (sample)",
      clientId: client.id,
      fee: "4000",
      status: "CANCELLED",
    });
    await createProject(db, a, { name: "No fee (sample)", clientId: client.id });
    expect(await clientFees(db, a, client.id)).toEqual({ total: 150025, withFee: 2 });
    const b = await owner("B");
    expect(await clientFees(db, b, client.id)).toEqual({ total: 0, withFee: 0 });
  });

  it("the database itself refuses a negative amount", async () => {
    const a = await owner("A");
    const lead = must(await createLead(db, a, { contactName: "Raw (sample)" }));
    await expect(db.lead.update({ where: { id: lead.id }, data: { value: -1 } })).rejects.toThrow();
  });
});
