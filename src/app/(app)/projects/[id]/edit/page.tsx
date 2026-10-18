import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectForm } from "@/components/projects/project-form";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { toDateOnly } from "@/lib/dates";
import { amountInputValue } from "@/lib/money";
import { db } from "@/server/db";
import { updateProjectAction } from "@/server/projects/actions";
import { clientOptions, getProject } from "@/server/projects/service";
import { requireWorkspace } from "@/server/workspace/context";

// The record's name in the browser tab (it streams in with the page).
export async function generateMetadata({
  params,
}: PageProps<"/projects/[id]/edit">): Promise<Metadata> {
  const { id } = await params;
  const record = await getProject(db, await requireWorkspace(), id);
  return { title: record ? `Edit ${record.name}` : "Not found" };
}

async function EditProject({ params }: { params: PageProps<"/projects/[id]/edit">["params"] }) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const project = await getProject(db, ctx, id);
  if (!project) notFound();
  const clients = await clientOptions(db, ctx, project.client?.id);

  return (
    <>
      <Breadcrumbs
        list={{ label: "Projects", href: "/projects" }}
        items={[{ label: project.name, href: `/projects/${project.id}` }, { label: "Edit" }]}
      />
      <PageHeader title={`Edit ${project.name}`} />
      <Card className="max-w-3xl">
        <CardContent>
          <ProjectForm
            action={updateProjectAction.bind(null, project.id)}
            clients={clients}
            initial={{
              name: project.name,
              clientId: project.client?.id ?? "",
              description: project.description ?? "",
              status: project.status,
              startDate: project.startDate ? toDateOnly(project.startDate) : "",
              dueDate: project.dueDate ? toDateOnly(project.dueDate) : "",
              fee: amountInputValue(project.fee),
            }}
            currency={ctx.workspace.currency}
            submitLabel="Save changes"
            cancelHref={`/projects/${project.id}`}
          />
        </CardContent>
      </Card>
    </>
  );
}

export default function EditProjectPage({ params }: PageProps<"/projects/[id]/edit">) {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton aria-hidden className="h-96 w-full max-w-3xl rounded-xl" />}>
        <EditProject params={params} />
      </Suspense>
    </PageContainer>
  );
}
