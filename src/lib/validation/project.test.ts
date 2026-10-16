import { describe, expect, it } from "vitest";
import { fieldErrors } from "./errors";
import { parseProjectListParams, projectSchema, projectsHref } from "./project";

const CLIENT = "01a146b6-2463-71ff-9258-bbdc488c3829";

describe("projectSchema", () => {
  it("needs only a name; dates become midnight UTC", () => {
    const project = projectSchema.parse({
      name: " Website ",
      clientId: CLIENT,
      startDate: "2026-10-01",
      dueDate: "2026-10-01",
      description: "",
    });
    expect(project).toMatchObject({
      name: "Website",
      clientId: CLIENT,
      description: null,
      status: "PLANNING",
    });
    expect(project.startDate?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(projectSchema.parse({ name: "A", clientId: "", startDate: "" })).toMatchObject({
      clientId: null,
      startDate: null,
      dueDate: null,
    });
  });

  it("refuses impossible dates, a due date before the start and a bad client id", () => {
    const result = projectSchema.safeParse({
      name: "",
      clientId: "not-an-id",
      startDate: "2026-02-30",
      dueDate: "31/12/2026",
      status: "DONE",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error)).toEqual({
      name: "Enter a project name.",
      clientId: "Choose a client from the list.",
      startDate: "Enter a valid start date.",
      dueDate: "Enter a valid due date.",
      status: "Choose a status from the list.",
    });

    const backwards = projectSchema.safeParse({
      name: "A",
      startDate: "2026-11-10",
      dueDate: "2026-11-09",
    });
    expect(backwards.success).toBe(false);
    if (!backwards.success) {
      expect(fieldErrors(backwards.error)).toEqual({
        dueDate: "The due date can't be before the start date.",
      });
    }
  });
});

describe("parseProjectListParams", () => {
  it("defaults to open projects, soonest due first", () => {
    expect(parseProjectListParams({})).toEqual({
      q: "",
      status: "open",
      client: "",
      sort: "due",
      page: 1,
    });
  });

  it("accepts a client id or 'none', nothing else", () => {
    expect(parseProjectListParams({ client: CLIENT }).client).toBe(CLIENT);
    expect(parseProjectListParams({ client: "none" }).client).toBe("none");
    expect(parseProjectListParams({ client: "1 OR 1=1" }).client).toBe("");
  });

  it("builds short links", () => {
    expect(projectsHref({ status: "open", sort: "due", page: 1 })).toBe("/projects");
    expect(projectsHref({ status: "completed", client: "none", sort: "name" })).toBe(
      "/projects?status=completed&client=none&sort=name",
    );
  });
});
