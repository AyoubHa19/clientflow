import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FolderKanbanIcon, PlusIcon, SearchXIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { NoticeToast } from "@/components/notice-toast";
import { Pagination } from "@/components/pagination";
import { ProjectFilters } from "@/components/projects/project-filters";
import { ProjectList } from "@/components/projects/project-list";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { todayIn } from "@/lib/dates";
import { parseProjectListParams, projectsHref } from "@/lib/validation/project";
import { db } from "@/server/db";
import { clientOptions, listProjects } from "@/server/projects/service";
import { requireWorkspace } from "@/server/workspace/context";

export const metadata: Metadata = { title: "Projects" };

const NOTICES = { deleted: "Project deleted" };

async function Projects({
  searchParams,
}: {
  searchParams: PageProps<"/projects">["searchParams"];
}) {
  const ctx = await requireWorkspace();
  const params = parseProjectListParams(await searchParams);
  const [result, clients] = await Promise.all([
    listProjects(db, ctx, params),
    clientOptions(db, ctx, params.client !== "none" ? params.client : null),
  ]);
  const filtered = params.q !== "" || params.client !== "" || params.status !== "open";

  return (
    <>
      <ProjectFilters params={params} clients={clients} />
      {result.total === 0 ? (
        filtered ? (
          <EmptyState
            icon={SearchXIcon}
            title="No projects match"
            description="Try another search, status or client."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/projects">Clear filters</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FolderKanbanIcon}
            title="No open projects"
            description="Add a project, link it to a client and give it a due date. Finished ones are under the Completed status."
            action={
              <Button asChild size="sm">
                <Link href="/projects/new">Add a project</Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          <ProjectList projects={result.items} today={todayIn(ctx.workspace.timezone)} />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            pageSize={result.pageSize}
            total={result.total}
            noun={result.total === 1 ? "project" : "projects"}
            hrefFor={(page) => projectsHref({ ...params, page })}
          />
        </>
      )}
    </>
  );
}

export default function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  return (
    <PageContainer>
      <PageHeader
        title="Projects"
        description="Your work for clients, with what's due and what's late."
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <PlusIcon aria-hidden data-icon="inline-start" />
              New project
            </Link>
          </Button>
        }
      />
      <Suspense
        fallback={
          <div className="grid gap-3" aria-hidden>
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        }
      >
        <Projects searchParams={searchParams} />
        <NoticeToast messages={NOTICES} />
      </Suspense>
    </PageContainer>
  );
}
