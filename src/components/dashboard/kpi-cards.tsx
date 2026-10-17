import Link from "next/link";
import {
  FolderKanbanIcon,
  ListChecksIcon,
  TargetIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import type { Dashboard } from "@/server/dashboard/service";
import { CountUp } from "./count-up";
import { Sparkline } from "./sparkline";

function KpiCard({
  href,
  label,
  value,
  icon: Icon,
  trend,
  noun,
  children,
}: {
  href: string;
  label: string;
  value: number;
  icon: LucideIcon;
  /** Added per week, last 8 weeks. */
  trend: number[];
  noun: string;
  children?: React.ReactNode;
}) {
  const added = trend.reduce((sum, count) => sum + count, 0);
  return (
    <div
      data-spotlight
      className="spotlight group relative min-w-0 surface p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_oklch(0.3_0.08_265/45%)] has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand transition-transform duration-300 group-hover:scale-110">
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="text-xs text-muted-foreground">+{added} in 8 weeks</span>
      </div>
      <h2 className="mt-3 text-sm font-medium text-muted-foreground">
        {/* The whole card is the link (the ::after covers it). */}
        <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-xl">
          {label}
        </Link>
      </h2>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold tracking-tight">
          <CountUp value={value} />
        </p>
        <Sparkline values={trend} className="max-w-28" />
      </div>
      <span className="sr-only">
        {added} {noun} added in the last 8 weeks.
      </span>
      {children && <div className="relative mt-1 text-xs">{children}</div>}
    </div>
  );
}

/** The four headline numbers, each opening the matching list. */
export function KpiCards({
  counts,
  trends,
}: {
  counts: Dashboard["counts"];
  trends: Dashboard["trends"];
}) {
  return (
    <section
      aria-label="Key numbers"
      className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 xl:grid-cols-4"
    >
      <KpiCard
        href="/clients?status=active"
        label="Active clients"
        value={counts.activeClients}
        icon={UsersIcon}
        trend={trends.clients}
        noun="clients"
      />
      <KpiCard
        href="/leads?view=list&status=open"
        label="Open leads"
        value={counts.openLeads}
        icon={TargetIcon}
        trend={trends.leads}
        noun="leads"
      />
      <KpiCard
        href="/projects"
        label="Open projects"
        value={counts.openProjects}
        icon={FolderKanbanIcon}
        trend={trends.projects}
        noun="projects"
      >
        <span className="text-muted-foreground">
          {counts.onHoldProjects > 0 ? `${counts.onHoldProjects} on hold` : "None on hold"}
        </span>
      </KpiCard>
      <KpiCard
        href="/tasks"
        label="Pending tasks"
        value={counts.pendingTasks}
        icon={ListChecksIcon}
        trend={trends.tasks}
        noun="tasks"
      >
        {counts.overdueTasks > 0 ? (
          <Link
            href="/tasks?due=overdue"
            className="relative z-10 font-medium text-destructive underline-offset-4 hover:underline"
          >
            {counts.overdueTasks} overdue
          </Link>
        ) : (
          <span className="text-muted-foreground">Nothing overdue</span>
        )}
      </KpiCard>
    </section>
  );
}
