import { z } from "zod";

// Client rules, shared by the forms and the server (which checks again).

export const CLIENT_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

export const CLIENT_LIMITS = { name: 200, email: 320, phone: 50, company: 200, notes: 5000 };

/** An optional text field: trimmed, and empty means "none" (null). */
function optionalText(max: number, tooLong: string) {
  return z
    .string()
    .trim()
    .max(max, { error: tooLong })
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));
}

export const clientSchema = z.object({
  name: z
    .string({ error: "Enter the client's name." })
    .trim()
    .min(1, { error: "Enter the client's name." })
    .max(CLIENT_LIMITS.name, { error: `Use ${CLIENT_LIMITS.name} characters or fewer.` }),
  email: optionalText(CLIENT_LIMITS.email, "That email address is too long.")
    .transform((value) => value?.toLowerCase() ?? null)
    .refine((value) => value === null || z.email().safeParse(value).success, {
      error: "Enter a valid email address, or leave it empty.",
    }),
  phone: optionalText(
    CLIENT_LIMITS.phone,
    `Use ${CLIENT_LIMITS.phone} characters or fewer.`,
  ).refine((value) => value === null || /^\+?[0-9\s().-]*[0-9][0-9\s().-]*$/.test(value), {
    error: "Use digits, spaces and + - ( ) only.",
  }),
  company: optionalText(CLIENT_LIMITS.company, `Use ${CLIENT_LIMITS.company} characters or fewer.`),
  notes: optionalText(CLIENT_LIMITS.notes, `Use ${CLIENT_LIMITS.notes} characters or fewer.`),
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

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * The list's settings from the URL. Anything missing or invalid quietly
 * falls back to the default, so an edited or old link still works.
 */
export function parseClientListParams(
  params: Record<string, string | string[] | undefined>,
): ClientListParams {
  const q = (first(params.q) ?? "").trim().slice(0, 100);
  const status = first(params.status);
  const sort = first(params.sort);
  const page = Number(first(params.page));
  return {
    q,
    status: (CLIENT_STATUS_FILTERS as readonly string[]).includes(status ?? "")
      ? (status as ClientStatusFilter)
      : "open",
    sort: (CLIENT_SORTS as readonly string[]).includes(sort ?? "")
      ? (sort as ClientSort)
      : "updated",
    page: Number.isInteger(page) && page >= 1 && page <= 100_000 ? page : 1,
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
