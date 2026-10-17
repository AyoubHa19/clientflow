import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListChecksIcon, SearchXIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { NoticeToast } from "@/components/notice-toast";
import { RememberListUrl } from "@/components/shell/list-memory";
import { Pagination } from "@/components/pagination";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskList } from "@/components/tasks/task-list";
import { TaskQuickAdd } from "@/components/tasks/task-quick-add";
import { toTaskItems } from "@/components/tasks/to-task-items";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { todayIn } from "@/lib/dates";
import { parseTaskListParams, tasksHref } from "@/lib/validation/task";
import { db } from "@/server/db";
import { listTasks, projectOptions } from "@/server/tasks/service";
import { requireWorkspace } from "@/server/workspace/context";

export const metadata: Metadata = { title: "Tasks" };

const NOTICES = { deleted: "Task deleted" };

async function Tasks({ searchParams }: { searchParams: PageProps<"/tasks">["searchParams"] }) {
  const ctx = await requireWorkspace();
  const params = parseTaskListParams(await searchParams);
  const today = todayIn(ctx.workspace.timezone);
  const [result, projects] = await Promise.all([
    listTasks(db, ctx, params, today),
    projectOptions(db, ctx, params.project !== "none" ? params.project : null),
  ]);
  const filtered =
    params.q !== "" ||
    params.status !== "open" ||
    params.priority !== "any" ||
    params.project !== "" ||
    params.due !== "any";

  return (
    <>
      <TaskQuickAdd projects={projects} />
      <TaskFilters params={params} projects={projects} />
      {result.total === 0 ? (
        filtered ? (
          <EmptyState
            icon={SearchXIcon}
            title="No tasks match"
            description="Try another search or filter."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/tasks">Clear filters</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ListChecksIcon}
            title="Nothing to do"
            description="Add a task above. Done ones are under the Done status."
          />
        )
      ) : (
        <>
          <TaskList tasks={toTaskItems(result.items)} today={today} />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            pageSize={result.pageSize}
            total={result.total}
            noun={result.total === 1 ? "task" : "tasks"}
            hrefFor={(page) => tasksHref({ ...params, page })}
          />
        </>
      )}
    </>
  );
}

export default function TasksPage({ searchParams }: PageProps<"/tasks">) {
  return (
    <PageContainer>
      <PageHeader title="Tasks" description="What needs doing, soonest first." />
      <Suspense
        fallback={
          <div className="grid gap-3" aria-hidden>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        }
      >
        <Tasks searchParams={searchParams} />
        <NoticeToast messages={NOTICES} />
        <RememberListUrl />
      </Suspense>
    </PageContainer>
  );
}
