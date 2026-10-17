import { formatDateOnly, toDateOnly } from "@/lib/dates";
import type { TaskRecord } from "@/server/tasks/service";
import type { TaskItem } from "./task-list";

/** What the task list needs, with dates already as plain strings. */
export function toTaskItems(tasks: TaskRecord[]): TaskItem[] {
  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    due: task.dueDate ? toDateOnly(task.dueDate) : null,
    dueLabel: task.dueDate ? formatDateOnly(task.dueDate) : null,
    project: task.project,
  }));
}
