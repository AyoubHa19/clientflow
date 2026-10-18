import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2Icon, CircleIcon, LinkIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { DueBadge } from "@/components/due-badge";
import { Sky } from "@/components/marketing/sky";
import { ProgressBar } from "@/components/progress-bar";
import { ProjectStatusBadge } from "@/components/projects/project-badges";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatDateOnly, todayIn, toDateOnly } from "@/lib/dates";
import { isFinishedProject } from "@/lib/validation/project";
import { db } from "@/server/db";
import { getSharedProject, type SharedProject } from "@/server/projects/sharing";

// A project's status page for its client (Stage 16): open to whoever has
// the link, no account needed. It shows only what getSharedProject()
// selects, is never indexed, and sends no Referer (next.config.ts), so the
// link doesn't leak to other sites.

export async function generateMetadata({
  params,
}: PageProps<"/status/[token]">): Promise<Metadata> {
  const shared = await getSharedProject(db, (await params).token);
  return {
    title: shared ? `${shared.project.name} · status` : "Link not working",
    robots: { index: false, follow: false },
  };
}

function Dates({ shared, today }: { shared: SharedProject; today: string }) {
  const { project, workspace } = shared;
  const due = project.dueDate ? toDateOnly(project.dueDate) : null;
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
      <div>
        <dt className="text-muted-foreground">Started</dt>
        <dd>{project.startDate ? formatDateOnly(project.startDate) : "Not set"}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Due</dt>
        <dd className="flex flex-wrap items-center gap-2">
          {due ? formatDateOnly(due) : "Not set"}
          <DueBadge due={due} today={today} finished={isFinishedProject(project.status)} />
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Last updated</dt>
        <dd>{formatDate(project.updatedAt, workspace.timezone)}</dd>
      </div>
    </dl>
  );
}

function Tasks({ tasks, today }: { tasks: NonNullable<SharedProject["tasks"]>; today: string }) {
  const open = tasks.filter((task) => task.status !== "DONE");
  const done = tasks.filter((task) => task.status === "DONE");
  if (tasks.length === 0) return null;
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section aria-labelledby="next-title">
        <h2 id="next-title" className="font-semibold">
          Next ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing left to do.</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {open.map((task, index) => {
              const due = task.dueDate ? toDateOnly(task.dueDate) : null;
              return (
                <li key={index} className="flex items-start gap-2.5 text-sm">
                  <CircleIcon
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="grid min-w-0 gap-1">
                    <span className="break-words">
                      {task.title}
                      {task.status === "IN_PROGRESS" && (
                        <span className="text-muted-foreground"> · in progress</span>
                      )}
                    </span>
                    {due && (
                      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        Due {formatDateOnly(due)}
                        <DueBadge due={due} today={today} finished={false} />
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section aria-labelledby="done-title">
        <h2 id="done-title" className="font-semibold">
          Done ({done.length})
        </h2>
        {done.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing finished yet.</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {done.map((task, index) => (
              <li key={index} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                <span className="grid min-w-0">
                  <span className="break-words">
                    <span className="sr-only">Done: </span>
                    {task.title}
                  </span>
                  {task.completedAt && (
                    <span className="text-xs text-muted-foreground">
                      Finished {formatDate(task.completedAt, "UTC")}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

async function Status({ params }: { params: PageProps<"/status/[token]">["params"] }) {
  const shared = await getSharedProject(db, (await params).token);

  if (!shared) {
    return (
      <div className="grid gap-3 text-center">
        <LinkIcon aria-hidden className="mx-auto size-8 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">This link doesn&apos;t work</h1>
        <p className="text-sm text-pretty text-muted-foreground">
          It may have been replaced by a new one, or turned off. Ask the person who sent it for a
          fresh link.
        </p>
      </div>
    );
  }

  const { project, workspace, progress } = shared;
  const today = todayIn(workspace.timezone);
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-muted-foreground">{workspace.name} · Project status</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight break-words sm:text-3xl">
          {project.name}
        </h1>
        {project.clientName && (
          <p className="mt-1 text-sm text-muted-foreground">For {project.clientName}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <ProjectStatusBadge status={project.status} />
        </div>
      </div>
      <ProgressBar done={progress.done} total={progress.total} />
      <Dates shared={shared} today={today} />
      {shared.tasks && <Tasks tasks={shared.tasks} today={today} />}
      <p className="border-t pt-4 text-xs text-muted-foreground">
        Shared by {workspace.name}. This page updates as the work moves on.
      </p>
    </div>
  );
}

export default function StatusPage({ params }: PageProps<"/status/[token]">) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <Sky className="-z-10" fade={false} />
      <header className="flex items-center justify-between px-4 py-4 text-white sm:px-8">
        <Link
          href="/"
          aria-label="ClientFlow home"
          className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-white/60"
        >
          <Logo tone="white" />
        </Link>
        <ThemeToggle />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-12 sm:px-8">
        <div className="rounded-3xl glass p-6 sm:p-8">
          <Suspense
            fallback={
              <div className="grid gap-4" aria-hidden>
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            }
          >
            <Status params={params} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
