import { CLIENT_STATUS_LABELS, type ClientStatus } from "@/lib/validation/client";
import { cn } from "@/lib/utils";

const STYLES: Record<ClientStatus, string> = {
  ACTIVE: "bg-success/10 text-success ring-success/25",
  INACTIVE: "bg-muted text-muted-foreground ring-border",
  ARCHIVED: "bg-transparent text-muted-foreground ring-border border-dashed",
};

/** A client's status as a small label (the word carries it, not the colour). */
export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        STYLES[status],
      )}
    >
      {CLIENT_STATUS_LABELS[status]}
    </span>
  );
}
