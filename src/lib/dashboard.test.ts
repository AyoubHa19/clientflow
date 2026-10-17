import { describe, expect, it } from "vitest";
import {
  addDays,
  conversionRate,
  countByWeek,
  lastWeekStarts,
  relativeTime,
  startOfDayInZone,
  weekStart,
} from "./dashboard";

describe("conversionRate", () => {
  it("is won out of decided leads, rounded", () => {
    expect(conversionRate(1, 2)).toBe(33);
    expect(conversionRate(3, 0)).toBe(100);
  });

  it("has no rate before any lead is decided", () => {
    expect(conversionRate(0, 0)).toBeNull();
  });
});

describe("weeks", () => {
  it("start on Monday", () => {
    expect(weekStart("2026-10-16")).toBe("2026-10-12"); // a Friday
    expect(weekStart("2026-10-12")).toBe("2026-10-12"); // the Monday itself
    expect(weekStart("2026-10-18")).toBe("2026-10-12"); // the Sunday
    expect(weekStart("2026-11-01")).toBe("2026-10-26"); // across a month
  });

  it("lists the last eight Mondays, oldest first", () => {
    const starts = lastWeekStarts("2026-10-16");
    expect(starts).toHaveLength(8);
    expect(starts[0]).toBe("2026-08-24");
    expect(starts.at(-1)).toBe("2026-10-12");
  });

  it("counts days into their week and ignores older ones", () => {
    const starts = lastWeekStarts("2026-10-16", 2); // 5 Oct and 12 Oct
    expect(countByWeek(["2026-10-05", "2026-10-11", "2026-10-16", "2026-09-01"], starts)).toEqual([
      { weekStart: "2026-10-05", count: 2 },
      { weekStart: "2026-10-12", count: 1 },
    ]);
  });

  it("adds days across months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("startOfDayInZone", () => {
  it("is midnight on the zone's clock", () => {
    expect(startOfDayInZone("2026-10-01", "UTC").toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(startOfDayInZone("2026-10-01", "Asia/Tokyo").toISOString()).toBe(
      "2026-09-30T15:00:00.000Z",
    );
    expect(startOfDayInZone("2026-07-01", "Europe/Paris").toISOString()).toBe(
      "2026-06-30T22:00:00.000Z",
    );
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-10-16T15:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const minute = 60_000;

  it("says how long ago, in words", () => {
    expect(relativeTime(ago(20_000), now, "UTC")).toBe("just now");
    expect(relativeTime(ago(minute), now, "UTC")).toBe("1 minute ago");
    expect(relativeTime(ago(45 * minute), now, "UTC")).toBe("45 minutes ago");
    expect(relativeTime(ago(3 * 60 * minute), now, "UTC")).toBe("3 hours ago");
    expect(relativeTime(new Date("2026-10-15T20:00:00Z"), now, "UTC")).toBe("yesterday");
    expect(relativeTime(new Date("2026-10-13T09:00:00Z"), now, "UTC")).toBe("3 days ago");
    expect(relativeTime(new Date("2026-09-01T09:00:00Z"), now, "UTC")).toBe("1 Sept 2026");
  });

  it("counts days on the workspace's calendar", () => {
    // 14:00 UTC is 23:00 in Tokyo. 23:30 UTC the day before was the previous
    // day in UTC, but the same day (08:30) in Tokyo.
    const evening = new Date("2026-10-16T14:00:00Z");
    const late = new Date("2026-10-15T23:30:00Z");
    expect(relativeTime(late, evening, "UTC")).toBe("yesterday");
    expect(relativeTime(late, evening, "Asia/Tokyo")).toBe("15 hours ago");
  });
});
