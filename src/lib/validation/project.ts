import { z } from "zod";
import { optionalAmount } from "@/lib/money";
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

// Project rules, shared by the forms and the server.

export const PROJECT_STATUSES = [
  "PLANNING",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Statuses where the work is over, so due dates no longer matter. */
export const FINISHED_PROJECT_STATUSES: readonly ProjectStatus[] = ["COMPLETED", "CANCELLED"];
export const isFinishedProject = (status: ProjectStatus) =>
  FINISHED_PROJECT_STATUSES.includes(status);

export const PROJECT_LIMITS = { name: 200, description: 5000 };

export const projectSchema = z
  .object({
    name: requiredName("Enter a project name.", PROJECT_LIMITS.name),
    description: optionalText(PROJECT_LIMITS.description),
    clientId: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((value) => (value ? value : null))
      .refine((value) => value === null || isUuid(value), {
        error: "Choose a client from the list.",
      }),
    status: z
      .enum(PROJECT_STATUSES, { error: "Choose a status from the list." })
      .default("PLANNING"),
    startDate: optionalDay("Enter a valid start date."),
    dueDate: optionalDay("Enter a valid due date."),
    // What the client pays, in the workspace's currency (minor units).
    fee: optionalAmount,
  })
  .refine(
    (project) => !project.startDate || !project.dueDate || project.dueDate >= project.startDate,
    {
      error: "The due date can't be before the start date.",
      path: ["dueDate"],
    },
  );

export type ProjectInput = z.infer<typeof projectSchema>;

export const projectStatusSchema = z.enum(PROJECT_STATUSES, {
  error: "Choose a status from the list.",
});

// ---------------------------------------------------------------------------
// The list, read from the address bar.
// ---------------------------------------------------------------------------

export const PROJECT_STATUS_FILTERS = [
  "open",
  "planning",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
  "all",
] as const;
export type ProjectStatusFilter = (typeof PROJECT_STATUS_FILTERS)[number];

export const PROJECT_STATUS_FILTER_LABELS: Record<ProjectStatusFilter, string> = {
  open: "Open (planning, in progress, on hold)",
  planning: "Planning",
  in_progress: "In progress",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
  all: "All projects",
};

export const PROJECT_SORTS = ["due", "updated", "name", "newest"] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

export const PROJECT_SORT_LABELS: Record<ProjectSort, string> = {
  due: "Due date (soonest first)",
  updated: "Recently updated",
  name: "Name (A to Z)",
  newest: "Newest first",
};

export const PROJECTS_PER_PAGE = 20;

export type ProjectListParams = {
  q: string;
  status: ProjectStatusFilter;
  /** "" for any client, "none" for projects without one, or a client id. */
  client: string;
  sort: ProjectSort;
  page: number;
};

export function parseProjectListParams(
  params: Record<string, string | string[] | undefined>,
): ProjectListParams {
  const client = (firstParam(params.client) ?? "").trim();
  return {
    q: searchParam(params.q),
    status: choiceParam(params.status, PROJECT_STATUS_FILTERS, "open"),
    client: client === "none" || isUuid(client) ? client : "",
    sort: choiceParam(params.sort, PROJECT_SORTS, "due"),
    page: pageParam(params.page),
  };
}

export function projectsHref(params: Partial<ProjectListParams>) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status && params.status !== "open") search.set("status", params.status);
  if (params.client) search.set("client", params.client);
  if (params.sort && params.sort !== "due") search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/projects?${query}` : "/projects";
}
