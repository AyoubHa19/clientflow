import Link from "next/link";
import { formatDate } from "@/lib/dates";
import type { LeadRecord } from "@/server/leads/service";
import { LeadStatusBadge } from "./lead-status-badge";

const dash = <span className="text-muted-foreground">—</span>;

/** Leads as a table on wide screens and as cards on phones. */
export function LeadList({ leads, timeZone }: { leads: LeadRecord[]; timeZone: string }) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Leads</caption>
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {["Contact", "Company", "Email", "Source", "Stage", "Updated"].map((heading) => (
                <th key={heading} scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-muted/40">
                <td className="max-w-64 px-4 py-3">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="block truncate font-medium underline-offset-4 hover:underline"
                  >
                    {lead.contactName}
                  </Link>
                </td>
                <td className="max-w-48 truncate px-4 py-3">{lead.company ?? dash}</td>
                <td className="max-w-56 truncate px-4 py-3">{lead.email ?? dash}</td>
                <td className="max-w-32 truncate px-4 py-3">{lead.source ?? dash}</td>
                <td className="px-4 py-3">
                  <LeadStatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {formatDate(lead.updatedAt, timeZone)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:hidden">
        {leads.map((lead) => (
          <li key={lead.id}>
            <Link
              href={`/leads/${lead.id}`}
              className="block rounded-xl border p-4 outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 truncate font-medium">{lead.contactName}</span>
                <LeadStatusBadge status={lead.status} />
              </div>
              {lead.company && (
                <p className="mt-1 truncate text-sm text-muted-foreground">{lead.company}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {lead.source ? `${lead.source} · ` : ""}Updated{" "}
                {formatDate(lead.updatedAt, timeZone)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
