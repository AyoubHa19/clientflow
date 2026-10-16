import { describe, expect, it } from "vitest";
import { fieldErrors } from "./errors";
import { isValidTimeZone, timeZoneOptions, workspaceSchema } from "./workspace";

describe("isValidTimeZone", () => {
  it("knows real IANA time zones", () => {
    expect(isValidTimeZone("Africa/Casablanca")).toBe(true);
    expect(isValidTimeZone("Europe/Paris")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
  });

  it("refuses made-up or empty ones", () => {
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone("x".repeat(65))).toBe(false);
  });
});

describe("workspaceSchema", () => {
  it("accepts a name and time zone, trimming the name", () => {
    expect(
      workspaceSchema.parse({ name: "  Studio (sample) ", timezone: "Africa/Casablanca" }),
    ).toEqual({ name: "Studio (sample)", timezone: "Africa/Casablanca" });
  });

  it("explains what's wrong", () => {
    const result = workspaceSchema.safeParse({ name: "   ", timezone: "Nowhere/Land" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error)).toEqual({
      name: "Enter a name for your workspace.",
      timezone: "Choose a time zone from the list.",
    });
  });

  it("caps the name at 100 characters", () => {
    expect(workspaceSchema.safeParse({ name: "x".repeat(100), timezone: "UTC" }).success).toBe(
      true,
    );
    expect(workspaceSchema.safeParse({ name: "x".repeat(101), timezone: "UTC" }).success).toBe(
      false,
    );
  });

  it("ignores fields it doesn't know, like a workspace id", () => {
    const parsed = workspaceSchema.parse({
      name: "A",
      timezone: "UTC",
      workspaceId: "someone-else",
    });
    expect(parsed).not.toHaveProperty("workspaceId");
  });
});

describe("timeZoneOptions", () => {
  it("offers UTC and Casablanca, all valid", () => {
    const zones = timeZoneOptions();
    expect(zones).toContain("UTC");
    expect(zones).toContain("Africa/Casablanca");
    expect(zones.every(isValidTimeZone)).toBe(true);
  });
});
