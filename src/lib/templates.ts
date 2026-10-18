import { z } from "zod";
import { addDays } from "./dashboard";
import { hasNoControlCharacters, optionalText, UNUSUAL_CHARACTERS } from "./validation/fields";
import { TASK_PRIORITIES, type TaskPriority } from "./validation/task";

// Project templates (Stage 19): a list of tasks a new project starts with.
// Each task's due date is counted from the project's start (or the day it's
// made), so a template works for any project, whenever it starts.

export type TemplateTask = { title: string; priority: TaskPriority; dueInDays: number | null };

export const TEMPLATE_LIMITS = { name: 100, description: 500, tasks: 50, title: 300, days: 365 };

/** The tasks of a template, as stored (a JSON column) and checked on the way in and out. */
export const templateTasksSchema = z
  .array(
    z.object({
      title: z
        .string()
        .trim()
        .min(1)
        .max(TEMPLATE_LIMITS.title)
        .refine(hasNoControlCharacters, { error: UNUSUAL_CHARACTERS }),
      priority: z.enum(TASK_PRIORITIES),
      dueInDays: z.number().int().min(0).max(TEMPLATE_LIMITS.days).nullable(),
    }),
  )
  .max(TEMPLATE_LIMITS.tasks);

export const templateNameSchema = z
  .string({ error: "Name the template." })
  .trim()
  .min(1, { error: "Name the template." })
  .max(TEMPLATE_LIMITS.name, { error: `Use ${TEMPLATE_LIMITS.name} characters or fewer.` })
  .refine(hasNoControlCharacters, { error: UNUSUAL_CHARACTERS });

export const templateDescriptionSchema = optionalText(TEMPLATE_LIMITS.description);

/** The day a template task is due: `dueInDays` after the start, or no date. */
export function templateDueDate(start: string, task: Pick<TemplateTask, "dueInDays">) {
  return task.dueInDays === null ? null : addDays(start, task.dueInDays);
}

/**
 * What a project's tasks become in a template: their due dates as days
 * after the project's start (none without a start, or for a date before it).
 */
export function tasksToTemplate(
  start: string | null,
  tasks: { title: string; priority: TaskPriority; dueDate: string | null }[],
): TemplateTask[] {
  return tasks.slice(0, TEMPLATE_LIMITS.tasks).map((task) => {
    let dueInDays: number | null = null;
    if (start && task.dueDate && task.dueDate >= start) {
      const days = Math.round(
        (Date.parse(`${task.dueDate}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000,
      );
      dueInDays = Math.min(days, TEMPLATE_LIMITS.days);
    }
    return {
      title: task.title.slice(0, TEMPLATE_LIMITS.title),
      priority: task.priority,
      dueInDays,
    };
  });
}

export type BuiltInTemplate = {
  key: string;
  name: string;
  description: string;
  tasks: TemplateTask[];
};

const task = (title: string, dueInDays: number | null, priority: TaskPriority = "MEDIUM") => ({
  title,
  priority,
  dueInDays,
});

/** Ready-made templates every workspace can use. */
export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    key: "website",
    name: "Website",
    description: "A small business website: from the brief to the launch.",
    tasks: [
      task("Kick-off call and brief", 1, "HIGH"),
      task("Collect content and photos", 5),
      task("Sitemap and wireframes", 7),
      task("Visual design", 14, "HIGH"),
      task("Build the pages", 24),
      task("Client review and changes", 28),
      task("Launch and hand-over", 30, "HIGH"),
    ],
  },
  {
    key: "logo",
    name: "Logo & brand",
    description: "A logo with its colours and fonts, and a short brand guide.",
    tasks: [
      task("Discovery questionnaire", 2, "HIGH"),
      task("Moodboard", 5),
      task("First logo concepts", 10, "HIGH"),
      task("Revisions", 15),
      task("Colours and fonts", 17),
      task("Brand guide and final files", 21, "HIGH"),
    ],
  },
  {
    key: "social",
    name: "Social media month",
    description: "A month of posts: plan, create, schedule and report.",
    tasks: [
      task("Content plan for the month", 2, "HIGH"),
      task("Design the first week's posts", 5),
      task("Client approval", 6),
      task("Schedule the posts", 7),
      task("Mid-month check-in", 15),
      task("Monthly report", 30),
    ],
  },
];

export const BUILT_IN_PREFIX = "builtin:";
