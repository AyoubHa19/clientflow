import { describe, expect, it } from "vitest";
import { clientHealth } from "./health";
import {
  durationField,
  formatClock,
  formatDuration,
  hourlyRate,
  parseDuration,
  timerMinutes,
} from "./time";

describe("parseDuration", () => {
  it("reads the ways people write durations, in minutes", () => {
    const cases: [string, number][] = [
      ["1:30", 90],
      ["0:45", 45],
      ["1h30", 90],
      ["1h 30m", 90],
      ["2h", 120],
      ["45m", 45],
      ["45 min", 45],
      ["90m", 90],
      ["1.5", 90],
      ["1,25", 75],
      ["2", 120],
      [" 24:00 ", 1440],
    ];
    for (const [text, minutes] of cases) expect(parseDuration(text)).toEqual({ minutes });
  });

  it("refuses nonsense, zero and more than a day", () => {
    for (const text of ["", "abc", "1:60", "1h75", "-1", "1:3", "h", "1.5.5"]) {
      expect(parseDuration(text)).toHaveProperty("error");
    }
    expect(parseDuration("0")).toEqual({ error: "Enter at least 1 minute." });
    expect(parseDuration("24:01")).toEqual({ error: "One entry can be 24 hours at most." });
    expect(parseDuration("1441m")).toHaveProperty("error");
    expect(durationField.safeParse("").success).toBe(false);
    expect(durationField.parse("1:15")).toBe(75);
  });
});

describe("formatting", () => {
  it("prints durations and a running clock", () => {
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(120)).toBe("2h");
    expect(formatClock(249)).toBe("0:04:09");
    expect(formatClock(3723)).toBe("1:02:03");
    expect(formatClock(-5)).toBe("0:00:00");
  });
});

describe("timers and rates", () => {
  it("a timer counts whole minutes, at least 1 and at most a day", () => {
    const start = new Date("2026-10-18T09:00:00Z");
    expect(timerMinutes(start, new Date("2026-10-18T09:00:20Z"))).toBe(1);
    expect(timerMinutes(start, new Date("2026-10-18T10:29:40Z"))).toBe(90);
    expect(timerMinutes(start, new Date("2026-10-21T09:00:00Z"))).toBe(1440);
  });

  it("the hourly rate is the fee over the hours", () => {
    // 7,500.00 for 25 hours: 300.00 an hour.
    expect(hourlyRate(750000, 25 * 60)).toBe(30000);
    expect(hourlyRate(100000, 90)).toBe(66667);
    expect(hourlyRate(null, 60)).toBeNull();
    expect(hourlyRate(5000, 0)).toBeNull();
  });
});

describe("clientHealth", () => {
  it("compares the rate with the average and counts overdue work", () => {
    expect(clientHealth({ rate: 30000, averageRate: 30000, overdue: 0 })).toEqual({
      level: "good",
      reasons: ["Pays about your average per hour", "Nothing overdue"],
    });
    expect(clientHealth({ rate: 40000, averageRate: 30000, overdue: 0 }).reasons[0]).toBe(
      "Pays 33% more per hour than your average",
    );
    expect(clientHealth({ rate: 24000, averageRate: 30000, overdue: 0 })).toEqual({
      level: "watch",
      reasons: ["Pays 20% less per hour than your average", "Nothing overdue"],
    });
    expect(clientHealth({ rate: 15000, averageRate: 30000, overdue: 0 }).level).toBe("risk");
    expect(clientHealth({ rate: 30000, averageRate: 30000, overdue: 1 })).toEqual({
      level: "watch",
      reasons: ["Pays about your average per hour", "1 overdue task or project"],
    });
    expect(clientHealth({ rate: 30000, averageRate: 30000, overdue: 3 }).level).toBe("risk");
  });

  it("without rates, overdue work still counts; with nothing known, says so", () => {
    expect(clientHealth({ rate: null, averageRate: null, overdue: 2 })).toEqual({
      level: "watch",
      reasons: ["2 overdue tasks or projects"],
    });
    expect(clientHealth({ rate: null, averageRate: 30000, overdue: 0 })).toEqual({
      level: "unknown",
      reasons: ["Log time on a project with a fee to compare what they pay per hour"],
    });
  });
});
