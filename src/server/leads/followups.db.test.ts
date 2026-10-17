import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { todayIn } from "@/lib/dates";
import { addDays } from "@/lib/followups";
import { parseLeadListParams } from "@/lib/validation/lead";
import { createPrismaClient, type Db } from "@/server/db/client";
import { getTestDatabaseUrl } from "@/test/test-database";
import { createWorkspace, type WorkspaceContext } from "@/server/workspace/service";
import { createLead, followUps, listLeads, logContact, setLeadStatus, updateLead } from "./service";

// Stage 14: logging contacts, planning follow-ups, and finding cold leads.

let db: Db;
const userIds: string[] = [];
const today = todayIn("UTC");
const day = (value: string) => new Date(`${value}T00:00:00Z`);

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
    data: { id, name: `${label} (sample)`, email: `follow-ups-${id}@example.com` },
  });
  const result = await createWorkspace(db, id, { name: `${label} (sample)`, timezone: "UTC" });
  if (!result.ok) throw new Error(result.message);
  return { user, workspace: result.value, role: "OWNER" };
}

async function addLead(ctx: WorkspaceContext, contactName: string, extra: object = {}) {
  const result = await createLead(db, ctx, { contactName, ...extra }, today);
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

/** Makes a lead look as if it was added `days` ago. */
async function addedDaysAgo(id: string, days: number) {
  await db.lead.update({ where: { id }, data: { createdAt: day(addDays(today, -days)) } });
}

describe("logging a contact", () => {
  it("records the day, plans the follow-up, moves New to Contacted, and logs the note", async () => {
    const a = await owner("A");
    const lead = await addLead(a, "Nadia (sample)");
    const result = await logContact(
      db,
      a,
      lead.id,
      { contactedOn: today, note: "Sent the quote", nextFollowUpOn: addDays(today, 7) },
      today,
    );
    expect(result.ok && result.value).toMatchObject({
      status: "CONTACTED",
      lastContactedOn: day(today),
      nextFollowUpOn: day(addDays(today, 7)),
    });
    const log = await db.activity.findFirst({ where: { entityId: lead.id, action: "CONTACTED" } });
    expect(log?.summary).toBe("Contacted Nadia (sample): Sent the quote");
  });

  it("an older contact doesn't turn the clock back; an empty follow-up clears it", async () => {
    const a = await owner("A");
    const lead = await addLead(a, "Omar (sample)", { status: "QUALIFIED" });
    await logContact(db, a, lead.id, { contactedOn: today, nextFollowUpOn: today }, today);
    const older = await logContact(
      db,
      a,
      lead.id,
      { contactedOn: addDays(today, -10), nextFollowUpOn: "" },
      today,
    );
    expect(older.ok && older.value).toMatchObject({
      status: "QUALIFIED",
      lastContactedOn: day(today),
      nextFollowUpOn: null,
    });
  });

  it("refuses a day that hasn't happened, a follow-up before the contact, and closed leads", async () => {
    const a = await owner("A");
    const lead = await addLead(a, "Future (sample)");
    const future = await logContact(db, a, lead.id, { contactedOn: addDays(today, 1) }, today);
    expect(!future.ok && future.errors).toEqual({ contactedOn: "This day hasn't happened yet." });
    const early = await logContact(
      db,
      a,
      lead.id,
      { contactedOn: today, nextFollowUpOn: addDays(today, -1) },
      today,
    );
    expect(!early.ok && early.errors).toEqual({
      nextFollowUpOn: "The follow-up can't be before the contact.",
    });

    await setLeadStatus(db, a, lead.id, "LOST");
    const closed = await logContact(db, a, lead.id, { contactedOn: today }, today);
    expect(!closed.ok && closed.code).toBe("CONFLICT");
  });

  it("another workspace's lead is not found", async () => {
    const a = await owner("A");
    const b = await owner("B");
    const lead = await addLead(a, "Private (sample)");
    const result = await logContact(db, b, lead.id, { contactedOn: today }, today);
    expect(!result.ok && result.code).toBe("NOT_FOUND");
    expect(await db.activity.count({ where: { entityId: lead.id, action: "CONTACTED" } })).toBe(0);
  });

  it("the lead form refuses a last contact in the future too", async () => {
    const a = await owner("A");
    const created = await createLead(
      db,
      a,
      { contactName: "Soon (sample)", lastContactedOn: addDays(today, 2) },
      today,
    );
    expect(!created.ok && created.errors).toEqual({
      lastContactedOn: "This day hasn't happened yet.",
    });
    const lead = await addLead(a, "Edit (sample)");
    const updated = await updateLead(
      db,
      a,
      lead.id,
      { contactName: "Edit (sample)", lastContactedOn: today, nextFollowUpOn: addDays(today, 3) },
      today,
    );
    expect(updated.ok && updated.value.nextFollowUpOn).toEqual(day(addDays(today, 3)));
  });
});

describe("finding who to follow up", () => {
  it("sorts leads into due, cold and planned, open leads only, in the caller's workspace", async () => {
    const a = await owner("A");
    const b = await owner("B");
    const late = await addLead(a, "Late (sample)", { nextFollowUpOn: addDays(today, -2) });
    const dueToday = await addLead(a, "Today (sample)", { nextFollowUpOn: today });
    await addLead(a, "Planned (sample)", { nextFollowUpOn: addDays(today, 5) });
    const cold = await addLead(a, "Cold (sample)");
    await addedDaysAgo(cold.id, 30);
    // Contacted 20 days ago, added long before: cold too.
    const coldContacted = await addLead(a, "Quiet (sample)", {
      lastContactedOn: addDays(today, -20),
    });
    await addedDaysAgo(coldContacted.id, 60);
    // Added 13 days ago: not cold yet.
    const fresh = await addLead(a, "Fresh (sample)");
    await addedDaysAgo(fresh.id, 13);
    // Closed leads never show, even with an old follow-up.
    const won = await addLead(a, "Won (sample)", {
      status: "WON",
      nextFollowUpOn: addDays(today, -9),
    });
    await addedDaysAgo(won.id, 90);
    // Another workspace's due lead stays there.
    await addLead(b, "Theirs (sample)", { nextFollowUpOn: today });

    const result = await followUps(db, a, today);
    expect(result.due.map((lead) => lead.id)).toEqual([late.id, dueToday.id]);
    expect(result.dueTotal).toBe(2);
    // Never contacted first, then the longest ago.
    expect(result.cold.map((lead) => lead.id)).toEqual([cold.id, coldContacted.id]);
    expect(result.coldTotal).toBe(2);

    const list = async (followUp: string) =>
      (
        await listLeads(
          db,
          a,
          parseLeadListParams({ view: "list", followUp, sort: "followUp" }),
          today,
        )
      ).items.map((lead) => lead.contactName);
    expect(await list("due")).toEqual(["Late (sample)", "Today (sample)"]);
    expect(await list("planned")).toEqual(["Planned (sample)"]);
    expect((await list("cold")).sort()).toEqual(["Cold (sample)", "Quiet (sample)"]);
    // Sorting by follow-up puts the soonest first and unplanned leads last.
    expect((await list("all")).slice(0, 4)).toEqual([
      "Won (sample)",
      "Late (sample)",
      "Today (sample)",
      "Planned (sample)",
    ]);
  });

  it("a search still applies on top of a follow-up filter", async () => {
    const a = await owner("A");
    await addLead(a, "Amal (sample)", { nextFollowUpOn: today, company: "Atlas" });
    await addLead(a, "Badr (sample)", { nextFollowUpOn: today, company: "Nour" });
    const result = await listLeads(
      db,
      a,
      parseLeadListParams({ view: "list", followUp: "due", q: "atlas" }),
      today,
    );
    expect(result.items.map((lead) => lead.contactName)).toEqual(["Amal (sample)"]);
  });
});
