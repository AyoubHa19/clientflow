import { describe, expect, it } from "vitest";
import {
  addDays,
  coldBefore,
  COLD_AFTER_DAYS,
  followUpLabel,
  followUpState,
  lastTouch,
  type FollowUpLead,
} from "./followups";

const today = "2026-10-17";
const lead = (fields: Partial<FollowUpLead>): FollowUpLead => ({
  status: "CONTACTED",
  nextFollowUpOn: null,
  lastContactedOn: null,
  addedOn: "2026-10-15",
  ...fields,
});

describe("followUpState", () => {
  it("counts a planned follow-up against today", () => {
    expect(followUpState(lead({ nextFollowUpOn: "2026-10-14" }), today)).toEqual({
      kind: "overdue",
      days: 3,
    });
    expect(followUpState(lead({ nextFollowUpOn: today }), today)).toEqual({ kind: "today" });
    expect(followUpState(lead({ nextFollowUpOn: "2026-10-18" }), today)).toEqual({
      kind: "scheduled",
      days: 1,
    });
  });

  it("a lead with nothing planned goes cold after 14 days without contact", () => {
    // Added 13 days ago: still fine. 14 days: cold.
    expect(followUpState(lead({ addedOn: "2026-10-04" }), today)).toEqual({ kind: "none" });
    expect(followUpState(lead({ addedOn: "2026-10-03" }), today)).toEqual({
      kind: "cold",
      days: COLD_AFTER_DAYS,
    });
    // A recent contact warms it up again.
    expect(
      followUpState(lead({ addedOn: "2026-09-01", lastContactedOn: "2026-10-10" }), today),
    ).toEqual({ kind: "none" });
    expect(
      followUpState(lead({ addedOn: "2026-09-01", lastContactedOn: "2026-09-20" }), today),
    ).toEqual({ kind: "cold", days: 27 });
  });

  it("a planned follow-up wins over coldness", () => {
    expect(
      followUpState(lead({ addedOn: "2026-01-01", nextFollowUpOn: "2026-10-20" }), today),
    ).toEqual({ kind: "scheduled", days: 3 });
  });

  it("won and lost leads need no follow-up", () => {
    for (const status of ["WON", "LOST"] as const) {
      expect(followUpState(lead({ status, nextFollowUpOn: "2026-10-01" }), today)).toBeNull();
    }
  });
});

describe("dates", () => {
  it("the last touch is the later of the contact and the day it was added", () => {
    expect(lastTouch({ lastContactedOn: null, addedOn: "2026-10-01" })).toBe("2026-10-01");
    expect(lastTouch({ lastContactedOn: "2026-10-09", addedOn: "2026-10-01" })).toBe("2026-10-09");
    // A contact logged before the lead was added doesn't make it older.
    expect(lastTouch({ lastContactedOn: "2026-09-09", addedOn: "2026-10-01" })).toBe("2026-10-01");
  });

  it("adds days across months and years", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("coldBefore matches followUpState", () => {
    const cutoff = coldBefore(today);
    expect(followUpState(lead({ addedOn: cutoff }), today)?.kind).toBe("none");
    expect(followUpState(lead({ addedOn: addDays(cutoff, -1) }), today)?.kind).toBe("cold");
  });
});

describe("followUpLabel", () => {
  it("says each state in words", () => {
    expect(followUpLabel({ kind: "overdue", days: 1 })).toBe("Follow-up 1 day late");
    expect(followUpLabel({ kind: "overdue", days: 4 })).toBe("Follow-up 4 days late");
    expect(followUpLabel({ kind: "today" })).toBe("Follow up today");
    expect(followUpLabel({ kind: "scheduled", days: 1 })).toBe("Follow up tomorrow");
    expect(followUpLabel({ kind: "scheduled", days: 5 })).toBe("Follow up in 5 days");
    expect(followUpLabel({ kind: "cold", days: 20 })).toBe("No contact for 20 days");
    expect(followUpLabel({ kind: "none" })).toBe("No follow-up planned");
  });
});
