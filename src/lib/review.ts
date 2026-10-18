import { addDays, weekStart } from "./dashboard";
import { firstParam } from "./validation/fields";

// The weekly review (Stage 18): weeks run Monday to Sunday, in the
// workspace's time zone, like the dashboard's weekly chart.

/**
 * The week the review shows, from `?week=YYYY-MM-DD`: any day picks its
 * Monday. Missing, malformed or in the future: this week.
 */
export function parseWeekParam(value: string | string[] | undefined, today: string) {
  const thisWeek = weekStart(today);
  const text = (firstParam(value) ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return thisWeek;
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) return thisWeek;
  if (date.getUTCFullYear() < 2000) return thisWeek;
  const monday = weekStart(text);
  return monday > thisWeek ? thisWeek : monday;
}

/** "13 – 19 Oct 2026", or across months "29 Sept – 5 Oct 2026". */
export function weekLabel(monday: string) {
  const sunday = addDays(monday, 6);
  const format = (day: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(
      new Date(`${day}T00:00:00Z`),
    );
  const sameMonth = monday.slice(0, 7) === sunday.slice(0, 7);
  const sameYear = monday.slice(0, 4) === sunday.slice(0, 4);
  const start = format(
    monday,
    sameMonth
      ? { day: "numeric" }
      : sameYear
        ? { day: "numeric", month: "short" }
        : { day: "numeric", month: "short", year: "numeric" },
  );
  return `${start} – ${format(sunday, { day: "numeric", month: "short", year: "numeric" })}`;
}

/** From Friday to Sunday, the Today page invites a look back at the week. */
export function isReviewTime(today: string) {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  return weekday === 5 || weekday === 6 || weekday === 0;
}

/** "3 more than last week", "2 fewer than last week", "Same as last week". */
export function comparedWithLastWeek(now: number, before: number, unit?: (n: number) => string) {
  const difference = now - before;
  if (difference === 0) return "Same as last week";
  const amount = unit ? unit(Math.abs(difference)) : String(Math.abs(difference));
  return `${amount} ${difference > 0 ? "more" : unit ? "less" : "fewer"} than last week`;
}
