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
