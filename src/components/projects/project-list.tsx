import Link from "next/link";
import { formatDateOnly, toDateOnly } from "@/lib/dates";
import { ProgressBar } from "@/components/progress-bar";
import type { ProjectRecord } from "@/server/projects/service";
import type { Progress } from "@/server/tasks/service";
import { DueBadge, ProjectStatusBadge } from "./project-badges";

const dash = <span className="text-muted-foreground">—</span>;

/** Projects as a table on wide screens and as cards on phones. */
export function ProjectList({
  projects,
  today,
  showClient = true,
  progress,
}: {
  projects: ProjectRecord[];
  /** Today in the workspace's time zone, "YYYY-MM-DD". */
  today: string;
  showClient?: boolean;
  /** Tasks done per project id, when known. */
  progress?: Record<string, Progress>;
}) {
  const due = (project: ProjectRecord) => (project.dueDate ? toDateOnly(project.dueDate) : null);
  const headings = [
    "Project",
    ...(showClient ? ["Client"] : []),
    "Status",
    ...(progress ? ["Tasks"] : []),
    "Start",
    "Due",
  ];
  const progressOf = (project: ProjectRecord) => progress?.[project.id] ?? { done: 0, total: 0 };

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Projects</caption>
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {headings.map((heading) => (
                <th key={heading} scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-muted/40">
                <td className="max-w-72 px-4 py-3">
                  <Link
                    href={`/projects/${project.id}`}
                    className="block truncate font-medium underline-offset-4 hover:underline"
                  >
                    {project.name}
                  </Link>
                </td>
                {showClient && (
                  <td className="max-w-56 truncate px-4 py-3">{project.client?.name ?? dash}</td>
                )}
                <td className="px-4 py-3">
                  <ProjectStatusBadge status={project.status} />
                </td>
                {progress && (
                  <td className="px-4 py-3">
                    <ProgressBar {...progressOf(project)} compact />
                  </td>
                )}
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {project.startDate ? formatDateOnly(project.startDate) : dash}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 whitespace-nowrap">
                    {project.dueDate ? formatDateOnly(project.dueDate) : dash}
                    <DueBadge due={due(project)} today={today} status={project.status} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:hidden">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              href={`/projects/${project.id}`}
              className="block rounded-xl border p-4 outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 truncate font-medium">{project.name}</span>
                <ProjectStatusBadge status={project.status} />
              </div>
              {showClient && project.client && (
                <p className="mt-1 truncate text-sm text-muted-foreground">{project.client.name}</p>
              )}
              {progress && (
                <div className="mt-3">
                  <ProgressBar {...progressOf(project)} compact />
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {project.dueDate ? `Due ${formatDateOnly(project.dueDate)}` : "No due date"}
                <DueBadge due={due(project)} today={today} status={project.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
