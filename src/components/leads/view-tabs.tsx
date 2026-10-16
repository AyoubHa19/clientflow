import Link from "next/link";
import { KanbanSquareIcon, ListIcon } from "lucide-react";
import { leadsHref, type LeadListParams } from "@/lib/validation/lead";
import { cn } from "@/lib/utils";

/** Board or list: two links that keep the search and source. */
export function LeadViewTabs({ params }: { params: LeadListParams }) {
  const views = [
    { view: "board" as const, label: "Board", icon: KanbanSquareIcon },
    { view: "list" as const, label: "List", icon: ListIcon },
  ];
  return (
    <nav aria-label="Lead views" className="flex w-fit gap-1 rounded-lg bg-muted p-1">
      {views.map(({ view, label, icon: Icon }) => {
        const current = params.view === view;
        return (
          <Link
            key={view}
            href={leadsHref({ view, q: params.q, source: params.source })}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              current && "bg-card text-foreground shadow-xs",
            )}
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
