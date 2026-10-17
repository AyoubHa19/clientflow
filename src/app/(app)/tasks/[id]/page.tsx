import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { DueBadge } from "@/components/due-badge";
import { NoticeToast } from "@/components/notice-toast";
import { PageContainer } from "@/components/shell/page-header";
import { TaskDelete } from "@/components/tasks/task-delete";
import { TaskForm } from "@/components/tasks/task-form";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, todayIn, toDateOnly } from "@/lib/dates";
import { db } from "@/server/db";
import { updateTaskAction } from "@/server/tasks/actions";
import { getTask, projectOptions } from "@/server/tasks/service";
import { requireWorkspace } from "@/server/workspace/context";

export const metadata: Metadata = { title: "Task" };

const NOTICES = { saved: "Changes saved" };

async function TaskDetails({ params }: { params: PageProps<"/tasks/[id]">["params"] }) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const task = await getTask(db, ctx, id);
  if (!task) notFound();
  const projects = await projectOptions(db, ctx, task.project?.id);
  const tz = ctx.workspace.timezone;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight break-words">{task.title}</h1>
            <DueBadge
              due={task.dueDate ? toDateOnly(task.dueDate) : null}
              today={todayIn(tz)}
              finished={task.status === "DONE"}
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {task.project ? (
              <>
                In{" "}
                <Link
                  href={`/projects/${task.project.id}`}
                  className="text-brand underline-offset-4 hover:underline"
                >
                  {task.project.name}
                </Link>
                {" · "}
              </>
            ) : null}
            Added {formatDate(task.createdAt, tz)}
            {task.completedAt ? ` · Done ${formatDate(task.completedAt, tz)}` : ""}
          </p>
        </div>
        {ctx.role === "OWNER" && <TaskDelete id={task.id} title={task.title} />}
      </div>
      <Card className="max-w-3xl">
        <CardContent>
          <TaskForm
            action={updateTaskAction.bind(null, task.id)}
            projects={projects}
            initial={{
              title: task.title,
              description: task.description ?? "",
              projectId: task.project?.id ?? "",
              status: task.status,
              priority: task.priority,
              dueDate: task.dueDate ? toDateOnly(task.dueDate) : "",
            }}
            cancelHref={task.project ? `/projects/${task.project.id}` : "/tasks"}
          />
        </CardContent>
      </Card>
    </>
  );
}

export default function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  return (
    <PageContainer>
      <Link
        href="/tasks"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        All tasks
      </Link>
      <Suspense
        fallback={
          <div className="grid gap-4" aria-hidden>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-96 w-full max-w-3xl rounded-xl" />
          </div>
        }
      >
        <TaskDetails params={params} />
        <NoticeToast messages={NOTICES} />
      </Suspense>
    </PageContainer>
  );
}
