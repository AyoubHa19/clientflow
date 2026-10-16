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

// Lead rules, shared by the forms, the board and the server.

/** The pipeline, in order: the board's columns from left to right. */
export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  WON: "Won",
  LOST: "Lost",
};

/** Offered in the source field; any other text is fine too. */
export const LEAD_SOURCE_SUGGESTIONS = [
  "Website",
  "Referral",
  "LinkedIn",
  "Instagram",
  "Event",
  "Other",
] as const;

export const LEAD_LIMITS = { ...CONTACT_LIMITS, source: 100 };

export const leadSchema = z.object({
  contactName: requiredName("Enter the contact's name."),
  company: optionalText(LEAD_LIMITS.company),
  email: optionalEmail,
  phone: optionalPhone,
  source: optionalText(LEAD_LIMITS.source),
  notes: optionalText(LEAD_LIMITS.notes),
  status: z.enum(LEAD_STATUSES, { error: "Choose a status from the list." }).default("NEW"),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const leadStatusSchema = z.enum(LEAD_STATUSES, {
  error: "Choose a status from the list.",
});

// ---------------------------------------------------------------------------
// The board and the list, read from the address bar.
// ---------------------------------------------------------------------------

export const LEAD_VIEWS = ["board", "list"] as const;
export type LeadView = (typeof LEAD_VIEWS)[number];

export const LEAD_STATUS_FILTERS = [
  "all",
  "open",
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
] as const;
export type LeadStatusFilter = (typeof LEAD_STATUS_FILTERS)[number];

export const LEAD_STATUS_FILTER_LABELS: Record<LeadStatusFilter, string> = {
  all: "All leads",
  open: "Open (new, contacted, qualified)",
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
};

export const LEAD_SORTS = ["updated", "name", "newest"] as const;
export type LeadSort = (typeof LEAD_SORTS)[number];

export const LEAD_SORT_LABELS: Record<LeadSort, string> = {
  updated: "Recently updated",
  name: "Name (A to Z)",
  newest: "Newest first",
};

export const LEADS_PER_PAGE = 20;
/** Cards per board column; the rest are a click away in the list. */
export const LEADS_PER_COLUMN = 50;

export type LeadListParams = {
  view: LeadView;
  q: string;
  status: LeadStatusFilter;
  source: string;
  sort: LeadSort;
  page: number;
};

/** The settings from the URL; anything odd falls back to the default. */
export function parseLeadListParams(
  params: Record<string, string | string[] | undefined>,
): LeadListParams {
  return {
    view: choiceParam(params.view, LEAD_VIEWS, "board"),
    q: (firstParam(params.q) ?? "").trim().slice(0, 100),
    status: choiceParam(params.status, LEAD_STATUS_FILTERS, "all"),
    source: (firstParam(params.source) ?? "").trim().slice(0, LEAD_LIMITS.source),
    sort: choiceParam(params.sort, LEAD_SORTS, "updated"),
    page: pageParam(params.page),
  };
}

/** The leads URL for some settings, leaving defaults out. */
export function leadsHref(params: Partial<LeadListParams>) {
  const search = new URLSearchParams();
  if (params.view === "list") search.set("view", "list");
  if (params.q) search.set("q", params.q);
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.source) search.set("source", params.source);
  if (params.sort && params.sort !== "updated") search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/leads?${query}` : "/leads";
}
