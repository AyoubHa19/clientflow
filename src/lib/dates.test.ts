import { describe, expect, it } from "vitest";
import { daysBetween, dueState, formatDate, formatDateOnly, todayIn, toDateOnly } from "./dates";

describe("formatDate", () => {
  it("shows a moment on the day it is in the workspace's time zone", () => {
    const lateEvening = new Date("2026-10-16T23:30:00Z");
    expect(formatDate(lateEvening, "UTC")).toBe("16 Oct 2026");
    expect(formatDate(lateEvening, "Asia/Tokyo")).toBe("17 Oct 2026");
    expect(formatDate(lateEvening, "America/Los_Angeles")).toBe("16 Oct 2026");
  });
});

describe("todayIn", () => {
  // 23:30 UTC on 31 December 2026.
  const lateEvening = new Date("2026-12-31T23:30:00Z");

  it("depends on the workspace's time zone", () => {
    expect(todayIn("UTC", lateEvening)).toBe("2026-12-31");
    // Already the next day (and year) further east.
    expect(todayIn("Asia/Tokyo", lateEvening)).toBe("2027-01-01");
    expect(todayIn("Europe/Paris", lateEvening)).toBe("2027-01-01");
    // Still the same day further west.
    expect(todayIn("America/New_York", lateEvening)).toBe("2026-12-31");
  });

  it("follows a time zone's own rules (Casablanca matches what the runtime knows)", () => {
    const noon = new Date("2026-06-15T12:00:00Z");
    expect(todayIn("Africa/Casablanca", noon)).toBe("2026-06-15");
  });
});

describe("calendar days", () => {
  it("reads DATE values in UTC, without shifting them", () => {
    const due = new Date("2026-11-05T00:00:00Z");
    expect(toDateOnly(due)).toBe("2026-11-05");
    expect(formatDateOnly(due)).toBe("5 Nov 2026");
    expect(formatDateOnly("2026-02-28")).toBe("28 Feb 2026");
  });

  it("counts whole days, across months and leap years", () => {
    expect(daysBetween("2026-10-16", "2026-10-20")).toBe(4);
    expect(daysBetween("2026-10-20", "2026-10-16")).toBe(-4);
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });
});

describe("dueState", () => {
  const today = "2026-10-16";

  it("says how a due date stands", () => {
    expect(dueState("2026-10-10", today, false)).toEqual({ kind: "overdue", days: 6 });
    expect(dueState("2026-10-16", today, false)).toEqual({ kind: "today" });
    expect(dueState("2026-10-20", today, false)).toEqual({ kind: "soon", days: 4 });
    expect(dueState("2026-10-23", today, false)).toEqual({ kind: "soon", days: 7 });
    expect(dueState("2026-10-24", today, false)).toEqual({ kind: "later", days: 8 });
  });

  it("says nothing without a due date or for finished work", () => {
    expect(dueState(null, today, false)).toBeNull();
    expect(dueState("2026-01-01", today, true)).toBeNull();
  });
});
