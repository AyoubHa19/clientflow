import Link from "next/link";
import { FolderKanbanIcon, ListChecksIcon, TargetIcon, UsersIcon } from "lucide-react";
import type { ActivityEntity } from "@/generated/prisma/enums";
import { relativeTime } from "@/lib/dashboard";
import { formatDate } from "@/lib/dates";
import type { ActivityItem } from "@/server/dashboard/service";

const ICONS: Record<ActivityEntity, typeof UsersIcon> = {
  CLIENT: UsersIcon,
  LEAD: TargetIcon,
  PROJECT: FolderKanbanIcon,
  TASK: ListChecksIcon,
};

/** What happened, newest first: who, what, and when. */
export function ActivityFeed({
  items,
  timeZone,
  now,
}: {
  items: ActivityItem[];
  timeZone: string;
  now: Date;
}) {
  return (
    <ol className="grid grid-cols-[minmax(0,1fr)] divide-y">
      {items.map((item) => {
        const Icon = ICONS[item.entityType];
        return (
          <li key={item.id} className="flex items-start gap-3 py-2.5">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon aria-hidden className="size-3.5 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm break-words">
                {item.href ? (
                  <Link href={item.href} className="underline-offset-4 hover:underline">
                    {item.summary}
                  </Link>
                ) : (
                  item.summary
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.actor ?? "Someone"} ·{" "}
                <time
                  dateTime={item.createdAt.toISOString()}
                  title={formatDate(item.createdAt, timeZone)}
                >
                  {relativeTime(item.createdAt, now, timeZone)}
                </time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
