"use server";

// Server Actions for tasks. Next checks each call comes from this site.
// Only the task's own fields are read from forms; the workspace comes from
// requireWorkspace(), and the service checks every id against it.

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireWorkspace } from "@/server/workspace/context";
import { createTask, deleteTask, setTaskDone, updateTask } from "./service";

export type TaskFormState = {
  errors?: Record<string, string>;
  message?: string;
  values?: Record<string, string>;
  /** Bumped after each quick add, so the form can clear itself. */
  added?: number;
};

const FIELDS = ["title", "description", "projectId", "status", "priority", "dueDate"] as const;

function readForm(formData: FormData) {
  return Object.fromEntries(
    FIELDS.filter((field) => formData.has(field)).map((field) => [
      field,
      String(formData.get(field) ?? ""),
    ]),
  );
}

/**
 * Quick add from a list. On a project's page `projectId` is fixed to that
 * project (the service still checks it belongs to the workspace).
 */
export async function quickAddTaskAction(
  projectId: string | null,
  previous: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const ctx = await requireWorkspace();
  const values = readForm(formData);
  if (projectId) values.projectId = projectId;
  const result = await createTask(db, ctx, values);
  if (!result.ok) return { errors: result.errors, message: result.message, values };
  refresh();
  return { added: (previous.added ?? 0) + 1 };
}

export async function updateTaskAction(
  id: string,
  _previous: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const ctx = await requireWorkspace();
  const values = readForm(formData);
  const result = await updateTask(db, ctx, id, values);
  if (!result.ok) return { errors: result.errors, message: result.message, values };
  redirect(`/tasks/${id}?notice=saved`);
}

export async function setTaskDoneAction(
  id: string,
  done: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await requireWorkspace();
  const result = await setTaskDone(db, ctx, id, done);
  if (!result.ok) return { ok: false, message: result.message };
  refresh();
  return { ok: true };
}

export async function deleteTaskAction(id: string) {
  const ctx = await requireWorkspace();
  const result = await deleteTask(db, ctx, id);
  if (!result.ok) return { message: result.message };
  redirect(
    result.value.projectId ? `/projects/${result.value.projectId}` : "/tasks?notice=deleted",
  );
}
