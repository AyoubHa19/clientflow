import Link from "next/link";
import {
  FolderKanbanIcon,
  ListChecksIcon,
  TargetIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import type { Dashboard } from "@/server/dashboard/service";

function KpiCard({
  href,
  label,
  value,
  icon: Icon,
  children,
}: {
  href: string;
  label: string;
  value: number;
  icon: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative min-w-0 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/40 has-focus-visible:ring-3 has-focus-visible:ring-ring/50 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {/* The whole card is the link (the ::after covers it). */}
          <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-xl">
            {label}
          </Link>
        </h2>
        <Icon aria-hidden className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</p>
      {children && <div className="relative mt-1 text-xs">{children}</div>}
    </div>
  );
}

/** The four headline numbers, each opening the matching list. */
export function KpiCards({ counts }: { counts: Dashboard["counts"] }) {
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
      />
      <KpiCard
        href="/leads?view=list&status=open"
        label="Open leads"
        value={counts.openLeads}
        icon={TargetIcon}
      />
      <KpiCard
        href="/projects"
        label="Open projects"
        value={counts.openProjects}
        icon={FolderKanbanIcon}
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
