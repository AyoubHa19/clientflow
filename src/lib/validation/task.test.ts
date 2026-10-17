import { describe, expect, it } from "vitest";
import { fieldErrors } from "./errors";
import { dueRange, parseTaskListParams, taskSchema, tasksHref } from "./task";

describe("taskSchema", () => {
  it("needs only a title; new tasks are to do, medium priority", () => {
    expect(taskSchema.parse({ title: " Call Karim ", projectId: "", dueDate: "" })).toEqual({
      title: "Call Karim",
      description: null,
      projectId: null,
      status: "TODO",
      priority: "MEDIUM",
      dueDate: null,
    });
  });

  it("explains each problem", () => {
    const result = taskSchema.safeParse({
      title: " ",
      projectId: "nope",
      status: "LATER",
      priority: "URGENT",
      dueDate: "2026-02-30",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error)).toEqual({
      title: "Enter what needs doing.",
      projectId: "Choose a project from the list.",
      status: "Choose a status from the list.",
      priority: "Choose a priority from the list.",
      dueDate: "Enter a valid due date.",
    });
  });
});

describe("parseTaskListParams", () => {
  it("defaults to open tasks, soonest due first", () => {
    expect(parseTaskListParams({})).toEqual({
      q: "",
      status: "open",
      priority: "any",
      project: "",
      due: "any",
      sort: "due",
      page: 1,
    });
  });

  it("reads valid settings and ignores odd ones", () => {
    expect(
      parseTaskListParams({
        status: "done",
        priority: "high",
        due: "week",
        project: "none",
        sort: "priority",
      }),
    ).toMatchObject({
      status: "done",
      priority: "high",
      due: "week",
      project: "none",
      sort: "priority",
    });
    expect(
      parseTaskListParams({ due: "yesterday", project: "x", priority: "urgent" }),
    ).toMatchObject({
      due: "any",
      project: "",
      priority: "any",
    });
  });

  it("builds short links", () => {
    expect(tasksHref({ status: "open", due: "any", sort: "due" })).toBe("/tasks");
    expect(tasksHref({ due: "overdue", priority: "high" })).toBe(
      "/tasks?priority=high&due=overdue",
    );
  });
});

describe("dueRange", () => {
  const today = "2026-10-31";
  const day = (value: string) => new Date(`${value}T00:00:00Z`);

  it("turns each filter into dates around today, across a month end", () => {
    expect(dueRange("overdue", today)).toEqual({ lt: day("2026-10-31") });
    expect(dueRange("today", today)).toEqual({ equals: day("2026-10-31") });
    expect(dueRange("week", today)).toEqual({ gte: day("2026-10-31"), lte: day("2026-11-06") });
    expect(dueRange("none", today)).toBeNull();
    expect(dueRange("any", today)).toBeUndefined();
  });
});
