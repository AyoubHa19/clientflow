import { describe, expect, it } from "vitest";
import { isTheme, resolvesToDark, THEME_SCRIPT, THEME_STORAGE_KEY } from "./theme";

describe("isTheme", () => {
  it("accepts the three choices", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("system")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isTheme("Dark")).toBe(false);
    expect(isTheme("")).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(1)).toBe(false);
  });
});

describe("resolvesToDark", () => {
  it("follows an explicit choice whatever the system prefers", () => {
    expect(resolvesToDark("dark", false)).toBe(true);
    expect(resolvesToDark("light", true)).toBe(false);
  });

  it("follows the system for 'system'", () => {
    expect(resolvesToDark("system", true)).toBe(true);
    expect(resolvesToDark("system", false)).toBe(false);
  });
});

describe("THEME_SCRIPT", () => {
  it("reads the same storage key as the app", () => {
    expect(THEME_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY));
  });

  it("is valid JavaScript", () => {
    expect(() => new Function(THEME_SCRIPT)).not.toThrow();
  });
});
