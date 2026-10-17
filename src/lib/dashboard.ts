import { daysBetween, formatDate, todayIn } from "./dates";

// Plain calculations behind the dashboard, kept here so they can be tested
// without a database.

/** Won leads out of the decided ones (won + lost), as a whole percent. */
export function conversionRate(won: number, lost: number): number | null {
  const decided = won + lost;
  return decided === 0 ? null : Math.round((won / decided) * 100);
}

/** Adds days to a "YYYY-MM-DD" day. */
export function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The Monday of the week containing `day` (weeks run Monday to Sunday). */
export function weekStart(day: string) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(day, -((weekday + 6) % 7));
}

/** The Mondays of the last `count` weeks, oldest first, ending this week. */
export function lastWeekStarts(today: string, count = 8) {
  const thisWeek = weekStart(today);
  return Array.from({ length: count }, (_, index) => addDays(thisWeek, -7 * (count - 1 - index)));
}

/** How many of `days` ("YYYY-MM-DD") fall in each week of `starts`. */
export function countByWeek(days: string[], starts: string[]) {
  const counts = starts.map((start) => ({ weekStart: start, count: 0 }));
  for (const day of days) {
    const index = starts.indexOf(weekStart(day));
    if (index >= 0) counts[index]!.count += 1;
  }
  return counts;
}

/**
 * The moment a calendar day starts in a time zone (for comparing with
 * timestamps such as `convertedAt` or `completedAt`).
 */
export function startOfDayInZone(day: string, timeZone: string) {
  const guess = new Date(`${day}T00:00:00Z`);
  // How far the zone's wall clock is from UTC at that moment.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(guess);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess.getTime() - (wall - guess.getTime()));
}

/** "just now", "5 minutes ago", "2 hours ago", "yesterday", "3 days ago", or a date. */
export function relativeTime(date: Date, now: Date, timeZone: string) {
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.round(minutes / 60);
  const days = daysBetween(todayIn(timeZone, date), todayIn(timeZone, now));
  if (hours < 24 && days === 0) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(date, timeZone);
}
