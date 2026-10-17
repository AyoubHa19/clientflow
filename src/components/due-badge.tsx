import { AlarmClockIcon, CalendarClockIcon } from "lucide-react";
import { dueState } from "@/lib/dates";
import { cn } from "@/lib/utils";

const badge =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset";

/**
 * "Overdue by 3 days", "Due today" or "Due in 2 days", against today in the
 * workspace's time zone. Nothing for later dates or finished work.
 */
export function DueBadge({
  due,
  today,
  finished,
}: {
  /** "YYYY-MM-DD" or null. */
  due: string | null;
  /** Today in the workspace's time zone, "YYYY-MM-DD". */
  today: string;
  finished: boolean;
}) {
  const state = dueState(due, today, finished);
  if (!state || state.kind === "later") return null;
  if (state.kind === "overdue") {
    return (
      <span className={cn(badge, "bg-destructive/10 text-destructive ring-destructive/25")}>
        <AlarmClockIcon aria-hidden className="size-3" />
        Overdue by {state.days} {state.days === 1 ? "day" : "days"}
      </span>
    );
  }
  return (
    <span className={cn(badge, "bg-warning/10 text-warning ring-warning/25")}>
      <CalendarClockIcon aria-hidden className="size-3" />
      {state.kind === "today"
        ? "Due today"
        : `Due in ${state.days} ${state.days === 1 ? "day" : "days"}`}
    </span>
  );
}
