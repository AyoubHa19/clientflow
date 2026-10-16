import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** What a list or page shows when there's nothing in it yet. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="max-w-sm">
        <h2 className="font-medium">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-pretty text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
