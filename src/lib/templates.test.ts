import { describe, expect, it } from "vitest";
import {
  BUILT_IN_TEMPLATES,
  tasksToTemplate,
  templateDueDate,
  templateTasksSchema,
} from "./templates";

describe("templates", () => {
  it("every built-in template is valid, with unique keys", () => {
    for (const template of BUILT_IN_TEMPLATES) {
      expect(templateTasksSchema.safeParse(template.tasks).success).toBe(true);
    }
    const keys = BUILT_IN_TEMPLATES.map((template) => template.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("a task's due date counts from the start", () => {
    expect(templateDueDate("2026-10-30", { dueInDays: 3 })).toBe("2026-11-02");
    expect(templateDueDate("2026-10-30", { dueInDays: 0 })).toBe("2026-10-30");
    expect(templateDueDate("2026-10-30", { dueInDays: null })).toBeNull();
  });

  it("a project's tasks become days after its start", () => {
    expect(
      tasksToTemplate("2026-10-01", [
        { title: "Brief", priority: "HIGH", dueDate: "2026-10-03" },
        { title: "Undated", priority: "LOW", dueDate: null },
        { title: "Before the start", priority: "MEDIUM", dueDate: "2026-09-20" },
      ]),
    ).toEqual([
      { title: "Brief", priority: "HIGH", dueInDays: 2 },
      { title: "Undated", priority: "LOW", dueInDays: null },
      { title: "Before the start", priority: "MEDIUM", dueInDays: null },
    ]);
    // Without a start date, no task keeps a date.
    expect(
      tasksToTemplate(null, [{ title: "Brief", priority: "HIGH", dueDate: "2026-10-03" }]),
    ).toEqual([{ title: "Brief", priority: "HIGH", dueInDays: null }]);
  });

  it("refuses odd stored task lists", () => {
    for (const bad of [
      [{ title: "", priority: "HIGH", dueInDays: 1 }],
      [{ title: "x", priority: "URGENT", dueInDays: 1 }],
      [{ title: "x", priority: "LOW", dueInDays: -1 }],
      [{ title: "x", priority: "LOW", dueInDays: 1.5 }],
      Array.from({ length: 51 }, () => ({ title: "x", priority: "LOW", dueInDays: null })),
      "not a list",
    ]) {
      expect(templateTasksSchema.safeParse(bad).success).toBe(false);
    }
  });
});
