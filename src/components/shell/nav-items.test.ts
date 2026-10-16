import { describe, expect, it } from "vitest";
import { isActive, NAV_ITEMS } from "./nav-items";

describe("isActive", () => {
  it("matches the home page only exactly", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/", "/clients")).toBe(false);
  });

  it("matches a section and the pages under it", () => {
    expect(isActive("/clients", "/clients")).toBe(true);
    expect(isActive("/clients", "/clients/abc")).toBe(true);
  });

  it("doesn't match a page that only starts with the same letters", () => {
    expect(isActive("/clients", "/clients-archive")).toBe(false);
  });
});

describe("NAV_ITEMS", () => {
  it("has unique links", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
