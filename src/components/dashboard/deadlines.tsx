import Link from "next/link";
import { CalendarCheckIcon, FolderKanbanIcon, ListChecksIcon } from "lucide-react";
import { DueBadge } from "@/components/due-badge";
import { dueState, formatDateOnly } from "@/lib/dates";
import { DEADLINE_DAYS, type Dashboard } from "@/server/dashboard/service";

/** Unfinished projects and tasks due soon (overdue first), as a table. */
export function Deadlines({
  deadlines,
  today,
}: {
  deadlines: Dashboard["deadlines"];
  today: string;
}) {
  return (
    <section aria-labelledby="deadlines-title" className="spotlight relative surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="deadlines-title" className="font-semibold">
            Coming up
          </h2>
          <p className="text-sm text-muted-foreground">
            Overdue and due in the next {DEADLINE_DAYS} days
          </p>
        </div>
        <Link
          href="/tasks?due=week"
          className="shrink-0 text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          This week&apos;s tasks
        </Link>
      </div>
      {deadlines.length === 0 ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarCheckIcon aria-hidden className="size-4" />
          Nothing due soon.
        </p>
      ) : (
        <div className="mt-4 overflow-clip rounded-xl border border-(--surface-edge) bg-(--surface-fill)">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  What
                </th>
                <th scope="col" className="hidden w-32 px-3 py-2.5 font-medium sm:table-cell">
                  Due
                </th>
                <th scope="col" className="w-36 px-3 py-2.5 text-right font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {deadlines.map((deadline) => {
                const Icon = deadline.kind === "project" ? FolderKanbanIcon : ListChecksIcon;
                const state = dueState(deadline.due, today, false);
                return (
                  <tr
                    key={`${deadline.kind}-${deadline.id}`}
                    className="transition-colors hover:bg-brand-soft/40"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Icon aria-hidden className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/${deadline.kind === "project" ? "projects" : "tasks"}/${deadline.id}`}
                            className="block truncate font-medium underline-offset-4 hover:underline"
                          >
                            <span className="sr-only">
                              {deadline.kind === "project" ? "Project: " : "Task: "}
                            </span>
                            {deadline.name}
                          </Link>
                          {deadline.context && (
                            <p className="truncate text-xs text-muted-foreground">
                              {deadline.context}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-3 py-2.5 text-muted-foreground sm:table-cell">
                      {formatDateOnly(deadline.due)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {state?.kind === "later" ? (
                        <span className="text-xs text-muted-foreground">
                          Due {formatDateOnly(deadline.due)}
                        </span>
                      ) : (
                        <DueBadge due={deadline.due} today={today} finished={false} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
