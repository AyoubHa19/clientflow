import Link from "next/link";
import { Suspense } from "react";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Deadlines } from "@/components/dashboard/deadlines";
import { GettingStarted } from "@/components/dashboard/getting-started";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { LeadFunnel } from "@/components/dashboard/lead-funnel";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { todayIn } from "@/lib/dates";
import { getDashboard, listActivity } from "@/server/dashboard/service";
import { db } from "@/server/db";
import { requireWorkspace } from "@/server/workspace/context";

async function Overview() {
  const { user, workspace, ...rest } = await requireWorkspace();
  const ctx = { user, workspace, ...rest };
  const now = new Date();
  const today = todayIn(workspace.timezone, now);
  const [dashboard, activity] = await Promise.all([
    getDashboard(db, ctx, today),
    listActivity(db, ctx, { type: "all", page: 1, perPage: 8 }),
  ]);
  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;
  const allStarted = Object.values(dashboard.started).every(Boolean);

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description={`Here's what's happening in ${workspace.name}.`}
      />
      {!allStarted && <GettingStarted started={dashboard.started} />}
      <KpiCards counts={dashboard.counts} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Deadlines deadlines={dashboard.deadlines} today={today} />
        <LeadFunnel funnel={dashboard.funnel} conversion={dashboard.conversion} />
        <WeeklyChart weekly={dashboard.weekly} />
        <section aria-labelledby="activity-title" className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 id="activity-title" className="font-medium">
              Recent activity
            </h2>
            {activity.total > 0 && (
              <Link
                href="/activity"
                className="text-sm font-medium text-brand underline-offset-4 hover:underline"
              >
                See all
              </Link>
            )}
          </div>
          {activity.items.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Nothing yet: changes show up here.</p>
          ) : (
            <ActivityFeed items={activity.items} timeZone={workspace.timezone} now={now} />
          )}
        </section>
      </div>
    </>
  );
}

function OverviewFallback() {
  return (
    <div className="grid gap-4" aria-hidden>
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <PageContainer>
      <Suspense fallback={<OverviewFallback />}>
        <Overview />
      </Suspense>
    </PageContainer>
  );
}
