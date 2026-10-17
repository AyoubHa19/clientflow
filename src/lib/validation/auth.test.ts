import { describe, expect, it } from "vitest";
import { fieldErrors, safeNextPath, signInSchema, signUpSchema } from "./auth";

describe("signUpSchema", () => {
  const valid = { name: "Sara (sample)", email: "sara@example.com", password: "12345678" };

  it("accepts a complete form and tidies the email", () => {
    const result = signUpSchema.parse({ ...valid, name: "  Sara  ", email: " Sara@Example.COM " });
    expect(result).toEqual({ ...valid, name: "Sara", email: "sara@example.com" });
  });

  it("explains each problem in plain words", () => {
    const result = signUpSchema.safeParse({ name: " ", email: "nope", password: "short" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error)).toEqual({
      name: "Enter your name.",
      email: "Enter a valid email address.",
      password: "Use at least 8 characters.",
    });
  });

  it("caps lengths", () => {
    expect(signUpSchema.safeParse({ ...valid, name: "x".repeat(201) }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, password: "x".repeat(129) }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, password: "x".repeat(128) }).success).toBe(true);
  });

  it("rejects missing fields", () => {
    expect(signUpSchema.safeParse({}).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, email: null }).success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("only asks for an email and some password", () => {
    expect(signInSchema.safeParse({ email: "sara@example.com", password: "x" }).success).toBe(true);
  });

  it("names empty fields", () => {
    const result = signInSchema.safeParse({ email: "", password: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error)).toEqual({
      email: "Enter your email address.",
      password: "Enter your password.",
    });
  });
});

describe("safeNextPath", () => {
  it("keeps paths inside the app", () => {
    expect(safeNextPath("/design")).toBe("/design");
    expect(safeNextPath("/clients?page=2")).toBe("/clients?page=2");
  });

  it("refuses anything that could leave the site", () => {
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
  });

  it("reads the path as a browser would, which drops tabs and line breaks", () => {
    // "/\t/evil.example" turns into "//evil.example" in a browser: another site.
    expect(safeNextPath("/\t/evil.example")).toBe("/");
    expect(safeNextPath("/\n/evil.example")).toBe("/");
    expect(safeNextPath("/\r\n/evil.example")).toBe("/");
    expect(safeNextPath("/%2F/evil.example")).toBe("/%2F/evil.example"); // stays here
    expect(safeNextPath("/tasks?due=overdue#top")).toBe("/tasks?due=overdue#top");
  });

  it("doesn't loop back to the sign-in pages", () => {
    expect(safeNextPath("/sign-in")).toBe("/");
    expect(safeNextPath("/sign-up")).toBe("/");
    expect(safeNextPath("/api/auth/sign-out")).toBe("/");
  });

  it("falls back to the overview", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });
});
