"use server";

// Server Actions for clients. Next checks each call comes from this site.
// They read only the client's own fields from the form; the workspace
// always comes from requireWorkspace(), and the id from the page's URL is
// checked against it by the service.

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireWorkspace } from "@/server/workspace/context";
import { createClient, deleteClient, setClientArchived, updateClient } from "./service";

export type ClientFormState = {
  errors?: Record<string, string>;
  message?: string;
  values?: Record<string, string>;
};

const FIELDS = ["name", "email", "phone", "company", "notes", "status"] as const;

function readForm(formData: FormData) {
  return Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? "")]));
}

export async function createClientAction(
  _previous: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const ctx = await requireWorkspace();
  const values = readForm(formData);
  const result = await createClient(db, ctx, values);
  if (!result.ok) return { errors: result.errors, message: result.message, values };
  redirect(`/clients/${result.value.id}?notice=created`);
}

export async function updateClientAction(
  id: string,
  _previous: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const ctx = await requireWorkspace();
  const values = readForm(formData);
  const result = await updateClient(db, ctx, id, values);
  if (!result.ok) return { errors: result.errors, message: result.message, values };
  redirect(`/clients/${id}?notice=saved`);
}

export async function setClientArchivedAction(id: string, archived: boolean) {
  const ctx = await requireWorkspace();
  const result = await setClientArchived(db, ctx, id, archived);
  if (!result.ok) return { message: result.message };
  redirect(`/clients/${id}?notice=${archived ? "archived" : "restored"}`);
}

export async function deleteClientAction(id: string) {
  const ctx = await requireWorkspace();
  const result = await deleteClient(db, ctx, id);
  if (!result.ok) return { message: result.message };
  redirect("/clients?notice=deleted");
}
