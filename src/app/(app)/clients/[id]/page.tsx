import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlusIcon } from "lucide-react";
import { ClientActions } from "@/components/clients/client-actions";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { NoticeToast } from "@/components/notice-toast";
import { ProjectList } from "@/components/projects/project-list";
import { PageContainer } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { formatDate, todayIn } from "@/lib/dates";
import { formatMoney, formatRate } from "@/lib/money";
import { formatDuration } from "@/lib/time";
import { HealthBadge } from "@/components/clients/health-badge";
import { clientsHealth } from "@/server/time/service";
import { getClient } from "@/server/clients/service";
import { db } from "@/server/db";
import { clientFees, projectsForClient } from "@/server/projects/service";
import { requireWorkspace } from "@/server/workspace/context";

// The record's name in the browser tab (it streams in with the page).
export async function generateMetadata({ params }: PageProps<"/clients/[id]">): Promise<Metadata> {
  const { id } = await params;
  const record = await getClient(db, await requireWorkspace(), id);
  return { title: record ? record.name : "Not found" };
}

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
  const [projects, fees, healthById] = await Promise.all([
    projectsForClient(db, ctx, client.id),
    clientFees(db, ctx, client.id),
    clientsHealth(db, ctx, [client.id]),
  ]);
  const health = healthById[client.id];

  return (
    <>
      <Breadcrumbs list={{ label: "Clients", href: "/clients" }} items={[{ label: client.name }]} />
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
              <Detail label="Project fees">
                {fees.withFee > 0 && formatMoney(fees.total, ctx.workspace.currency)}
              </Detail>
              <Detail label="Added">{formatDate(client.createdAt, ctx.workspace.timezone)}</Detail>
              <Detail label="Updated">
                {formatDate(client.updatedAt, ctx.workspace.timezone)}
              </Detail>
            </dl>
          </CardContent>
        </Card>
        {health && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                <h2 className="flex flex-wrap items-center gap-3">
                  Health <HealthBadge level={health.health.level} />
                </h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <dl className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Per hour</dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {health.rate === null ? "—" : formatRate(health.rate, ctx.workspace.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Hours</dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {formatDuration(health.minutes)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Overdue</dt>
                  <dd className="text-lg font-semibold tabular-nums">{health.overdue}</dd>
                </div>
              </dl>
              <div className="text-sm">
                <p className="font-medium">Why</p>
                <ul className="mt-1 grid list-disc gap-1 pl-5 text-muted-foreground">
                  {health.health.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  Per hour: the fees of their projects that have both a fee and logged time, over
                  those hours.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <h2>Projects</h2>
            </CardTitle>
            <CardAction>
              <Button asChild size="sm" variant="outline">
                <Link href={`/projects/new?clientId=${client.id}`}>
                  <PlusIcon aria-hidden data-icon="inline-start" />
                  New project
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {projects.length > 0 ? (
              <ProjectList
                projects={projects}
                today={todayIn(ctx.workspace.timezone)}
                showClient={false}
                currency={ctx.workspace.currency}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No projects for this client yet.</p>
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
      <Suspense fallback={<DetailsFallback />}>
        <ClientDetails params={params} />
        <NoticeToast messages={NOTICES} />
      </Suspense>
    </PageContainer>
  );
}
