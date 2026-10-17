import Link from "next/link";
import { BellRingIcon, CheckCheckIcon } from "lucide-react";
import { FollowUpBadge } from "@/components/leads/follow-up-badge";
import { asFollowUpLead, COLD_AFTER_DAYS, followUpState } from "@/lib/followups";
import { leadsHref } from "@/lib/validation/lead";
import type { FollowUpLeadRow } from "@/server/leads/service";

function LeadRows({ leads, today }: { leads: FollowUpLeadRow[]; today: string }) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] divide-y">
      {leads.map((lead) => (
        <li key={lead.id} className="grid gap-1 py-2.5">
          <div className="min-w-0">
            {/* Straight to the lead's "Log a contact" form. */}
            <Link
              href={`/leads/${lead.id}#log-contact`}
              className="block truncate text-sm font-medium underline-offset-4 hover:underline"
            >
              {lead.contactName}
            </Link>
            {lead.company && (
              <p className="truncate text-xs text-muted-foreground">{lead.company}</p>
            )}
          </div>
          <FollowUpBadge
            state={followUpState(asFollowUpLead(lead), today)}
            className="justify-self-start"
          />
        </li>
      ))}
    </ul>
  );
}

function SeeAll({ total, shown, href }: { total: number; shown: number; href: string }) {
  if (total <= shown) return null;
  return (
    <Link
      href={href}
      className="mt-1 inline-block text-sm font-medium text-brand underline-offset-4 hover:underline"
    >
      See all {total}
    </Link>
  );
}

/**
 * Who to get back to: leads whose follow-up is today or late, then leads
 * gone cold (open, nothing planned, no contact for COLD_AFTER_DAYS days).
 */
export function FollowUps({
  data,
  today,
}: {
  data: {
    due: FollowUpLeadRow[];
    dueTotal: number;
    cold: FollowUpLeadRow[];
    coldTotal: number;
  };
  today: string;
}) {
  const nothing = data.dueTotal === 0 && data.coldTotal === 0;
  return (
    <section aria-labelledby="follow-ups-title" className="spotlight relative surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="follow-ups-title" className="flex items-center gap-2 font-semibold">
            <BellRingIcon aria-hidden className="size-4 text-brand" />
            Follow up
          </h2>
          <p className="text-sm text-muted-foreground">Leads to get back to</p>
        </div>
        <Link
          href={leadsHref({ view: "list", sort: "followUp", status: "open" })}
          className="shrink-0 text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          All leads
        </Link>
      </div>

      {nothing ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCheckIcon aria-hidden className="size-4" />
          All caught up: no follow-ups due and no lead gone cold.
        </p>
      ) : (
        <div className="mt-3 grid gap-4">
          {data.dueTotal > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground">
                Due today or late ({data.dueTotal})
              </h3>
              <LeadRows leads={data.due} today={today} />
              <SeeAll
                total={data.dueTotal}
                shown={data.due.length}
                href={leadsHref({ view: "list", followUp: "due", sort: "followUp" })}
              />
            </div>
          )}
          {data.coldTotal > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground">
                Gone cold: no contact for {COLD_AFTER_DAYS}+ days ({data.coldTotal})
              </h3>
              <LeadRows leads={data.cold} today={today} />
              <SeeAll
                total={data.coldTotal}
                shown={data.cold.length}
                href={leadsHref({ view: "list", followUp: "cold" })}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
