import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRightIcon, CalendarCheckIcon, ClockIcon, SparklesIcon } from "lucide-react";
import { FollowUps } from "@/components/dashboard/follow-ups";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { TaskList } from "@/components/tasks/task-list";
import { toTaskItems } from "@/components/tasks/to-task-items";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { todayIn } from "@/lib/dates";
import { isReviewTime } from "@/lib/review";
import { formatDuration } from "@/lib/time";
import { db } from "@/server/db";
import { COMING_DAYS, getToday } from "@/server/review/service";
import { requireWorkspace } from "@/server/workspace/context";

export const metadata: Metadata = { title: "Today" };

/** A card with a heading, its count, and a link to everything. */
function Section({
  id,
  title,
  count,
  more,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  more?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="spotlight relative surface p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 id={id} className="font-semibold">
          {title}
          {count !== undefined && <span className="text-muted-foreground"> ({count})</span>}
        </h2>
        {more && (
          <Link
            href={more.href}
            className="shrink-0 text-sm font-medium text-brand underline-offset-4 hover:underline"
          >
            {more.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <CalendarCheckIcon aria-hidden className="size-4" />
      {children}
    </p>
  );
}

async function Today() {
  const ctx = await requireWorkspace();
  const today = todayIn(ctx.workspace.timezone);
  const data = await getToday(db, ctx, today);
  const dayName = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${today}T00:00:00Z`));
  const toFollow = data.leads.dueTotal + data.leads.coldTotal;

  return (
    <>
      <PageHeader
        title="Today"
        description={`${dayName}: ${data.due.total} ${data.due.total === 1 ? "task" : "tasks"} due or late, ${toFollow} ${toFollow === 1 ? "lead" : "leads"} to follow up.`}
        actions={
          <Button asChild variant="outline">
            <Link href="/review">
              <SparklesIcon aria-hidden data-icon="inline-start" />
              Week in review
            </Link>
          </Button>
        }
      />

      {isReviewTime(today) && (
        <Link
          href="/review"
          className="group flex items-center gap-3 surface p-4 text-sm outline-none hover:bg-brand-soft/40 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <SparklesIcon aria-hidden className="size-5 shrink-0 text-brand" />
          <span className="flex-1">
            <span className="font-medium">The week is nearly over.</span>{" "}
            <span className="text-muted-foreground">
              See what you got done, what slipped and where your time went.
            </span>
          </span>
          <ArrowRightIcon
            aria-hidden
            className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4">
          <Section
            id="due-title"
            title="Due today or late"
            count={data.due.total}
            more={
              data.due.total > data.due.items.length
                ? { href: "/tasks?due=overdue", label: "All late tasks" }
                : undefined
            }
          >
            {data.due.items.length === 0 ? (
              <Empty>Nothing due today. A good day to get ahead.</Empty>
            ) : (
              <TaskList tasks={toTaskItems(data.due.items)} today={today} />
            )}
          </Section>
          <Section
            id="coming-title"
            title={`Coming in the next ${COMING_DAYS} days`}
            count={data.coming.total}
            more={{ href: "/tasks?due=week", label: "All tasks" }}
          >
            {data.coming.items.length === 0 ? (
              <Empty>Nothing due in the next {COMING_DAYS} days.</Empty>
            ) : (
              <TaskList tasks={toTaskItems(data.coming.items)} today={today} />
            )}
          </Section>
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4">
          <section aria-labelledby="time-title" className="spotlight relative surface p-4 sm:p-5">
            <h2 id="time-title" className="flex items-center gap-2 font-semibold">
              <ClockIcon aria-hidden className="size-4 text-brand" />
              Time logged
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <dt className="text-sm text-muted-foreground">Today</dt>
                <dd className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatDuration(data.minutesToday)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">This week</dt>
                <dd className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatDuration(data.minutesThisWeek)}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              Start a timer from any project&apos;s page.
            </p>
          </section>
          <FollowUps data={data.leads} today={today} />
        </div>
      </div>
    </>
  );
}

function TodayFallback() {
  return (
    <div className="grid gap-4" aria-hidden>
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export default function TodayPage() {
  return (
    <PageContainer>
      <Suspense fallback={<TodayFallback />}>
        <Today />
      </Suspense>
    </PageContainer>
  );
}
