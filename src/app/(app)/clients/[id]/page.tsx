import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { ClientActions } from "@/components/clients/client-actions";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { NoticeToast } from "@/components/notice-toast";
import { PageContainer } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dates";
import { getClient } from "@/server/clients/service";
import { db } from "@/server/db";
import { requireWorkspace } from "@/server/workspace/context";

export const metadata: Metadata = { title: "Client" };

const NOTICES = {
  created: "Client added",
  saved: "Changes saved",
  archived: "Client archived",
  restored: "Client restored",
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

async function ClientDetails({ params }: { params: PageProps<"/clients/[id]">["params"] }) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const client = await getClient(db, ctx, id);
  // Missing, malformed, or another workspace's: the same "not found".
  if (!client) notFound();

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight break-words">{client.name}</h1>
            <ClientStatusBadge status={client.status} />
          </div>
          {client.company && <p className="mt-1 text-sm text-muted-foreground">{client.company}</p>}
        </div>
        <ClientActions
          id={client.id}
          name={client.name}
          archived={client.status === "ARCHIVED"}
          canDelete={ctx.role === "OWNER"}
        />
      </div>

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
                {client.email && (
                  <a
                    href={`mailto:${client.email}`}
                    className="text-brand underline-offset-4 hover:underline"
                  >
                    {client.email}
                  </a>
                )}
              </Detail>
              <Detail label="Phone">
                {client.phone && (
                  <a
                    href={`tel:${client.phone.replace(/[^\d+]/g, "")}`}
                    className="text-brand underline-offset-4 hover:underline"
                  >
                    {client.phone}
                  </a>
                )}
              </Detail>
              <Detail label="Company">{client.company}</Detail>
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
              <Detail label="Added">{formatDate(client.createdAt, ctx.workspace.timezone)}</Detail>
              <Detail label="Updated">
                {formatDate(client.updatedAt, ctx.workspace.timezone)}
              </Detail>
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
            {client.notes ? (
              <p className="text-sm break-words whitespace-pre-wrap">{client.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DetailsFallback() {
  return (
    <div className="grid gap-4" aria-hidden>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

export default function ClientPage({ params }: PageProps<"/clients/[id]">) {
  return (
    <PageContainer>
      <Link
        href="/clients"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        All clients
      </Link>
      <Suspense fallback={<DetailsFallback />}>
        <ClientDetails params={params} />
        <NoticeToast messages={NOTICES} />
      </Suspense>
    </PageContainer>
  );
}
