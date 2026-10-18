"use server";

// Server Actions for projects. Next checks each call comes from this site.
// Only the project's own fields are read from forms; the workspace comes
// from requireWorkspace(), and the service checks every id against it
// (the client's too).

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ProjectStatus } from "@/lib/validation/project";
import { db } from "@/server/db";
import { requireWorkspace } from "@/server/workspace/context";
import { createProject, deleteProject, setProjectStatus, updateProject } from "./service";
import { setShareTasks, shareProject, stopSharing } from "./sharing";

export type ProjectFormState = {
  errors?: Record<string, string>;
  message?: string;
  values?: Record<string, string>;
};

const FIELDS = [
  "name",
  "clientId",
  "description",
  "status",
  "startDate",
  "dueDate",
  "fee",
] as const;

function readForm(formData: FormData) {
  return Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? "")]));
}

export async function createProjectAction(
  _previous: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const ctx = await requireWorkspace();
  const values = readForm(formData);
  const result = await createProject(db, ctx, values);
  if (!result.ok) return { errors: result.errors, message: result.message, values };
  redirect(`/projects/${result.value.id}?notice=created`);
}

export async function updateProjectAction(
  id: string,
  _previous: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const ctx = await requireWorkspace();
  const values = readForm(formData);
  const result = await updateProject(db, ctx, id, values);
  if (!result.ok) return { errors: result.errors, message: result.message, values };
  redirect(`/projects/${id}?notice=saved`);
}

export async function setProjectStatusAction(
  id: string,
  status: ProjectStatus,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await requireWorkspace();
  const result = await setProjectStatus(db, ctx, id, status);
  if (!result.ok) return { ok: false, message: result.message };
  refresh();
  return { ok: true };
}

export async function deleteProjectAction(id: string) {
  const ctx = await requireWorkspace();
  const result = await deleteProject(db, ctx, id);
  if (!result.ok) return { message: result.message };
  redirect("/projects?notice=deleted");
}

// Sharing a project's status page with its client (Stage 16). Owners only:
// the service checks the role and that the project is in the workspace.

type ShareResult = { ok: true } | { ok: false; message: string };

export async function shareProjectAction(id: string): Promise<ShareResult> {
  const ctx = await requireWorkspace();
  const result = await shareProject(db, ctx, id);
  if (!result.ok) return { ok: false, message: result.message };
  refresh();
  return { ok: true };
}

export async function stopSharingAction(id: string): Promise<ShareResult> {
  const ctx = await requireWorkspace();
  const result = await stopSharing(db, ctx, id);
  if (!result.ok) return { ok: false, message: result.message };
  refresh();
  return { ok: true };
}

export async function setShareTasksAction(id: string, show: boolean): Promise<ShareResult> {
  const ctx = await requireWorkspace();
  const result = await setShareTasks(db, ctx, id, show);
  if (!result.ok) return { ok: false, message: result.message };
  refresh();
  return { ok: true };
}
