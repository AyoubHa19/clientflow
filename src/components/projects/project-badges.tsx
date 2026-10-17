import { DueBadge as SharedDueBadge } from "@/components/due-badge";
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

/** The due badge for a project (finished projects have none). */
export function DueBadge({
  due,
  today,
  status,
}: {
  due: string | null;
  today: string;
  status: ProjectStatus;
}) {
  return <SharedDueBadge due={due} today={today} finished={isFinishedProject(status)} />;
}
