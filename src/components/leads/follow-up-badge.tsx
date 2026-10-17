import { AlarmClockIcon, BellRingIcon, CalendarClockIcon, SnowflakeIcon } from "lucide-react";
import { followUpLabel, type FollowUpState } from "@/lib/followups";
import { cn } from "@/lib/utils";

const STYLES = {
  overdue: {
    icon: AlarmClockIcon,
    className: "bg-destructive/10 text-destructive ring-destructive/25",
  },
  today: { icon: BellRingIcon, className: "bg-warning/10 text-warning ring-warning/25" },
  scheduled: { icon: CalendarClockIcon, className: "bg-brand-soft text-brand ring-brand/25" },
  cold: { icon: SnowflakeIcon, className: "bg-muted text-muted-foreground ring-border" },
} as const;

/**
 * Where a lead's follow-up stands, in words ("Follow up today", "No contact
 * for 20 days"). Nothing for won and lost leads, or when nothing is planned
 * and the lead isn't cold; `showScheduled={false}` also hides follow-ups
 * planned for later.
 */
export function FollowUpBadge({
  state,
  showScheduled = true,
  className,
}: {
  state: FollowUpState | null;
  /** False on the board, where only what needs doing is shown. */
  showScheduled?: boolean;
  className?: string;
}) {
  if (!state || state.kind === "none") return null;
  if (state.kind === "scheduled" && !showScheduled) return null;
  const { icon: Icon, className: tone } = STYLES[state.kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        tone,
        className,
      )}
    >
      <Icon aria-hidden className="size-3" />
      {followUpLabel(state)}
    </span>
  );
}
