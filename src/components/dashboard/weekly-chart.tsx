import { formatDateOnly } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Dashboard } from "@/server/dashboard/service";

const short = (day: string) => formatDateOnly(day).replace(/ \d{4}$/, "");

/**
 * Tasks completed per week, last 8 weeks. Drawn with plain elements; a
 * hidden table gives screen readers the same numbers.
 */
export function WeeklyChart({ weekly }: { weekly: Dashboard["weekly"] }) {
  const max = Math.max(1, ...weekly.map((week) => week.count));
  const total = weekly.reduce((sum, week) => sum + week.count, 0);

  return (
    <section aria-labelledby="weekly-title" className="surface p-4">
      <h2 id="weekly-title" className="font-medium">
        Tasks completed
      </h2>
      <p className="text-sm text-muted-foreground">{total} in the last 8 weeks</p>
      <div aria-hidden className="mt-4 flex h-40 items-end gap-2">
        {weekly.map((week, index) => (
          <div
            key={week.weekStart}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-xs text-muted-foreground tabular-nums">{week.count || ""}</span>
            <div
              className={
                index === weekly.length - 1
                  ? "w-full rounded-t-md bg-brand"
                  : "w-full rounded-t-md bg-chart-3/70"
              }
              style={{ height: `${Math.max((week.count / max) * 100, week.count ? 6 : 2)}%` }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden className="mt-1 flex gap-2">
        {/* Every other date on narrow screens, where all 8 don't fit. */}
        {weekly.map((week, index) => (
          <span
            key={week.weekStart}
            className={cn(
              "min-w-0 flex-1 text-center text-[0.65rem] whitespace-nowrap text-muted-foreground",
              index % 2 === 0 && "max-sm:invisible",
            )}
          >
            {short(week.weekStart)}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Tasks completed per week, last 8 weeks</caption>
        <thead>
          <tr>
            <th scope="col">Week starting</th>
            <th scope="col">Tasks completed</th>
          </tr>
        </thead>
        <tbody>
          {weekly.map((week) => (
            <tr key={week.weekStart}>
              <td>{formatDateOnly(week.weekStart)}</td>
              <td>{week.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
