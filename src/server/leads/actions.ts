"use server";

// Server Actions for leads. Next checks each call comes from this site.
// Only the lead's own fields are read from forms; the workspace comes from
// requireWorkspace(), and the service checks every id against it.

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { LeadStatus } from "@/lib/validation/lead";
import { db } from "@/server/db";
import { requireWorkspace } from "@/server/workspace/context";
import {
  convertLead,
  createLead,
  deleteLead,
  logContact,
  setLeadStatus,
  updateLead,
} from "./service";

export type LeadFormState = {
  errors?: Record<string, string>;
  message?: string;
  values?: Record<string, string>;
};

const FIELDS = [
  "contactName",
  "company",
  "email",
  "phone",
  "source",
  "notes",
  "status",
  "lastContactedOn",
  "nextFollowUpOn",
  "value",
] as const;

function readForm(formData: FormData) {
  return Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? "")]));
}

export async function createLeadAction(
  _previous: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const ctx = await requireWorkspace();
  const values = readForm(formData);
  const result = await createLead(db, ctx, values);
  if (!result.ok) return { errors: result.errors, message: result.message, values };
  redirect(`/leads/${result.value.id}?notice=created`);
}

export async function updateLeadAction(
  id: string,
  _previous: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const ctx = await requireWorkspace();
  const values = readForm(formData);
  const result = await updateLead(db, ctx, id, values);
  if (!result.ok) return { errors: result.errors, message: result.message, values };
  redirect(`/leads/${id}?notice=saved`);
}

/**
 * Moves a lead. The board shows the move straight away (optimistic) and
 * this redraws the page with the saved state in the same response.
 */
export async function setLeadStatusAction(
  id: string,
  status: LeadStatus,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await requireWorkspace();
  const result = await setLeadStatus(db, ctx, id, status);
  if (!result.ok) return { ok: false, message: result.message };
  refresh();
  return { ok: true };
}

const CONTACT_FIELDS = ["contactedOn", "note", "nextFollowUpOn"] as const;

/** "Log a contact" on a lead's page; back to the page with a notice. */
export async function logContactAction(
  id: string,
  _previous: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const ctx = await requireWorkspace();
  const values = Object.fromEntries(
    CONTACT_FIELDS.map((field) => [field, String(formData.get(field) ?? "")]),
  );
  const result = await logContact(db, ctx, id, values);
  if (!result.ok) return { errors: result.errors, message: result.message, values };
  redirect(`/leads/${id}?notice=contacted`);
}

export async function convertLeadAction(id: string, linkClientId: string | null) {
  const ctx = await requireWorkspace();
  const result = await convertLead(db, ctx, id, { linkClientId });
  if (!result.ok) return { message: result.message };
  redirect(`/leads/${id}?notice=${result.value.created ? "converted" : "linked"}`);
}

export async function deleteLeadAction(id: string) {
  const ctx = await requireWorkspace();
  const result = await deleteLead(db, ctx, id);
  if (!result.ok) return { message: result.message };
  redirect("/leads?notice=deleted");
}
