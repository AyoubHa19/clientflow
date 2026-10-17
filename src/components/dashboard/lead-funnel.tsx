import Link from "next/link";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/validation/lead";
import { cn } from "@/lib/utils";
import type { Dashboard } from "@/server/dashboard/service";

/** One colour per stage, shared by the bar, the legend and the board. */
const STAGE_COLOUR: Record<LeadStatus, string> = {
  NEW: "bg-chart-5",
  CONTACTED: "bg-chart-2",
  QUALIFIED: "bg-brand",
  WON: "bg-success",
  LOST: "bg-destructive/60",
};

/** The win rate as a glowing ring (decorative; the number is written in it). */
function WinRing({ rate }: { rate: number | null }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const filled = ((rate ?? 0) / 100) * circumference;
  return (
    <div className="relative size-24 shrink-0">
      <svg aria-hidden viewBox="0 0 84 84" className="size-full -rotate-90">
        <defs>
          <linearGradient id="win-ring" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" />
            <stop offset="100%" stopColor="var(--brand)" />
          </linearGradient>
        </defs>
        <circle cx="42" cy="42" r={radius} fill="none" strokeWidth="9" className="stroke-muted" />
        {rate !== null && rate > 0 && (
          <circle
            cx="42"
            cy="42"
            r={radius}
            fill="none"
            stroke="url(#win-ring)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            className="ring-draw drop-shadow-[0_0_6px_var(--brand)]"
            style={{ ["--ring" as string]: `${circumference}` }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl leading-none font-semibold tabular-nums">
          {rate === null ? "–" : `${rate}%`}
        </span>
        <span className="mt-1 text-[0.6rem] text-muted-foreground">won</span>
      </div>
    </div>
  );
}

/** The pipeline: a win-rate ring, every stage as a share of one bar, a legend. */
export function LeadFunnel({
  funnel,
  conversion,
}: {
  funnel: Dashboard["funnel"];
  conversion: Dashboard["conversion"];
}) {
  const total = funnel.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <section aria-labelledby="funnel-title" className="spotlight relative surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="funnel-title" className="font-semibold">
            Leads pipeline
          </h2>
          <p className="text-sm text-muted-foreground">
            {total === 0 ? "No leads yet." : `${total} ${total === 1 ? "lead" : "leads"} in total`}
          </p>
        </div>
        <Link
          href="/leads"
          className="text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          Open board
        </Link>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <WinRing rate={conversion.rate} />
        <p className="text-sm text-muted-foreground">
          {conversion.rate === null ? (
            "Win rate shows once leads are won or lost."
          ) : (
            <>
              <span className="font-semibold text-foreground">{conversion.rate}% win rate</span> (
              {conversion.won} won, {conversion.lost} lost) · {conversion.convertedThisMonth}{" "}
              converted this month
            </>
          )}
        </p>
      </div>

      {/* Every stage as its share of all leads. */}
      <div aria-hidden className="mt-5 flex h-3 gap-1 overflow-clip rounded-full bg-muted/60">
        {total > 0 &&
          funnel
            .filter((stage) => stage.count > 0)
            .map((stage, index) => (
              <div
                key={stage.status}
                className={cn("bar-grow-x h-full rounded-full", STAGE_COLOUR[stage.status])}
                style={{
                  width: `${(stage.count / total) * 100}%`,
                  animationDelay: `${index * 80}ms`,
                }}
              />
            ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {funnel.map((stage) => (
          <li key={stage.status} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn("size-2.5 rounded-full", STAGE_COLOUR[stage.status])}
              />
              {LEAD_STATUS_LABELS[stage.status]}
            </span>
            <span className="font-semibold tabular-nums">{stage.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
