import Link from "next/link";
import { LEAD_STATUS_LABELS } from "@/lib/validation/lead";
import { cn } from "@/lib/utils";
import type { Dashboard } from "@/server/dashboard/service";

/** Leads per stage as bars, with the share of decided leads that were won. */
export function LeadFunnel({
  funnel,
  conversion,
}: {
  funnel: Dashboard["funnel"];
  conversion: Dashboard["conversion"];
}) {
  const max = Math.max(1, ...funnel.map((stage) => stage.count));
  const total = funnel.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <section aria-labelledby="funnel-title" className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="funnel-title" className="font-medium">
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
      <ul className="mt-4 grid gap-3">
        {funnel.map((stage) => (
          <li key={stage.status} className="grid gap-1">
            <div className="flex justify-between text-sm">
              <span>{LEAD_STATUS_LABELS[stage.status]}</span>
              <span className="font-medium tabular-nums">{stage.count}</span>
            </div>
            <div aria-hidden className="h-2 overflow-clip rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  stage.status === "WON"
                    ? "bg-success"
                    : stage.status === "LOST"
                      ? "bg-chart-5"
                      : "bg-brand",
                )}
                style={{ width: `${(stage.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">
        {conversion.rate === null ? (
          "Win rate shows once leads are won or lost."
        ) : (
          <>
            <span className="font-medium text-foreground">{conversion.rate}% win rate</span> (
            {conversion.won} won, {conversion.lost} lost) · {conversion.convertedThisMonth}{" "}
            converted this month
          </>
        )}
      </p>
    </section>
  );
}
