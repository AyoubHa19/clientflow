import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectForm } from "@/components/projects/project-form";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { firstParam } from "@/lib/validation/fields";
import { db } from "@/server/db";
import { createProjectAction } from "@/server/projects/actions";
import { clientOptions } from "@/server/projects/service";
import { requireWorkspace } from "@/server/workspace/context";

export const metadata: Metadata = { title: "New project" };

async function NewProject({
  searchParams,
}: {
  searchParams: PageProps<"/projects/new">["searchParams"];
}) {
  const ctx = await requireWorkspace();
  const clients = await clientOptions(db, ctx);
  // ?clientId= from a client's page picks that client, if it's one of ours.
  const wanted = firstParam((await searchParams).clientId) ?? "";
  const clientId = clients.some((client) => client.id === wanted) ? wanted : "";

  return (
    <ProjectForm
      action={createProjectAction}
      clients={clients}
      initial={{ clientId }}
      submitLabel="Add project"
      cancelHref={clientId ? `/clients/${clientId}` : "/projects"}
    />
  );
}

export default function NewProjectPage({ searchParams }: PageProps<"/projects/new">) {
  return (
    <PageContainer>
      <Breadcrumbs
        list={{ label: "Projects", href: "/projects" }}
        items={[{ label: "New project" }]}
      />
      <PageHeader title="New project" description="Only the name is required." />
      <Card className="max-w-3xl">
        <CardContent>
          <Suspense fallback={<Skeleton aria-hidden className="h-80 w-full" />}>
            <NewProject searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
