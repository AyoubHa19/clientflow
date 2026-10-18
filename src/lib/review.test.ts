import { describe, expect, it } from "vitest";
import { comparedWithLastWeek, isReviewTime, parseWeekParam, weekLabel } from "./review";
import { formatDuration } from "./time";

// 2026-10-18 is a Sunday; its week started on Monday 2026-10-12.
const today = "2026-10-18";

describe("parseWeekParam", () => {
  it("any day picks its Monday; nothing or nonsense is this week", () => {
    expect(parseWeekParam(undefined, today)).toBe("2026-10-12");
    expect(parseWeekParam("2026-10-08", today)).toBe("2026-10-05");
    expect(parseWeekParam("2026-10-05", today)).toBe("2026-10-05");
    for (const bad of ["", "soon", "2026-13-01", "2026-02-30", "1999-01-04", ["x"]]) {
      expect(parseWeekParam(bad, today)).toBe("2026-10-12");
    }
  });

  it("the future isn't reviewed: it falls back to this week", () => {
    expect(parseWeekParam("2026-10-19", today)).toBe("2026-10-12");
    expect(parseWeekParam("2030-01-01", today)).toBe("2026-10-12");
  });
});

describe("weekLabel", () => {
  it("says the week's days", () => {
    expect(weekLabel("2026-10-12")).toBe("12 – 18 Oct 2026");
    expect(weekLabel("2026-09-28")).toBe("28 Sept – 4 Oct 2026");
    expect(weekLabel("2026-12-28")).toBe("28 Dec 2026 – 3 Jan 2027");
  });
});

describe("isReviewTime", () => {
  it("Friday to Sunday", () => {
    expect(isReviewTime("2026-10-16")).toBe(true); // Friday
    expect(isReviewTime("2026-10-18")).toBe(true); // Sunday
    expect(isReviewTime("2026-10-19")).toBe(false); // Monday
    expect(isReviewTime("2026-10-15")).toBe(false); // Thursday
  });
});

describe("comparedWithLastWeek", () => {
  it("counts and durations", () => {
    expect(comparedWithLastWeek(5, 2)).toBe("3 more than last week");
    expect(comparedWithLastWeek(1, 3)).toBe("2 fewer than last week");
    expect(comparedWithLastWeek(4, 4)).toBe("Same as last week");
    expect(comparedWithLastWeek(150, 60, formatDuration)).toBe("1h 30m more than last week");
    expect(comparedWithLastWeek(60, 150, formatDuration)).toBe("1h 30m less than last week");
  });
});
