import { AlarmClockIcon, CalendarClockIcon } from "lucide-react";
import { dueState } from "@/lib/dates";
import {
  isFinishedProject,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/lib/validation/project";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  PLANNING: "bg-secondary text-secondary-foreground ring-border",
  IN_PROGRESS: "bg-brand-soft text-brand ring-brand/25",
  ON_HOLD: "bg-warning/10 text-warning ring-warning/25",
  COMPLETED: "bg-success/10 text-success ring-success/25",
  CANCELLED: "bg-transparent text-muted-foreground ring-border",
};

const badge =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset";

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={cn(badge, STATUS_STYLES[status])}>{PROJECT_STATUS_LABELS[status]}</span>;
}

/**
 * "Overdue by 3 days", "Due today" or "Due in 2 days", against today in the
 * workspace's time zone. Nothing for later dates or finished projects.
 */
export function DueBadge({
  due,
  today,
  status,
}: {
  due: string | null;
  today: string;
  status: ProjectStatus;
}) {
  const state = dueState(due, today, isFinishedProject(status));
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
