/**
 * A short date ("16 Oct 2026") in the workspace's time zone. The locale is
 * fixed so the server and the browser always print the same thing.
 */
export function formatDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(date);
}

// Calendar days (start and due dates) are DATE columns. Prisma hands them
// over as midnight UTC, so they are read and printed in UTC, never shifted
// by a time zone. "Today", on the other hand, depends on where the
// workspace is: that is what todayIn() is for.

/** A calendar day from the database as "YYYY-MM-DD". */
export function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** A calendar day ("YYYY-MM-DD" or a DATE value) as "16 Oct 2026". */
export function formatDateOnly(day: Date | string) {
  const date = typeof day === "string" ? new Date(`${day}T00:00:00Z`) : day;
  return formatDate(date, "UTC");
}

/** Today's date in a time zone, as "YYYY-MM-DD". */
export function todayIn(timeZone: string, now: Date = new Date()) {
  // en-CA prints dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Whole days from `from` to `to` (both "YYYY-MM-DD"); negative if earlier. */
export function daysBetween(from: string, to: string) {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export type DueState =
  | { kind: "overdue"; days: number }
  | { kind: "today" }
  | { kind: "soon"; days: number }
  | { kind: "later"; days: number };

/** Days within which a due date counts as "soon". */
export const DUE_SOON_DAYS = 7;

/**
 * How a due date stands against today, for work that isn't finished.
 * Returns null when there is no due date or the work is done.
 */
export function dueState(due: string | null, today: string, finished: boolean): DueState | null {
  if (!due || finished) return null;
  const days = daysBetween(today, due);
  if (days < 0) return { kind: "overdue", days: -days };
  if (days === 0) return { kind: "today" };
  if (days <= DUE_SOON_DAYS) return { kind: "soon", days };
  return { kind: "later", days };
}
