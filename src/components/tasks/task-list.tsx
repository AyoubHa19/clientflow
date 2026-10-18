"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DueBadge } from "@/components/due-badge";
import type { TaskPriority, TaskStatus } from "@/lib/validation/task";
import { cn } from "@/lib/utils";
import { setTaskDoneAction } from "@/server/tasks/actions";
import { InProgressBadge, PriorityBadge } from "./task-badges";

export type TaskItem = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** "YYYY-MM-DD" or null. */
  due: string | null;
  dueLabel: string | null;
  project: { id: string; name: string } | null;
};

/**
 * Tasks with a checkbox each. Ticking shows at once and is saved in the
 * background; if saving fails the box goes back and a message explains.
 */
export function TaskList({
  tasks,
  today,
  showProject = true,
}: {
  tasks: TaskItem[];
  today: string;
  showProject?: boolean;
}) {
  const [items, setDoneOptimistically] = useOptimistic(
    tasks,
    (current: TaskItem[], change: { id: string; done: boolean }) =>
      current.map((task) =>
        task.id === change.id ? { ...task, status: change.done ? "DONE" : "TODO" } : task,
      ),
  );
  const [, startTransition] = useTransition();

  function toggle(task: TaskItem, done: boolean) {
    startTransition(async () => {
      setDoneOptimistically({ id: task.id, done });
      const result = await setTaskDoneAction(task.id, done);
      if (!result.ok) toast.error(result.message);
    });
  }

  return (
    <ul className="@container grid grid-cols-[minmax(0,1fr)] divide-y overflow-clip surface">
      {items.map((task) => {
        const done = task.status === "DONE";
        const checkboxId = `task-done-${task.id}`;
        const badges = task.status === "IN_PROGRESS" || !done;
        return (
          // In a narrow list (a phone, or a project's card) the badges go
          // under the title, so the title keeps its width.
          <li
            key={task.id}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1.5 px-4 py-3 transition-colors hover:bg-muted/40 @md:flex @md:gap-3"
            data-task-status={task.status}
          >
            <input
              id={checkboxId}
              type="checkbox"
              checked={done}
              onChange={(event) => toggle(task, event.target.checked)}
              aria-label={`${task.title}: ${done ? "done" : "not done"}`}
              className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-[var(--brand)]"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/tasks/${task.id}`}
                className={cn(
                  // py-0.5 and min-h-6: at least 24px tall, big enough for a finger (WCAG 2.5.8).
                  "block truncate py-0.5 text-sm font-medium underline-offset-4 transition-colors hover:underline",
                  done && "text-muted-foreground line-through",
                )}
              >
                {task.title}
              </Link>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {showProject && task.project && (
                  <Link
                    href={`/projects/${task.project.id}`}
                    className="inline-block max-w-48 truncate align-middle leading-6 underline-offset-4 hover:underline"
                  >
                    {task.project.name}
                  </Link>
                )}
                {task.dueLabel && <span>Due {task.dueLabel}</span>}
                <DueBadge due={task.due} today={today} finished={done} />
              </div>
            </div>
            {badges && (
              <div className="col-start-2 flex flex-wrap gap-1.5 @md:shrink-0 @md:justify-end">
                {task.status === "IN_PROGRESS" && <InProgressBadge />}
                {!done && <PriorityBadge priority={task.priority} />}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
