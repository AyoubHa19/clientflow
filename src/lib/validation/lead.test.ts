import { describe, expect, it } from "vitest";
import { fieldErrors } from "./errors";
import { contactLogSchema, leadSchema, leadsHref, parseLeadListParams } from "./lead";

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
      lastContactedOn: null,
      nextFollowUpOn: null,
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
      followUp: "all",
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
        followUp: "cold",
      }),
    ).toMatchObject({
      view: "list",
      status: "won",
      followUp: "cold",
      source: "LinkedIn",
      sort: "name",
      page: 2,
    });
    expect(
      parseLeadListParams({ view: "table", status: "maybe", followUp: "soon", page: "0" }),
    ).toMatchObject({
      view: "board",
      status: "all",
      followUp: "all",
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
    expect(leadsHref({ view: "list", followUp: "due", sort: "followUp" })).toBe(
      "/leads?view=list&followUp=due&sort=followUp",
    );
  });
});

describe("follow-up dates", () => {
  it("the lead form takes both dates, or neither", () => {
    expect(
      leadSchema.parse({
        contactName: "Karim",
        lastContactedOn: "2026-10-10",
        nextFollowUpOn: " 2026-10-20 ",
      }),
    ).toMatchObject({
      lastContactedOn: new Date("2026-10-10T00:00:00Z"),
      nextFollowUpOn: new Date("2026-10-20T00:00:00Z"),
    });
    const result = leadSchema.safeParse({ contactName: "Karim", nextFollowUpOn: "2026-02-30" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error)).toEqual({
      nextFollowUpOn: "Enter a valid date, or leave it empty.",
    });
  });

  it("a contact needs its day; the follow-up can't come before it", () => {
    expect(
      contactLogSchema("2026-10-17").parse({
        contactedOn: "2026-10-17",
        note: " Sent the quote ",
        nextFollowUpOn: "",
      }),
    ).toEqual({
      contactedOn: new Date("2026-10-17T00:00:00Z"),
      note: "Sent the quote",
      nextFollowUpOn: null,
    });
    const result = contactLogSchema("2026-10-17").safeParse({
      contactedOn: "",
      note: "x".repeat(201),
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error)).toEqual({
      contactedOn: "Enter the day you got in touch.",
      note: "Use 200 characters or fewer.",
    });
    const early = contactLogSchema("2026-10-17").safeParse({
      contactedOn: "2026-10-17",
      nextFollowUpOn: "2026-10-16",
    });
    expect(early.success).toBe(false);
    if (early.success) return;
    expect(fieldErrors(early.error)).toEqual({
      nextFollowUpOn: "The follow-up can't be before the contact.",
    });
  });

  it("a contact day in the future says so, even with a follow-up planned before it", () => {
    const result = contactLogSchema("2026-10-17").safeParse({
      contactedOn: "2099-01-01",
      nextFollowUpOn: "2026-10-17",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error)).toEqual({ contactedOn: "This day hasn't happened yet." });
  });
});
