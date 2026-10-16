import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env";

const valid = {
  DATABASE_URL: "postgresql://user:secret@host.example/db?sslmode=verify-full",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3001",
};

describe("parseServerEnv", () => {
  it("accepts complete settings", () => {
    expect(parseServerEnv(valid)).toEqual(valid);
  });

  it("names a missing setting", () => {
    expect(() => parseServerEnv({ ...valid, DATABASE_URL: undefined })).toThrow(
      /DATABASE_URL is missing/,
    );
  });

  it("rejects a short auth secret", () => {
    expect(() => parseServerEnv({ ...valid, BETTER_AUTH_SECRET: "short" })).toThrow(
      /BETTER_AUTH_SECRET must be at least 32 characters/,
    );
  });

  it("rejects something that isn't a postgres URL, without printing it", () => {
    let message = "";
    try {
      parseServerEnv({ ...valid, DATABASE_URL: "mysql://user:hunter2@host/db" });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/DATABASE_URL must be a postgres:\/\/ connection string/);
    expect(message).not.toContain("hunter2");
  });
});
