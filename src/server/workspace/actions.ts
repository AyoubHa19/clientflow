"use server";

// Server Actions for the onboarding and settings forms. Next checks that
// every Server Action call comes from this site (Origin header), so these
// are safe from cross-site requests. They only read `name`, `timezone` and
// `currency` from the form: which user and workspace always come from the
// session.

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { requireWorkspace } from "./context";
import { createWorkspace, updateWorkspaceSettings } from "./service";

export type WorkspaceFormState = {
  errors?: Record<string, string>;
  message?: string;
  saved?: boolean;
  values?: { name: string; timezone: string; currency: string };
};

function readForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    timezone: String(formData.get("timezone") ?? ""),
    currency: String(formData.get("currency") ?? ""),
  };
}

export async function createWorkspaceAction(
  _previous: WorkspaceFormState,
  formData: FormData,
): Promise<WorkspaceFormState> {
  const user = await requireUser();
  const values = readForm(formData);
  const result = await createWorkspace(db, user.id, values);
  if (!result.ok && result.code !== "ALREADY_HAS_WORKSPACE") {
    return { errors: result.errors, message: result.message, values };
  }
  // Created, or they already had one (another tab): either way, the app.
  redirect("/");
}

export async function updateWorkspaceAction(
  _previous: WorkspaceFormState,
  formData: FormData,
): Promise<WorkspaceFormState> {
  const ctx = await requireWorkspace();
  const values = readForm(formData);
  const result = await updateWorkspaceSettings(db, ctx, values);
  if (!result.ok) return { errors: result.errors, message: result.message, values };
  // Redraw the page, so the side bar shows the new name too.
  refresh();
  return {
    saved: true,
    values: {
      name: result.value.name,
      timezone: result.value.timezone,
      currency: result.value.currency,
    },
  };
}
