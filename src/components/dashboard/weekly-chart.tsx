import { formatDateOnly } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Dashboard } from "@/server/dashboard/service";

const short = (day: string) => formatDateOnly(day).replace(/ \d{4}$/, "");

/**
 * Tasks completed per week, last 8 weeks: pill bars with a gradient that
 * grow in one after another, each on its own faint track, this week's bar
 * lit. A dashed line marks the weekly average. A hidden table gives screen
 * readers the same numbers.
 */
export function WeeklyChart({ weekly }: { weekly: Dashboard["weekly"] }) {
  const max = Math.max(1, ...weekly.map((week) => week.count));
  const total = weekly.reduce((sum, week) => sum + week.count, 0);
  const average = total / Math.max(1, weekly.length);
  const best = weekly.reduce((top, week) => (week.count > top.count ? week : top), weekly[0]!);

  return (
    <section aria-labelledby="weekly-title" className="spotlight relative surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="weekly-title" className="font-semibold">
            Tasks completed
          </h2>
          <p className="text-sm text-muted-foreground">{total} in the last 8 weeks</p>
        </div>
        {best.count > 0 && (
          <p className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
            Best week: {short(best.weekStart)} ({best.count})
          </p>
        )}
      </div>

      <div aria-hidden className="relative mt-5 h-44">
        {average > 0 && (
          <div
            className="absolute inset-x-0 border-t border-dashed border-brand/40"
            style={{ bottom: `calc(${(average / max) * 100}% * 0.82 + 1.25rem)` }}
          >
            <span className="absolute -top-2.5 right-0 rounded-full bg-(--surface-fill) px-1.5 text-[0.6rem] text-muted-foreground">
              avg {average.toFixed(1)}
            </span>
          </div>
        )}
        <div className="flex h-full items-end gap-2 sm:gap-3">
          {weekly.map((week, index) => {
            const current = index === weekly.length - 1;
            const height = week.count ? Math.max((week.count / max) * 82, 8) : 0;
            return (
              <div key={week.weekStart} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <div className="relative flex h-[82%] items-end overflow-visible rounded-full bg-muted/50">
                  {week.count > 0 && (
                    <span
                      className={cn(
                        "absolute left-1/2 -translate-x-1/2 rounded-full px-1.5 text-[0.65rem] font-semibold tabular-nums",
                        current ? "bg-brand text-brand-foreground" : "text-muted-foreground",
                      )}
                      style={{ bottom: `calc(${(height / 82) * 100}% + 0.35rem)` }}
                    >
                      {week.count}
                    </span>
                  )}
                  <div
                    className={cn(
                      "bar-grow w-full rounded-full bg-linear-to-t",
                      current
                        ? "from-brand to-chart-2 shadow-[0_0_18px_-2px_var(--brand)]"
                        : "from-chart-3/60 to-chart-2/60",
                    )}
                    style={{
                      height: `${(height / 82) * 100}%`,
                      animationDelay: `${index * 60}ms`,
                    }}
                  />
                </div>
                {/* Every other date on narrow screens, where all 8 don't fit. */}
                <span
                  className={cn(
                    "mt-2 h-4 text-center text-[0.65rem] whitespace-nowrap text-muted-foreground",
                    index % 2 === 0 && "max-sm:invisible",
                    current && "font-semibold text-foreground",
                  )}
                >
                  {short(week.weekStart)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* sr-only on a wrapper: a table can't shrink to 1px, and widened the page on phones. */}
      <div className="sr-only">
        <table>
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
      </div>
    </section>
  );
}
