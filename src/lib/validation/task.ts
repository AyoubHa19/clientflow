import { z } from "zod";
import {
  choiceParam,
  firstParam,
  optionalDay,
  optionalText,
  pageParam,
  requiredName,
  searchParam,
} from "./fields";
import { isUuid } from "./ids";

// Task rules, shared by the forms, the list and the server.

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export const TASK_PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const TASK_LIMITS = { title: 300, description: 5000 };

export const taskSchema = z.object({
  title: requiredName("Enter what needs doing.", TASK_LIMITS.title),
  description: optionalText(TASK_LIMITS.description),
  projectId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || isUuid(value), {
      error: "Choose a project from the list.",
    }),
  status: z.enum(TASK_STATUSES, { error: "Choose a status from the list." }).default("TODO"),
  priority: z
    .enum(TASK_PRIORITIES, { error: "Choose a priority from the list." })
    .default("MEDIUM"),
  dueDate: optionalDay("Enter a valid due date."),
});

export type TaskInput = z.infer<typeof taskSchema>;

// ---------------------------------------------------------------------------
// The list, read from the address bar.
// ---------------------------------------------------------------------------

export const TASK_STATUS_FILTERS = ["open", "todo", "in_progress", "done", "all"] as const;
export type TaskStatusFilter = (typeof TASK_STATUS_FILTERS)[number];

export const TASK_STATUS_FILTER_LABELS: Record<TaskStatusFilter, string> = {
  open: "Open (to do, in progress)",
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  all: "All tasks",
};

export const TASK_PRIORITY_FILTERS = ["any", "high", "medium", "low"] as const;
export type TaskPriorityFilter = (typeof TASK_PRIORITY_FILTERS)[number];

export const TASK_DUE_FILTERS = ["any", "overdue", "today", "week", "none"] as const;
export type TaskDueFilter = (typeof TASK_DUE_FILTERS)[number];

export const TASK_DUE_FILTER_LABELS: Record<TaskDueFilter, string> = {
  any: "Any time",
  overdue: "Overdue",
  today: "Due today",
  week: "Due in the next 7 days",
  none: "No due date",
};

export const TASK_SORTS = ["due", "priority", "updated", "newest"] as const;
export type TaskSort = (typeof TASK_SORTS)[number];

export const TASK_SORT_LABELS: Record<TaskSort, string> = {
  due: "Due date (soonest first)",
  priority: "Priority (high first)",
  updated: "Recently updated",
  newest: "Newest first",
};

export const TASKS_PER_PAGE = 20;

export type TaskListParams = {
  q: string;
  status: TaskStatusFilter;
  priority: TaskPriorityFilter;
  /** "" for any project, "none" for tasks without one, or a project id. */
  project: string;
  due: TaskDueFilter;
  sort: TaskSort;
  page: number;
};

export function parseTaskListParams(
  params: Record<string, string | string[] | undefined>,
): TaskListParams {
  const project = (firstParam(params.project) ?? "").trim();
  return {
    q: searchParam(params.q),
    status: choiceParam(params.status, TASK_STATUS_FILTERS, "open"),
    priority: choiceParam(params.priority, TASK_PRIORITY_FILTERS, "any"),
    project: project === "none" || isUuid(project) ? project : "",
    due: choiceParam(params.due, TASK_DUE_FILTERS, "any"),
    sort: choiceParam(params.sort, TASK_SORTS, "due"),
    page: pageParam(params.page),
  };
}

export function tasksHref(params: Partial<TaskListParams>) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status && params.status !== "open") search.set("status", params.status);
  if (params.priority && params.priority !== "any") search.set("priority", params.priority);
  if (params.project) search.set("project", params.project);
  if (params.due && params.due !== "any") search.set("due", params.due);
  if (params.sort && params.sort !== "due") search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/tasks?${query}` : "/tasks";
}

/** The due-date range a filter means, given today ("YYYY-MM-DD"). */
export function dueRange(filter: TaskDueFilter, today: string) {
  const day = (offset: number) => {
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date;
  };
  switch (filter) {
    case "overdue":
      return { lt: day(0) };
    case "today":
      return { equals: day(0) };
    case "week":
      return { gte: day(0), lte: day(6) };
    case "none":
      return null;
    default:
      return undefined;
  }
}
