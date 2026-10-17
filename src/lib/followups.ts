import { daysBetween, toDateOnly } from "./dates";
import type { LeadStatus } from "./validation/lead";

// Follow-ups: when to get back to a lead, and which leads have gone cold.
// Shared by the server (the dashboard's list) and the pages (the badges).

/** An open lead nobody has contacted for this many days has gone cold. */
export const COLD_AFTER_DAYS = 14;

/** Leads still in play; won and lost leads need no follow-up. */
export const OPEN_LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED"] as const satisfies LeadStatus[];

export function isOpenLead(status: LeadStatus) {
  return (OPEN_LEAD_STATUSES as readonly LeadStatus[]).includes(status);
}

export type FollowUpState =
  | { kind: "overdue"; days: number }
  | { kind: "today" }
  | { kind: "scheduled"; days: number }
  | { kind: "cold"; days: number }
  | { kind: "none" };

export type FollowUpLead = {
  status: LeadStatus;
  /** Days as "YYYY-MM-DD". */
  nextFollowUpOn: string | null;
  lastContactedOn: string | null;
  /** The day the lead was added: the last touch until someone contacts them. */
  addedOn: string;
};

/**
 * Where a lead stands: a follow-up that's overdue, today or later; or, with
 * none planned, cold once the last touch is COLD_AFTER_DAYS old. Null for
 * won and lost leads.
 */
export function followUpState(lead: FollowUpLead, today: string): FollowUpState | null {
  if (!isOpenLead(lead.status)) return null;
  if (lead.nextFollowUpOn) {
    const days = daysBetween(today, lead.nextFollowUpOn);
    if (days < 0) return { kind: "overdue", days: -days };
    if (days === 0) return { kind: "today" };
    return { kind: "scheduled", days };
  }
  const since = daysBetween(lastTouch(lead), today);
  return since >= COLD_AFTER_DAYS ? { kind: "cold", days: since } : { kind: "none" };
}

/**
 * A lead as stored (DATE columns, the createdAt timestamp) in the shape the
 * rules take. The day it was added is read in UTC, as the server's filters do.
 */
export function asFollowUpLead(lead: {
  status: LeadStatus;
  nextFollowUpOn: Date | null;
  lastContactedOn: Date | null;
  createdAt: Date;
}): FollowUpLead {
  return {
    status: lead.status,
    nextFollowUpOn: lead.nextFollowUpOn && toDateOnly(lead.nextFollowUpOn),
    lastContactedOn: lead.lastContactedOn && toDateOnly(lead.lastContactedOn),
    addedOn: toDateOnly(lead.createdAt),
  };
}

/** The last time the lead was touched: contacted, or else added. */
export function lastTouch(lead: Pick<FollowUpLead, "lastContactedOn" | "addedOn">) {
  return lead.lastContactedOn && lead.lastContactedOn > lead.addedOn
    ? lead.lastContactedOn
    : lead.addedOn;
}

/** A last touch before this day is COLD_AFTER_DAYS or more ago: the lead is cold. */
export function coldBefore(today: string) {
  return addDays(today, 1 - COLD_AFTER_DAYS);
}

/** A day `days` after `day` ("YYYY-MM-DD"); negative for before. */
export function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The quick choices for the next follow-up, in days from the contact. */
export const FOLLOW_UP_CHOICES = [
  { label: "In 3 days", days: 3 },
  { label: "In a week", days: 7 },
  { label: "In 2 weeks", days: 14 },
  { label: "In a month", days: 30 },
] as const;

/** Short words for a state: "Follow up today", "Cold for 20 days"... */
export function followUpLabel(state: FollowUpState) {
  switch (state.kind) {
    case "overdue":
      return `Follow-up ${state.days} ${state.days === 1 ? "day" : "days"} late`;
    case "today":
      return "Follow up today";
    case "scheduled":
      return state.days === 1 ? "Follow up tomorrow" : `Follow up in ${state.days} days`;
    case "cold":
      return `No contact for ${state.days} days`;
    case "none":
      return "No follow-up planned";
  }
}
