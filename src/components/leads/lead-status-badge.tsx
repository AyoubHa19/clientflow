import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/validation/lead";
import { cn } from "@/lib/utils";

export const LEAD_STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-brand-soft text-brand ring-brand/25",
  CONTACTED: "bg-warning/10 text-warning ring-warning/25",
  QUALIFIED: "bg-secondary text-secondary-foreground ring-border",
  WON: "bg-success/10 text-success ring-success/25",
  LOST: "bg-transparent text-muted-foreground ring-border",
};

/** A lead's stage as a small label (the word carries it, not the colour). */
export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        LEAD_STATUS_STYLES[status],
      )}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
