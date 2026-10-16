import { describe, expect, it } from "vitest";
import { fieldErrors } from "./errors";
import { leadSchema, leadsHref, parseLeadListParams } from "./lead";

describe("leadSchema", () => {
  it("needs only a contact name; new leads start as New", () => {
    expect(leadSchema.parse({ contactName: " Karim ", source: " Referral ", email: "" })).toEqual({
      contactName: "Karim",
      company: null,
      email: null,
      phone: null,
      source: "Referral",
      notes: null,
      status: "NEW",
    });
  });

  it("explains each problem", () => {
    const result = leadSchema.safeParse({
      contactName: "",
      email: "x",
      phone: "no",
      source: "s".repeat(101),
      status: "ARCHIVED",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error)).toEqual({
      contactName: "Enter the contact's name.",
      email: "Enter a valid email address, or leave it empty.",
      phone: "Use digits, spaces and + - ( ) only.",
      source: "Use 100 characters or fewer.",
      status: "Choose a status from the list.",
    });
  });
});

describe("parseLeadListParams", () => {
  it("defaults to the board with everything", () => {
    expect(parseLeadListParams({})).toEqual({
      view: "board",
      q: "",
      status: "all",
      source: "",
      sort: "updated",
      page: 1,
    });
  });

  it("reads the list's settings and ignores odd ones", () => {
    expect(
      parseLeadListParams({
        view: "list",
        status: "won",
        source: " LinkedIn ",
        sort: "name",
        page: "2",
      }),
    ).toMatchObject({ view: "list", status: "won", source: "LinkedIn", sort: "name", page: 2 });
    expect(parseLeadListParams({ view: "table", status: "maybe", page: "0" })).toMatchObject({
      view: "board",
      status: "all",
      page: 1,
    });
  });
});

describe("leadsHref", () => {
  it("leaves defaults out", () => {
    expect(leadsHref({ view: "board", status: "all", sort: "updated", page: 1 })).toBe("/leads");
    expect(leadsHref({ view: "list", status: "qualified", source: "Event" })).toBe(
      "/leads?view=list&status=qualified&source=Event",
    );
  });
});
