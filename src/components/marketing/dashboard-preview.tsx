import {
  AlarmClockIcon,
  CalendarClockIcon,
  FolderKanbanIcon,
  ListChecksIcon,
  PlusIcon,
  SearchIcon,
  TargetIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { STAGE_COLOUR, WinRing } from "@/components/dashboard/lead-funnel";
import { Sparkline } from "@/components/dashboard/sparkline";
import { NAV_ITEMS } from "@/components/shell/nav-items";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/validation/lead";
import { cn } from "@/lib/utils";

const QUICK_ADD = [
  { label: "Client", icon: UsersIcon },
  { label: "Lead", icon: TargetIcon },
  { label: "Project", icon: FolderKanbanIcon },
];

const KPIS: {
  label: string;
  value: number;
  icon: LucideIcon;
  trend: number[];
  note?: string;
  late?: boolean;
}[] = [
  { label: "Active clients", value: 12, icon: UsersIcon, trend: [1, 0, 2, 1, 1, 3, 2, 4] },
  { label: "Open leads", value: 7, icon: TargetIcon, trend: [2, 1, 1, 3, 2, 2, 4, 3] },
  {
    label: "Open projects",
    value: 5,
    icon: FolderKanbanIcon,
    trend: [0, 1, 1, 0, 2, 1, 1, 2],
    note: "1 on hold",
  },
  {
    label: "Pending tasks",
    value: 18,
    icon: ListChecksIcon,
    trend: [2, 3, 1, 4, 3, 5, 4, 6],
    note: "2 overdue",
    late: true,
  },
];

const DUE: {
  title: string;
  meta: string;
  icon: LucideIcon;
  date: string;
  badge: string;
  late?: boolean;
}[] = [
  {
    title: "Send menu proofs",
    meta: "Atlas Café",
    icon: ListChecksIcon,
    date: "14 Oct",
    badge: "Overdue by 2 days",
    late: true,
  },
  {
    title: "Booking site launch",
    meta: "Riad Yasmine",
    icon: FolderKanbanIcon,
    date: "19 Oct",
    badge: "Due in 3 days",
  },
  {
    title: "Brand workshop",
    meta: "Nour Architects",
    icon: ListChecksIcon,
    date: "22 Oct",
    badge: "Due in 6 days",
  },
];

const PIPELINE: { status: LeadStatus; count: number }[] = [
  { status: "NEW", count: 2 },
  { status: "CONTACTED", count: 3 },
  { status: "QUALIFIED", count: 2 },
  { status: "WON", count: 6 },
  { status: "LOST", count: 2 },
];
const PIPELINE_TOTAL = PIPELINE.reduce((sum, stage) => sum + stage.count, 0);

const badge =
  "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.55rem] font-medium whitespace-nowrap ring-1 ring-inset";

/**
 * A picture of the ClientFlow dashboard for the landing page: the app's own
 * look in miniature (glass cards, the real sparkline and win-rate ring, the
 * same badges and side bar), drawn with elements so it stays sharp and
 * themed. The numbers are made up (and the label says so); screen readers
 * get that one sentence, not the details.
 */
export function DashboardPreview({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="A preview of the ClientFlow dashboard, with made-up numbers"
      className={cn(
        "overflow-clip surface p-2 text-left select-none sm:p-3 [&_*]:pointer-events-none",
        className,
      )}
    >
      <div aria-hidden className="grid gap-3 sm:grid-cols-[10.5rem_minmax(0,1fr)]">
        {/* The side bar: logo and workspace, the pages, quick add, the person. */}
        <div className="hidden flex-col gap-3 surface px-2 py-3 sm:flex">
          <div className="grid gap-0.5 px-1">
            <Logo />
            <span className="truncate pl-10 text-[0.6rem] text-muted-foreground">
              Bennani Studio
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-0.5">
            {NAV_ITEMS.map(({ label, icon: Icon }, index) => (
              <div
                key={label}
                className={cn(
                  "flex h-7 items-center gap-2 rounded-full px-2.5 text-[0.68rem] font-medium text-muted-foreground",
                  index === 0 &&
                    "bg-sidebar-accent text-foreground shadow-(--shadow-card) ring-1 ring-border",
                )}
              >
                <Icon className={cn("size-3.5", index === 0 && "text-brand")} />
                {label}
              </div>
            ))}
          </div>
          <div className="surface p-2">
            <p className="flex items-center gap-1 text-[0.6rem] font-semibold">
              <PlusIcon className="size-3 text-brand" />
              Quick add
            </p>
            <div className="mt-1.5 grid grid-cols-3 gap-1">
              {QUICK_ADD.map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="flex flex-col items-center gap-0.5 py-1 text-[0.55rem] font-medium text-muted-foreground"
                >
                  <Icon className="size-3.5" />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 px-1">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[0.55rem] font-semibold text-brand">
              SB
            </span>
            <span className="grid min-w-0">
              <span className="truncate text-[0.62rem] font-medium">Sara Bennani</span>
              <span className="truncate text-[0.55rem] text-muted-foreground">
                sara@bennani.studio
              </span>
            </span>
          </div>
        </div>

        <div className="grid min-w-0 content-start gap-2.5 p-1">
          {/* The search bar, as at the top of every page. */}
          <div className="flex h-7 w-full max-w-xs items-center gap-1.5 rounded-full border border-(--surface-edge) bg-(--surface-fill) px-2.5 text-[0.6rem] text-muted-foreground">
            <SearchIcon className="size-3" />
            Search clients, leads, projects…
            <span className="ml-auto hidden rounded border px-1 text-[0.5rem] sm:inline">
              Ctrl K
            </span>
          </div>

          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Welcome, Sara</p>
              <p className="text-[0.62rem] text-muted-foreground">
                Here&apos;s what&apos;s happening in Bennani Studio.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[0.55rem] font-medium text-brand">
              Made-up numbers
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {KPIS.map(({ label, value, icon: Icon, trend, note, late }) => (
              <div key={label} className="min-w-0 surface p-2.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="flex size-6 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <Icon className="size-3" />
                  </span>
                  <span className="truncate text-[0.52rem] text-muted-foreground">
                    +{trend.reduce((sum, n) => sum + n, 0)} in 8 weeks
                  </span>
                </div>
                <p className="mt-1.5 text-[0.6rem] font-medium text-muted-foreground">{label}</p>
                <div className="flex items-end justify-between gap-2">
                  <p className="text-lg leading-none font-semibold tabular-nums">{value}</p>
                  <Sparkline values={trend} className="h-6 max-w-16" />
                </div>
                {note && (
                  <p
                    className={cn(
                      "mt-1 text-[0.55rem]",
                      late ? "font-medium text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {note}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-2 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            {/* Coming up: the same table as the dashboard. */}
            <div className="min-w-0 surface p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[0.7rem] font-semibold">Coming up</p>
                  <p className="text-[0.55rem] text-muted-foreground">
                    Overdue and due in the next 14 days
                  </p>
                </div>
                <span className="shrink-0 text-[0.55rem] font-medium text-brand">
                  This week&apos;s tasks
                </span>
              </div>
              <div className="mt-2 overflow-clip rounded-lg border border-(--surface-edge) bg-(--surface-fill)">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 bg-muted/60 px-2 py-1 text-[0.52rem] text-muted-foreground sm:grid-cols-[minmax(0,1fr)_3rem_auto]">
                  <span>What</span>
                  <span className="hidden sm:block">Due</span>
                  <span className="text-right">Status</span>
                </div>
                {DUE.map(({ title, meta, icon: Icon, date, badge: text, late }) => (
                  <div
                    key={title}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t px-2 py-1.5 sm:grid-cols-[minmax(0,1fr)_3rem_auto]"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="size-2.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.62rem] font-medium">{title}</span>
                        <span className="block truncate text-[0.52rem] text-muted-foreground">
                          {meta}
                        </span>
                      </span>
                    </span>
                    <span className="hidden text-[0.58rem] text-muted-foreground sm:block">
                      {date}
                    </span>
                    <span
                      className={cn(
                        badge,
                        late
                          ? "bg-destructive/10 text-destructive ring-destructive/25"
                          : "bg-warning/10 text-warning ring-warning/25",
                      )}
                    >
                      {late ? (
                        <AlarmClockIcon className="size-2.5" />
                      ) : (
                        <CalendarClockIcon className="size-2.5" />
                      )}
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* The pipeline: win-rate ring, every stage in one bar, a legend.
                Left out on phones, so the picture fits their screen. */}
            <div className="hidden min-w-0 surface p-2.5 sm:block">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[0.7rem] font-semibold">Leads pipeline</p>
                  <p className="text-[0.55rem] text-muted-foreground">
                    {PIPELINE_TOTAL} leads in total
                  </p>
                </div>
                <span className="text-[0.55rem] font-medium text-brand">Open board</span>
              </div>
              <div className="mt-2 flex items-center gap-2.5">
                <WinRing rate={75} size="sm" />
                <p className="text-[0.58rem] text-muted-foreground">
                  <span className="font-semibold text-foreground">75% win rate</span> (6 won, 2
                  lost) · 2 converted this month
                </p>
              </div>
              <div className="mt-2.5 flex h-2 gap-0.5 overflow-clip rounded-full bg-muted/60">
                {PIPELINE.map((stage) => (
                  <span
                    key={stage.status}
                    className={cn("h-full rounded-full", STAGE_COLOUR[stage.status])}
                    style={{ width: `${(stage.count / PIPELINE_TOTAL) * 100}%` }}
                  />
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                {PIPELINE.map((stage) => (
                  <span
                    key={stage.status}
                    className="flex items-center justify-between gap-1 text-[0.55rem]"
                  >
                    <span className="flex items-center gap-1">
                      <span className={cn("size-1.5 rounded-full", STAGE_COLOUR[stage.status])} />
                      {LEAD_STATUS_LABELS[stage.status]}
                    </span>
                    <span className="font-semibold tabular-nums">{stage.count}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
