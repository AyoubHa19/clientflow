import { TASK_PRIORITY_LABELS, type TaskPriority } from "@/lib/validation/task";
import { cn } from "@/lib/utils";

const badge =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset";

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  HIGH: "bg-destructive/10 text-destructive ring-destructive/25",
  MEDIUM: "bg-secondary text-secondary-foreground ring-border",
  LOW: "bg-transparent text-muted-foreground ring-border",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={cn(badge, PRIORITY_STYLES[priority])}>
      {TASK_PRIORITY_LABELS[priority]}
      <span className="sr-only"> priority</span>
    </span>
  );
}

export function InProgressBadge() {
  return <span className={cn(badge, "bg-brand-soft text-brand ring-brand/25")}>In progress</span>;
}
