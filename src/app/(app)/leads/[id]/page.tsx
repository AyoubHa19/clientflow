import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowRightIcon, UserCheckIcon } from "lucide-react";
import { LeadActions } from "@/components/leads/lead-actions";
import { LeadStatusBadge } from "@/components/leads/lead-status-badge";
import { NoticeToast } from "@/components/notice-toast";
import { PageContainer } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { formatDate } from "@/lib/dates";
import { db } from "@/server/db";
import { findMatchingClient, getLead } from "@/server/leads/service";
import { requireWorkspace } from "@/server/workspace/context";

// The record's name in the browser tab (it streams in with the page).
export async function generateMetadata({ params }: PageProps<"/leads/[id]">): Promise<Metadata> {
  const { id } = await params;
  const record = await getLead(db, await requireWorkspace(), id);
  return { title: record ? record.contactName : "Not found" };
}

const NOTICES = {
  created: "Lead added",
  saved: "Changes saved",
  converted: "Client created from this lead",
  linked: "Lead linked to the existing client",
};

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">
        {children ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </>
  );
}

async function LeadDetails({ params }: { params: PageProps<"/leads/[id]">["params"] }) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const lead = await getLead(db, ctx, id);
  if (!lead) notFound();
  const match = lead.convertedClient ? null : await findMatchingClient(db, ctx, lead);
  const tz = ctx.workspace.timezone;

  return (
    <>
      <Breadcrumbs
        list={{ label: "Leads", href: "/leads" }}
        items={[{ label: lead.contactName }]}
      />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight break-words">
              {lead.contactName}
            </h1>
            <LeadStatusBadge status={lead.status} />
          </div>
          {lead.company && <p className="mt-1 text-sm text-muted-foreground">{lead.company}</p>}
        </div>
        <LeadActions
          id={lead.id}
          contactName={lead.contactName}
          status={lead.status}
          converted={lead.convertedClient !== null}
          match={match}
          canDelete={ctx.role === "OWNER"}
        />
      </div>

      {lead.convertedClient && (
        <div className="flex flex-wrap items-center gap-3 surface border-success/30 bg-success/10 px-4 py-3 text-sm">
          <UserCheckIcon aria-hidden className="size-5 text-success" />
          <p className="flex-1">
            Converted into a client
            {lead.convertedAt ? ` on ${formatDate(lead.convertedAt, tz)}` : ""}.
          </p>
          <Link
            href={`/clients/${lead.convertedClient.id}`}
            className="inline-flex items-center gap-1 font-medium text-brand underline-offset-4 hover:underline"
          >
            Open {lead.convertedClient.name}
            <ArrowRightIcon aria-hidden className="size-4" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Contact</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
              <Detail label="Email">
                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-brand underline-offset-4 hover:underline"
                  >
                    {lead.email}
                  </a>
                )}
              </Detail>
              <Detail label="Phone">
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
                    className="text-brand underline-offset-4 hover:underline"
                  >
                    {lead.phone}
                  </a>
                )}
              </Detail>
              <Detail label="Company">{lead.company}</Detail>
              <Detail label="Source">{lead.source}</Detail>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Record</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-[6rem_minmax(0,1fr)]">
              <Detail label="Added">{formatDate(lead.createdAt, tz)}</Detail>
              <Detail label="Updated">{formatDate(lead.updatedAt, tz)}</Detail>
            </dl>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <h2>Notes</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lead.notes ? (
              <p className="text-sm break-words whitespace-pre-wrap">{lead.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function LeadPage({ params }: PageProps<"/leads/[id]">) {
  return (
    <PageContainer>
      <Suspense
        fallback={
          <div className="grid gap-4" aria-hidden>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        }
      >
        <LeadDetails params={params} />
        <NoticeToast messages={NOTICES} />
      </Suspense>
    </PageContainer>
  );
}
