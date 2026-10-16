import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env";

describe("parseServerEnv", () => {
  it("accepts a postgres connection string", () => {
    const url = "postgresql://user:secret@host.example/db?sslmode=verify-full";
    expect(parseServerEnv({ DATABASE_URL: url }).DATABASE_URL).toBe(url);
  });

  it("names a missing setting", () => {
    expect(() => parseServerEnv({})).toThrow(/DATABASE_URL is missing/);
  });

  it("rejects something that isn't a postgres URL, without printing it", () => {
    let message = "";
    try {
      parseServerEnv({ DATABASE_URL: "mysql://user:hunter2@host/db" });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/DATABASE_URL must be a postgres:\/\/ connection string/);
    expect(message).not.toContain("hunter2");
  });
});
