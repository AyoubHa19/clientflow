import Link from "next/link";
import { CalendarCheckIcon, FolderKanbanIcon, ListChecksIcon } from "lucide-react";
import { DueBadge } from "@/components/due-badge";
import { formatDateOnly } from "@/lib/dates";
import { DEADLINE_DAYS, type Dashboard } from "@/server/dashboard/service";

/** Unfinished projects and tasks due soon (overdue first). */
export function Deadlines({
  deadlines,
  today,
}: {
  deadlines: Dashboard["deadlines"];
  today: string;
}) {
  return (
    <section aria-labelledby="deadlines-title" className="rounded-xl border bg-card p-4">
      <h2 id="deadlines-title" className="font-medium">
        Coming up
      </h2>
      <p className="text-sm text-muted-foreground">
        Overdue and due in the next {DEADLINE_DAYS} days
      </p>
      {deadlines.length === 0 ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarCheckIcon aria-hidden className="size-4" />
          Nothing due soon.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-[minmax(0,1fr)] divide-y">
          {deadlines.map((deadline) => {
            const Icon = deadline.kind === "project" ? FolderKanbanIcon : ListChecksIcon;
            return (
              <li key={`${deadline.kind}-${deadline.id}`} className="flex items-start gap-3 py-2.5">
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/${deadline.kind === "project" ? "projects" : "tasks"}/${deadline.id}`}
                    className="block truncate text-sm font-medium underline-offset-4 hover:underline"
                  >
                    <span className="sr-only">
                      {deadline.kind === "project" ? "Project: " : "Task: "}
                    </span>
                    {deadline.name}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {deadline.context && (
                      <span className="max-w-48 truncate">{deadline.context}</span>
                    )}
                    <span>Due {formatDateOnly(deadline.due)}</span>
                    <DueBadge due={deadline.due} today={today} finished={false} />
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
