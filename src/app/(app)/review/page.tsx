import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  AlarmClockIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  FolderCheckIcon,
  MessageCircleIcon,
  TrophyIcon,
  type LucideIcon,
} from "lucide-react";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, weekStart } from "@/lib/dashboard";
import { formatDate, formatDateOnly, todayIn } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { comparedWithLastWeek, parseWeekParam, weekLabel } from "@/lib/review";
import { formatDuration } from "@/lib/time";
import { db } from "@/server/db";
import { getWeekReview } from "@/server/review/service";
import { requireWorkspace } from "@/server/workspace/context";

export const metadata: Metadata = { title: "Week in review" };

function Stat({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="grid min-w-0 content-start gap-1 surface p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon aria-hidden className="size-4 text-brand" />
        {label}
      </p>
      <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function Card({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="surface p-4 sm:p-5">
      <h2 id={id} className="mb-3 font-semibold">
        {title}
        {count !== undefined && <span className="text-muted-foreground"> ({count})</span>}
      </h2>
      {children}
    </section>
  );
}

const none = (text: string) => <p className="text-sm text-muted-foreground">{text}</p>;

async function Review({ searchParams }: { searchParams: PageProps<"/review">["searchParams"] }) {
  const ctx = await requireWorkspace();
  const tz = ctx.workspace.timezone;
  const today = todayIn(tz);
  const monday = parseWeekParam((await searchParams).week, today);
  const thisWeek = weekStart(today);
  const review = await getWeekReview(db, ctx, monday, today);
  const isThisWeek = monday === thisWeek;
  const longest = review.time[0]?.minutes ?? 0;

  return (
    <>
      <PageHeader
        title="Week in review"
        description={`${weekLabel(monday)}${isThisWeek ? " (this week, so far)" : ""}: what got done, what slipped and where the time went.`}
        actions={
          <nav aria-label="Weeks" className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/review?week=${addDays(monday, -7)}`}>
                <ChevronLeftIcon aria-hidden data-icon="inline-start" />
                Previous week
              </Link>
            </Button>
            {!isThisWeek && (
              <>
                <Button asChild variant="outline">
                  <Link href={`/review?week=${addDays(monday, 7)}`}>
                    Next week
                    <ChevronRightIcon aria-hidden data-icon="inline-end" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/review">This week</Link>
                </Button>
              </>
            )}
          </nav>
        }
      />

      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 lg:grid-cols-4">
        <Stat
          icon={CheckCircle2Icon}
          label="Tasks done"
          value={String(review.done.length)}
          note={comparedWithLastWeek(review.done.length, review.doneLastWeek)}
        />
        <Stat
          icon={ClockIcon}
          label="Time logged"
          value={formatDuration(review.minutes)}
          note={comparedWithLastWeek(review.minutes, review.minutesLastWeek, formatDuration)}
        />
        <Stat
          icon={MessageCircleIcon}
          label="Leads contacted"
          value={String(review.leads.contacted)}
          note={`${review.leads.added} new ${review.leads.added === 1 ? "lead" : "leads"} added`}
        />
        <Stat
          icon={TrophyIcon}
          label="Leads won"
          value={String(review.leads.won)}
          note={
            review.leads.wonValue > 0
              ? `Worth ${formatMoney(review.leads.wonValue, ctx.workspace.currency)}`
              : "No value entered"
          }
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Card id="done-title" title="Done" count={review.done.length}>
          {review.done.length === 0 ? (
            none("No tasks finished this week.")
          ) : (
            <ul className="grid gap-2">
              {review.done.map((task) => (
                <li key={task.id} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                  <span className="min-w-0">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="break-words underline-offset-4 hover:underline"
                    >
                      {task.title}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {task.project ? `${task.project.name} · ` : ""}
                      {task.completedAt && formatDate(task.completedAt, tz)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-4">
          <Card id="slipped-title" title="Slipped" count={review.slipped.length}>
            {review.slipped.length === 0 ? (
              none("Nothing that was due this week is still waiting.")
            ) : (
              <ul className="grid gap-2">
                {review.slipped.map((task) => (
                  <li key={task.id} className="flex items-start gap-2.5 text-sm">
                    <AlarmClockIcon
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-destructive"
                    />
                    <span className="min-w-0">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="break-words underline-offset-4 hover:underline"
                      >
                        {task.title}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {task.project ? `${task.project.name} · ` : ""}
                        Was due {task.dueDate && formatDateOnly(task.dueDate)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            id="completed-title"
            title="Projects completed"
            count={review.projectsCompleted.length}
          >
            {review.projectsCompleted.length === 0 ? (
              none("No project was completed this week.")
            ) : (
              <ul className="grid gap-2">
                {review.projectsCompleted.map((entry) => (
                  <li key={entry.entityId} className="flex items-start gap-2.5 text-sm">
                    <FolderCheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                    <Link
                      href={`/projects/${entry.entityId}`}
                      className="break-words underline-offset-4 hover:underline"
                    >
                      {entry.summary}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card id="time-title" title="Where the time went">
        {review.time.length === 0 ? (
          none("No time logged this week.")
        ) : (
          <ul className="grid gap-3">
            {review.time.map((row) => (
              <li key={row.projectId} className="grid gap-1.5 text-sm">
                <span className="flex items-baseline justify-between gap-3">
                  <Link
                    href={`/projects/${row.projectId}`}
                    className="min-w-0 truncate underline-offset-4 hover:underline"
                  >
                    {row.name}
                  </Link>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatDuration(row.minutes)}
                  </span>
                </span>
                <span aria-hidden className="h-2 overflow-clip rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-brand"
                    style={{ width: `${Math.max(2, (row.minutes / longest) * 100)}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function ReviewPage({ searchParams }: PageProps<"/review">) {
  return (
    <PageContainer>
      <Suspense
        fallback={
          <div className="grid gap-4" aria-hidden>
            <Skeleton className="h-8 w-56" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-24 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        }
      >
        <Review searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}
