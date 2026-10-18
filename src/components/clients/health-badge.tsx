import { HEALTH_LABELS, type HealthLevel } from "@/lib/health";
import { cn } from "@/lib/utils";

const STYLES: Record<HealthLevel, string> = {
  good: "bg-success/10 text-success ring-success/25",
  watch: "bg-warning/10 text-warning ring-warning/25",
  risk: "bg-destructive/10 text-destructive ring-destructive/25",
  unknown: "bg-transparent text-muted-foreground ring-border",
};

const DOTS: Record<HealthLevel, string> = {
  good: "bg-success",
  watch: "bg-warning",
  risk: "bg-destructive",
  unknown: "bg-muted-foreground/50",
};

/** A client's health in a word (with a dot); the reasons are on their page. */
export function HealthBadge({ level, className }: { level: HealthLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        STYLES[level],
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", DOTS[level])} />
      <span className="sr-only">Health: </span>
      {HEALTH_LABELS[level]}
    </span>
  );
}
