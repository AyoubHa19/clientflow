import {
  CalendarClockIcon,
  FolderKanbanIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  SettingsIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Overview", icon: LayoutDashboardIcon, active: true },
  { label: "Clients", icon: UsersIcon },
  { label: "Leads", icon: TargetIcon },
  { label: "Projects", icon: FolderKanbanIcon },
  { label: "Tasks", icon: ListChecksIcon },
  { label: "Activity", icon: HistoryIcon },
  { label: "Settings", icon: SettingsIcon },
];

const KPIS = [
  { label: "Active clients", value: "12" },
  { label: "Open leads", value: "7" },
  { label: "Open projects", value: "5" },
  { label: "Pending tasks", value: "18", note: "2 overdue" },
];

const DUE = [
  { title: "Send menu proofs", meta: "Atlas Café", badge: "Overdue by 2 days", late: true },
  { title: "Booking site launch", meta: "Riad Yasmine", badge: "Due in 3 days" },
  { title: "Brand workshop", meta: "Nour Architects", badge: "Due in 6 days" },
];

const PIPELINE = [
  { label: "New", value: 3 },
  { label: "Contacted", value: 5 },
  { label: "Qualified", value: 4 },
  { label: "Won", value: 6 },
];

/**
 * A picture of the ClientFlow dashboard for the landing page, drawn with
 * elements so it stays sharp and themed. The numbers are made up (and the
 * label says so); screen readers get that one sentence, not the details.
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
      <div aria-hidden className="grid gap-3 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
        <div className="hidden flex-col gap-1 rounded-xl bg-muted/60 p-2 sm:flex">
          <div className="mb-2 flex items-center gap-2 px-1.5 py-1">
            <LogoMark className="size-6" />
            <span className="text-xs font-semibold">ClientFlow</span>
          </div>
          {NAV.map(({ label, icon: Icon, active }) => (
            <div
              key={label}
              className={cn(
                "flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[0.7rem] text-muted-foreground",
                active && "bg-card font-medium text-foreground shadow-(--shadow-card)",
              )}
            >
              <Icon className={cn("size-3.5", active && "text-brand")} />
              {label}
            </div>
          ))}
        </div>

        <div className="grid gap-3 p-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Welcome, Sara</p>
              <p className="text-[0.65rem] text-muted-foreground">Here&apos;s your week.</p>
            </div>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[0.6rem] font-medium text-brand">
              Made-up numbers
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {KPIS.map((kpi) => (
              <div key={kpi.label} className="rounded-xl border bg-card p-2.5">
                <p className="text-[0.6rem] text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 text-lg leading-none font-semibold tabular-nums">{kpi.value}</p>
                {kpi.note && <p className="mt-1 text-[0.6rem] text-destructive">{kpi.note}</p>}
              </div>
            ))}
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="rounded-xl border bg-card p-2.5">
              <p className="flex items-center gap-1.5 text-[0.7rem] font-medium">
                <CalendarClockIcon className="size-3.5 text-brand" /> Coming up
              </p>
              <ul className="mt-2 grid gap-1.5">
                {DUE.map((item) => (
                  <li
                    key={item.title}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-2 py-1.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[0.65rem] font-medium">
                        {item.title}
                      </span>
                      <span className="block text-[0.55rem] text-muted-foreground">
                        {item.meta}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[0.55rem]",
                        item.late
                          ? "bg-destructive/10 text-destructive"
                          : "bg-brand-soft text-brand",
                      )}
                    >
                      {item.badge}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-card p-2.5">
              <p className="text-[0.7rem] font-medium">Leads pipeline</p>
              <ul className="mt-2 grid gap-2">
                {PIPELINE.map((stage) => (
                  <li key={stage.label} className="grid gap-1">
                    <span className="flex justify-between text-[0.6rem]">
                      <span className="text-muted-foreground">{stage.label}</span>
                      <span className="font-medium tabular-nums">{stage.value}</span>
                    </span>
                    <span className="h-1.5 overflow-clip rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-brand"
                        style={{ width: `${(stage.value / 6) * 100}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
