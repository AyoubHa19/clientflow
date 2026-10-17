import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HistoryIcon } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { choiceParam, pageParam } from "@/lib/validation/fields";
import { cn } from "@/lib/utils";
import { ACTIVITY_TYPES, listActivity, type ActivityType } from "@/server/dashboard/service";
import { db } from "@/server/db";
import { requireWorkspace } from "@/server/workspace/context";

export const metadata: Metadata = { title: "Activity" };

const TYPE_LABELS: Record<ActivityType, string> = {
  all: "Everything",
  client: "Clients",
  lead: "Leads",
  project: "Projects",
  task: "Tasks",
};

const hrefFor = (type: ActivityType, page = 1) => {
  const search = new URLSearchParams();
  if (type !== "all") search.set("type", type);
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `/activity?${query}` : "/activity";
};

async function Activity({
  searchParams,
}: {
  searchParams: PageProps<"/activity">["searchParams"];
}) {
  const ctx = await requireWorkspace();
  const params = await searchParams;
  const type = choiceParam(params.type, ACTIVITY_TYPES, "all");
  const now = new Date();
  const result = await listActivity(db, ctx, { type, page: pageParam(params.page) });

  return (
    <>
      <nav
        aria-label="Activity types"
        className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 sm:w-fit"
      >
        {ACTIVITY_TYPES.map((value) => (
          <Link
            key={value}
            href={hrefFor(value)}
            aria-current={value === type ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              value === type && "bg-card text-foreground shadow-xs",
            )}
          >
            {TYPE_LABELS[value]}
          </Link>
        ))}
      </nav>
      {result.total === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No activity yet"
          description="Changes you make show up here."
        />
      ) : (
        <>
          <div className="rounded-xl border px-4">
            <ActivityFeed items={result.items} timeZone={ctx.workspace.timezone} now={now} />
          </div>
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            pageSize={result.pageSize}
            total={result.total}
            noun={result.total === 1 ? "change" : "changes"}
            hrefFor={(page) => hrefFor(type, page)}
          />
        </>
      )}
    </>
  );
}

export default function ActivityPage({ searchParams }: PageProps<"/activity">) {
  return (
    <PageContainer>
      <PageHeader
        title="Activity"
        description="Everything that changed in your workspace, newest first."
      />
      <Suspense fallback={<Skeleton aria-hidden className="h-96 w-full rounded-xl" />}>
        <Activity searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
