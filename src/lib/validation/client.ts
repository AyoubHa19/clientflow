import { z } from "zod";
import {
  choiceParam,
  CONTACT_LIMITS,
  firstParam,
  optionalEmail,
  optionalPhone,
  optionalText,
  pageParam,
  requiredName,
} from "./fields";

// Client rules, shared by the forms and the server (which checks again).

export const CLIENT_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

export const CLIENT_LIMITS = CONTACT_LIMITS;

export const clientSchema = z.object({
  name: requiredName("Enter the client's name."),
  email: optionalEmail,
  phone: optionalPhone,
  company: optionalText(CONTACT_LIMITS.company),
  notes: optionalText(CONTACT_LIMITS.notes),
  status: z.enum(CLIENT_STATUSES, { error: "Choose a status from the list." }).default("ACTIVE"),
});

export type ClientInput = z.infer<typeof clientSchema>;

// ---------------------------------------------------------------------------
// The list's search, filter, sort and page, read from the address bar.
// ---------------------------------------------------------------------------

export const CLIENT_STATUS_FILTERS = ["open", "active", "inactive", "archived", "all"] as const;
export type ClientStatusFilter = (typeof CLIENT_STATUS_FILTERS)[number];

export const CLIENT_STATUS_FILTER_LABELS: Record<ClientStatusFilter, string> = {
  open: "Active and inactive",
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
  all: "All clients",
};

export const CLIENT_SORTS = ["updated", "name", "newest"] as const;
export type ClientSort = (typeof CLIENT_SORTS)[number];

export const CLIENT_SORT_LABELS: Record<ClientSort, string> = {
  updated: "Recently updated",
  name: "Name (A to Z)",
  newest: "Newest first",
};

export const CLIENTS_PER_PAGE = 20;

export type ClientListParams = {
  q: string;
  status: ClientStatusFilter;
  sort: ClientSort;
  page: number;
};

/**
 * The list's settings from the URL. Anything missing or invalid quietly
 * falls back to the default, so an edited or old link still works.
 */
export function parseClientListParams(
  params: Record<string, string | string[] | undefined>,
): ClientListParams {
  return {
    q: (firstParam(params.q) ?? "").trim().slice(0, 100),
    status: choiceParam(params.status, CLIENT_STATUS_FILTERS, "open"),
    sort: choiceParam(params.sort, CLIENT_SORTS, "updated"),
    page: pageParam(params.page),
  };
}

/** The list's URL for some settings, leaving defaults out to keep it short. */
export function clientListHref(params: Partial<ClientListParams>) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status && params.status !== "open") search.set("status", params.status);
  if (params.sort && params.sort !== "updated") search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/clients?${query}` : "/clients";
}
