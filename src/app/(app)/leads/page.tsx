import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlusIcon, SearchXIcon, TargetIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LeadBoard, type BoardColumnData } from "@/components/leads/lead-board";
import { LeadFilters } from "@/components/leads/lead-filters";
import { LeadList } from "@/components/leads/lead-list";
import { LeadViewTabs } from "@/components/leads/view-tabs";
import { NoticeToast } from "@/components/notice-toast";
import { RememberListUrl } from "@/components/shell/list-memory";
import { Pagination } from "@/components/pagination";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, todayIn } from "@/lib/dates";
import { asFollowUpLead, followUpState } from "@/lib/followups";
import { formatMoney } from "@/lib/money";
import { leadsHref, parseLeadListParams } from "@/lib/validation/lead";
import { db } from "@/server/db";
import { boardLeads, leadSources, listLeads } from "@/server/leads/service";
import { requireWorkspace } from "@/server/workspace/context";

export const metadata: Metadata = { title: "Leads" };

const NOTICES = { deleted: "Lead deleted" };

function NoLeads({ filtered }: { filtered: boolean }) {
  return filtered ? (
    <EmptyState
      icon={SearchXIcon}
      title="No leads match"
      description="Try another search or filter."
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/leads">Clear filters</Link>
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={TargetIcon}
      title="No leads yet"
      description="Add people who might become clients, then move them along as you talk."
      action={
        <Button asChild size="sm">
          <Link href="/leads/new">Add a lead</Link>
        </Button>
      }
    />
  );
}

async function Leads({ searchParams }: { searchParams: PageProps<"/leads">["searchParams"] }) {
  const ctx = await requireWorkspace();
  const params = parseLeadListParams(await searchParams);
  const sources = await leadSources(db, ctx);
  const tz = ctx.workspace.timezone;
  const today = todayIn(tz);

  if (params.view === "list") {
    const result = await listLeads(db, ctx, params, today);
    const filtered =
      params.q !== "" ||
      params.source !== "" ||
      params.status !== "all" ||
      params.followUp !== "all";
    return (
      <>
        <LeadViewTabs params={params} />
        <LeadFilters params={params} sources={sources} />
        {result.total === 0 ? (
          <NoLeads filtered={filtered} />
        ) : (
          <>
            <LeadList
              leads={result.items}
              timeZone={tz}
              today={today}
              currency={ctx.workspace.currency}
            />
            <Pagination
              page={result.page}
              pageCount={result.pageCount}
              pageSize={result.pageSize}
              total={result.total}
              noun={result.total === 1 ? "lead" : "leads"}
              hrefFor={(page) => leadsHref({ ...params, page })}
            />
          </>
        )}
      </>
    );
  }

  const board = await boardLeads(db, ctx, params);
  const total = board.reduce((sum, column) => sum + column.total, 0);
  const columns: BoardColumnData[] = board.map((column) => ({
    status: column.status,
    total: column.total,
    value: column.value > 0 ? formatMoney(column.value, ctx.workspace.currency) : null,
    seeAllHref: leadsHref({
      view: "list",
      q: params.q,
      source: params.source,
      status: column.status.toLowerCase() as Lowercase<typeof column.status>,
    }),
    items: column.items.map((lead) => ({
      id: lead.id,
      contactName: lead.contactName,
      company: lead.company,
      source: lead.source,
      updated: formatDate(lead.updatedAt, tz),
      converted: lead.convertedClient !== null,
      followUp: followUpState(asFollowUpLead(lead), today),
      value: lead.value === null ? null : formatMoney(lead.value, ctx.workspace.currency),
    })),
  }));

  return (
    <>
      <LeadViewTabs params={params} />
      <LeadFilters params={params} sources={sources} />
      {total === 0 ? (
        <NoLeads filtered={params.q !== "" || params.source !== ""} />
      ) : (
        <LeadBoard columns={columns} />
      )}
    </>
  );
}

function LeadsFallback() {
  return (
    <div className="grid gap-3" aria-hidden>
      <Skeleton className="h-9 w-40 rounded-lg" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}

export default function LeadsPage({ searchParams }: PageProps<"/leads">) {
  return (
    <PageContainer>
      <PageHeader
        title="Leads"
        description="People who might become clients, from first contact to won or lost."
        actions={
          <Button asChild>
            <Link href="/leads/new">
              <PlusIcon aria-hidden data-icon="inline-start" />
              New lead
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<LeadsFallback />}>
        <Leads searchParams={searchParams} />
        <NoticeToast messages={NOTICES} />
        <RememberListUrl />
      </Suspense>
    </PageContainer>
  );
}
