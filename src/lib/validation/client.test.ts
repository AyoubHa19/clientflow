import { describe, expect, it } from "vitest";
import { clientListHref, clientSchema, parseClientListParams } from "./client";
import { fieldErrors } from "./errors";
import { isUuid } from "./ids";

describe("clientSchema", () => {
  it("needs only a name, and turns empty fields into nothing", () => {
    expect(
      clientSchema.parse({ name: " Atlas ", email: "", phone: "  ", company: "", notes: "" }),
    ).toEqual({
      name: "Atlas",
      email: null,
      phone: null,
      company: null,
      notes: null,
      status: "ACTIVE",
    });
  });

  it("lower-cases emails and keeps phone formatting", () => {
    const client = clientSchema.parse({
      name: "A",
      email: " Hi@Atlas.MA ",
      phone: "+212 (0)5-22.12",
    });
    expect(client.email).toBe("hi@atlas.ma");
    expect(client.phone).toBe("+212 (0)5-22.12");
  });

  it("explains each problem", () => {
    const result = clientSchema.safeParse({
      name: "",
      email: "nope",
      phone: "call me maybe",
      status: "VIP",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error)).toEqual({
      name: "Enter the client's name.",
      email: "Enter a valid email address, or leave it empty.",
      phone: "Use digits, spaces and + - ( ) only.",
      status: "Choose a status from the list.",
    });
  });

  it("refuses a phone with no digits and over-long text", () => {
    expect(clientSchema.safeParse({ name: "A", phone: "+()" }).success).toBe(false);
    expect(clientSchema.safeParse({ name: "x".repeat(201) }).success).toBe(false);
    expect(clientSchema.safeParse({ name: "A", notes: "x".repeat(5001) }).success).toBe(false);
    expect(clientSchema.safeParse({ name: "A", notes: "x".repeat(5000) }).success).toBe(true);
  });
});

describe("parseClientListParams", () => {
  it("has sensible defaults", () => {
    expect(parseClientListParams({})).toEqual({ q: "", status: "open", sort: "updated", page: 1 });
  });

  it("reads valid settings", () => {
    expect(
      parseClientListParams({ q: " atlas ", status: "archived", sort: "name", page: "3" }),
    ).toEqual({ q: "atlas", status: "archived", sort: "name", page: 3 });
  });

  it("falls back on anything odd", () => {
    expect(
      parseClientListParams({ status: "deleted", sort: "price", page: "-2", q: ["a", "b"] }),
    ).toEqual({ q: "a", status: "open", sort: "updated", page: 1 });
    expect(parseClientListParams({ page: "1.5" }).page).toBe(1);
    expect(parseClientListParams({ page: "abc" }).page).toBe(1);
    expect(parseClientListParams({ q: "x".repeat(300) }).q).toHaveLength(100);
  });
});

describe("clientListHref", () => {
  it("leaves defaults out", () => {
    expect(clientListHref({ q: "", status: "open", sort: "updated", page: 1 })).toBe("/clients");
  });

  it("keeps the rest", () => {
    expect(clientListHref({ q: "café & co", status: "all", sort: "name", page: 2 })).toBe(
      "/clients?q=caf%C3%A9+%26+co&status=all&sort=name&page=2",
    );
  });
});

describe("isUuid", () => {
  it("accepts UUIDs only", () => {
    expect(isUuid("01a146b6-2463-71ff-9258-bbdc488c3829")).toBe(true);
    expect(isUuid("1 OR 1=1")).toBe(false);
    expect(isUuid(42)).toBe(false);
  });
});
