import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NoticeToast } from "@/components/notice-toast";
import { ProgressBar } from "@/components/progress-bar";
import { DueBadge, ProjectStatusBadge } from "@/components/projects/project-badges";
import { ProjectActions } from "@/components/projects/project-actions";
import { PageContainer } from "@/components/shell/page-header";
import { TaskList } from "@/components/tasks/task-list";
import { TaskQuickAdd } from "@/components/tasks/task-quick-add";
import { toTaskItems } from "@/components/tasks/to-task-items";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { formatDate, formatDateOnly, todayIn, toDateOnly } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { ShareCard } from "@/components/projects/share-card";
import { getShareState, shareUrl } from "@/server/projects/sharing";
import { db } from "@/server/db";
import { getProject } from "@/server/projects/service";
import { projectProgress, tasksForProject } from "@/server/tasks/service";
import { requireWorkspace } from "@/server/workspace/context";

// The record's name in the browser tab (it streams in with the page).
export async function generateMetadata({ params }: PageProps<"/projects/[id]">): Promise<Metadata> {
  const { id } = await params;
  const record = await getProject(db, await requireWorkspace(), id);
  return { title: record ? record.name : "Not found" };
}

const NOTICES = { created: "Project added", saved: "Changes saved" };

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

async function ProjectDetails({ params }: { params: PageProps<"/projects/[id]">["params"] }) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const project = await getProject(db, ctx, id);
  if (!project) notFound();
  const tz = ctx.workspace.timezone;
  const today = todayIn(tz);
  const [tasks, progressById, share] = await Promise.all([
    tasksForProject(db, ctx, project.id),
    projectProgress(db, ctx, [project.id]),
    getShareState(db, ctx, project.id),
  ]);
  const progress = progressById[project.id] ?? { done: 0, total: 0 };

  return (
    <>
      <Breadcrumbs
        list={{ label: "Projects", href: "/projects" }}
        items={[{ label: project.name }]}
      />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight break-words">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
            <DueBadge
              due={project.dueDate ? toDateOnly(project.dueDate) : null}
              today={today}
              status={project.status}
            />
          </div>
          {project.client && (
            <p className="mt-1 text-sm text-muted-foreground">
              For{" "}
              <Link
                href={`/clients/${project.client.id}`}
                className="text-brand underline-offset-4 hover:underline"
              >
                {project.client.name}
              </Link>
            </p>
          )}
        </div>
        <ProjectActions
          id={project.id}
          name={project.name}
          status={project.status}
          canDelete={ctx.role === "OWNER"}
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Description</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.description ? (
              <p className="text-sm break-words whitespace-pre-wrap">{project.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No description yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Dates</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-[6rem_minmax(0,1fr)]">
              <Detail label="Start">
                {project.startDate && formatDateOnly(project.startDate)}
              </Detail>
              <Detail label="Due">{project.dueDate && formatDateOnly(project.dueDate)}</Detail>
              <Detail label="Fee">
                {project.fee !== null && formatMoney(project.fee, ctx.workspace.currency)}
              </Detail>
              <Detail label="Added">{formatDate(project.createdAt, tz)}</Detail>
              <Detail label="Updated">{formatDate(project.updatedAt, tz)}</Detail>
            </dl>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <h2>Share with client</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ShareCard
              projectId={project.id}
              url={share?.token ? shareUrl(share.token) : null}
              sharedOn={share?.sharedAt ? formatDate(share.sharedAt, tz) : null}
              showTasks={share?.showTasks ?? true}
              canEdit={ctx.role === "OWNER"}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <h2>Tasks</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ProgressBar done={progress.done} total={progress.total} />
            <TaskQuickAdd projects={[]} projectId={project.id} />
            {tasks.length > 0 ? (
              <TaskList tasks={toTaskItems(tasks)} today={today} showProject={false} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No tasks yet: add the first one above.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function ProjectPage({ params }: PageProps<"/projects/[id]">) {
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
        <ProjectDetails params={params} />
        <NoticeToast messages={NOTICES} />
      </Suspense>
    </PageContainer>
  );
}
