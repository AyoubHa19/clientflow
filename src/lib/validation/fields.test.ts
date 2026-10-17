import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  choiceParam,
  firstParam,
  hasNoControlCharacters,
  optionalDay,
  optionalText,
  pageParam,
  requiredName,
  searchParam,
  UNUSUAL_CHARACTERS,
} from "./fields";

describe("reading the address bar", () => {
  it("takes the first of a repeated parameter", () => {
    expect(firstParam(["a", "b"])).toBe("a");
    expect(firstParam("a")).toBe("a");
    expect(firstParam(undefined)).toBeUndefined();
  });

  it("accepts only sensible page numbers", () => {
    expect(pageParam("3")).toBe(3);
    expect(pageParam(["2", "9"])).toBe(2);
    for (const value of ["0", "-1", "1.5", "abc", "1e3x", "100001", "", undefined]) {
      expect(pageParam(value), String(value)).toBe(1);
    }
  });

  it("accepts only the listed choices", () => {
    const sorts = ["name", "newest"] as const;
    expect(choiceParam("newest", sorts, "name")).toBe("newest");
    expect(choiceParam("NEWEST", sorts, "name")).toBe("name");
    expect(choiceParam("constructor", sorts, "name")).toBe("name");
    expect(choiceParam(undefined, sorts, "name")).toBe("name");
  });
});

const messages = (result: z.ZodSafeParseResult<unknown>) =>
  result.success ? [] : result.error.issues.map((issue) => issue.message);

describe("control characters", () => {
  it("are refused in names and text (PostgreSQL can't store a null character)", () => {
    expect(messages(requiredName("Enter a name.").safeParse("Atlas\u0000Café"))).toEqual([
      UNUSUAL_CHARACTERS,
    ]);
    expect(messages(optionalText(100).safeParse("bell\u0007"))).toEqual([UNUSUAL_CHARACTERS]);
  });

  it("allow tabs and line breaks", () => {
    expect(hasNoControlCharacters("first line\nsecond\r\nthird\tend")).toBe(true);
    expect(optionalText(100).safeParse("a\nb").success).toBe(true);
  });

  it("are dropped from search text in the address bar", () => {
    expect(searchParam("Atlas\u0000")).toBe("Atlas");
    expect(searchParam(["  café\u001f  ", "ignored"])).toBe("café");
    expect(searchParam("x".repeat(150))).toHaveLength(100);
    expect(searchParam(undefined)).toBe("");
  });
});

describe("optionalDay", () => {
  const day = optionalDay("Enter a valid date.");

  it("accepts real days within the supported years", () => {
    expect(day.parse("2026-10-17")).toEqual(new Date("2026-10-17T00:00:00Z"));
    expect(day.parse("1900-01-01")).toEqual(new Date("1900-01-01T00:00:00Z"));
    expect(day.parse("2200-12-31")).toEqual(new Date("2200-12-31T00:00:00Z"));
  });

  it("refuses years the database can't hold or no one means", () => {
    for (const value of ["0000-01-01", "0001-01-01", "1899-12-31", "2201-01-01", "9999-12-31"]) {
      expect(messages(day.safeParse(value)), value).toEqual(["Enter a valid date."]);
    }
  });
});
