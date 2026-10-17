"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { Loader2Icon } from "lucide-react";
import {
  focusFirstError,
  FormField,
  FormMessage,
  SelectField,
  TextareaField,
} from "@/components/forms/form-field";
import { useUnsavedChanges } from "@/components/forms/use-unsaved-changes";
import { Button } from "@/components/ui/button";
import {
  CLIENT_LIMITS,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUSES,
  type ClientStatus,
} from "@/lib/validation/client";
import type { ClientFormState } from "@/server/clients/actions";

export type ClientFormValues = {
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  status: ClientStatus;
};

const STATUS_OPTIONS = CLIENT_STATUSES.map((status) => ({
  value: status,
  label: CLIENT_STATUS_LABELS[status],
}));

/** The client form, for adding and for editing. */
export function ClientForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  initial?: Partial<ClientFormValues>;
  submitLabel: string;
  cancelHref: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(action, {});
  useUnsavedChanges(form, state);

  useEffect(() => {
    if (state.errors && form.current) {
      focusFirstError(form.current);
    }
  }, [state]);

  // After a failed save, show what was typed rather than the old values.
  const values = { ...initial, ...state.values };
  const errors = state.errors ?? {};

  return (
    <form
      ref={form}
      action={formAction}
      noValidate
      className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <FormMessage>{state.errors ? undefined : state.message}</FormMessage>
      </div>
      <div className="sm:col-span-2" key={`name-${values.name}`}>
        <FormField
          label="Name"
          name="name"
          defaultValue={values.name}
          maxLength={CLIENT_LIMITS.name}
          hint="A person or a business."
          error={errors.name}
          disabled={pending}
        />
      </div>
      <FormField
        key={`email-${values.email}`}
        label="Email (optional)"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="off"
        defaultValue={values.email}
        maxLength={CLIENT_LIMITS.email}
        error={errors.email}
        disabled={pending}
      />
      <FormField
        key={`phone-${values.phone}`}
        label="Phone (optional)"
        name="phone"
        type="tel"
        autoComplete="off"
        defaultValue={values.phone}
        maxLength={CLIENT_LIMITS.phone}
        error={errors.phone}
        disabled={pending}
      />
      <FormField
        key={`company-${values.company}`}
        label="Company (optional)"
        name="company"
        autoComplete="off"
        defaultValue={values.company}
        maxLength={CLIENT_LIMITS.company}
        error={errors.company}
        disabled={pending}
      />
      <SelectField
        key={`status-${values.status}`}
        label="Status"
        name="status"
        defaultValue={values.status ?? "ACTIVE"}
        options={STATUS_OPTIONS}
        error={errors.status}
        disabled={pending}
      />
      <div className="sm:col-span-2">
        <TextareaField
          key={`notes-${values.notes}`}
          label="Notes (optional)"
          name="notes"
          defaultValue={values.notes}
          maxLength={CLIENT_LIMITS.notes}
          hint="Anything worth remembering: how you met, what they need."
          error={errors.notes}
          disabled={pending}
        />
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2Icon aria-hidden className="animate-spin" />}
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Button asChild variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
