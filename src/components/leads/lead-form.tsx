"use client";

import { useActionState, useEffect, useId, useRef } from "react";
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
  LEAD_LIMITS,
  LEAD_SOURCE_SUGGESTIONS,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  type LeadStatus,
} from "@/lib/validation/lead";
import type { LeadFormState } from "@/server/leads/actions";

export type LeadFormValues = {
  contactName: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  notes: string;
  status: LeadStatus;
  lastContactedOn: string;
  nextFollowUpOn: string;
  value: string;
};

const STATUS_OPTIONS = LEAD_STATUSES.map((status) => ({
  value: status,
  label: LEAD_STATUS_LABELS[status],
}));

/** The lead form, for adding and for editing. */
export function LeadForm({
  action,
  initial,
  submitLabel,
  cancelHref,
  currency,
  statusLocked = false,
}: {
  action: (state: LeadFormState, formData: FormData) => Promise<LeadFormState>;
  initial?: Partial<LeadFormValues>;
  submitLabel: string;
  cancelHref: string;
  /** The workspace's currency, for the value field. */
  currency: string;
  /** A converted lead stays Won. */
  statusLocked?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const sourcesId = useId();
  const [state, formAction, pending] = useActionState(action, {});
  useUnsavedChanges(form, state);

  useEffect(() => {
    if (state.errors && form.current) {
      focusFirstError(form.current);
    }
  }, [state]);

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
      <FormField
        key={`contactName-${values.contactName}`}
        label="Contact name"
        name="contactName"
        defaultValue={values.contactName}
        maxLength={LEAD_LIMITS.name}
        error={errors.contactName}
        disabled={pending}
      />
      <FormField
        key={`company-${values.company}`}
        label="Company (optional)"
        name="company"
        autoComplete="off"
        defaultValue={values.company}
        maxLength={LEAD_LIMITS.company}
        error={errors.company}
        disabled={pending}
      />
      <FormField
        key={`email-${values.email}`}
        label="Email (optional)"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="off"
        defaultValue={values.email}
        maxLength={LEAD_LIMITS.email}
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
        maxLength={LEAD_LIMITS.phone}
        error={errors.phone}
        disabled={pending}
      />
      <FormField
        key={`source-${values.source}`}
        label="Source (optional)"
        name="source"
        list={sourcesId}
        autoComplete="off"
        defaultValue={values.source}
        maxLength={LEAD_LIMITS.source}
        hint="Where they found you. Pick one or type your own."
        error={errors.source}
        disabled={pending}
      />
      <datalist id={sourcesId}>
        {LEAD_SOURCE_SUGGESTIONS.map((source) => (
          <option key={source} value={source} />
        ))}
      </datalist>
      {statusLocked ? (
        <>
          <input type="hidden" name="status" value="WON" />
          <div className="grid content-start gap-2 text-sm">
            <span className="font-medium">Status</span>
            <p className="text-muted-foreground">Won: this lead became a client.</p>
          </div>
        </>
      ) : (
        <SelectField
          key={`status-${values.status}`}
          label="Status"
          name="status"
          defaultValue={values.status ?? "NEW"}
          options={STATUS_OPTIONS}
          error={errors.status}
          disabled={pending}
        />
      )}
      <FormField
        key={`value-${values.value}`}
        label={`Expected value in ${currency} (optional)`}
        name="value"
        inputMode="decimal"
        autoComplete="off"
        defaultValue={values.value}
        hint="What the work could be worth, like 1500 or 1,500.50."
        error={errors.value}
        disabled={pending}
      />
      <div aria-hidden className="hidden sm:block" />
      <FormField
        key={`lastContactedOn-${values.lastContactedOn}`}
        label="Last contacted (optional)"
        name="lastContactedOn"
        type="date"
        defaultValue={values.lastContactedOn}
        error={errors.lastContactedOn}
        disabled={pending}
      />
      <FormField
        key={`nextFollowUpOn-${values.nextFollowUpOn}`}
        label="Next follow-up (optional)"
        name="nextFollowUpOn"
        type="date"
        defaultValue={values.nextFollowUpOn}
        hint="When to get back to them. It shows on your dashboard that day."
        error={errors.nextFollowUpOn}
        disabled={pending}
      />
      <div className="sm:col-span-2">
        <TextareaField
          key={`notes-${values.notes}`}
          label="Notes (optional)"
          name="notes"
          defaultValue={values.notes}
          maxLength={LEAD_LIMITS.notes}
          hint="What they need, budget, next step."
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
