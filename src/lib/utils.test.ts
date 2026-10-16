import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins classes and skips empty ones", () => {
    expect(cn("a", false, undefined, "b")).toBe("a b");
  });

  it("lets a later Tailwind class win", () => {
    expect(cn("px-2 text-sm", "px-4")).toBe("text-sm px-4");
  });
});
