import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlusIcon, SearchXIcon, UsersIcon } from "lucide-react";
import { ClientFilters } from "@/components/clients/client-filters";
import { ClientList } from "@/components/clients/client-list";
import { EmptyState } from "@/components/empty-state";
import { NoticeToast } from "@/components/notice-toast";
import { RememberListUrl } from "@/components/shell/list-memory";
import { Pagination } from "@/components/pagination";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { clientListHref, parseClientListParams } from "@/lib/validation/client";
import { listClients } from "@/server/clients/service";
import { db } from "@/server/db";
import { requireWorkspace } from "@/server/workspace/context";

export const metadata: Metadata = { title: "Clients" };

async function Clients({ searchParams }: { searchParams: PageProps<"/clients">["searchParams"] }) {
  const ctx = await requireWorkspace();
  const params = parseClientListParams(await searchParams);
  const result = await listClients(db, ctx, params);
  const filtered = params.q !== "" || params.status !== "open";

  return (
    <>
      <ClientFilters params={params} />
      {result.total === 0 ? (
        filtered ? (
          <EmptyState
            icon={SearchXIcon}
            title="No clients match"
            description="Try another search or status."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/clients">Clear filters</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={UsersIcon}
            title="No clients yet"
            description="Add the people and businesses you work for. Archived clients are under the Archived status."
            action={
              <Button asChild size="sm">
                <Link href="/clients/new">Add a client</Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          <ClientList clients={result.items} timeZone={ctx.workspace.timezone} />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            pageSize={result.pageSize}
            total={result.total}
            noun={result.total === 1 ? "client" : "clients"}
            hrefFor={(page) => clientListHref({ ...params, page })}
          />
        </>
      )}
    </>
  );
}

function ClientsFallback() {
  return (
    <div className="grid gap-3" aria-hidden>
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

const NOTICES = { deleted: "Client deleted" };

export default function ClientsPage({ searchParams }: PageProps<"/clients">) {
  return (
    <PageContainer>
      <PageHeader
        title="Clients"
        description="The people and businesses you work for."
        actions={
          <Button asChild>
            <Link href="/clients/new">
              <PlusIcon aria-hidden data-icon="inline-start" />
              New client
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<ClientsFallback />}>
        <Clients searchParams={searchParams} />
        <NoticeToast messages={NOTICES} />
        <RememberListUrl />
      </Suspense>
    </PageContainer>
  );
}
