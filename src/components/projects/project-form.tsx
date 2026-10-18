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
  PROJECT_LIMITS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  type ProjectStatus,
} from "@/lib/validation/project";
import type { ProjectFormState } from "@/server/projects/actions";

export type ProjectFormValues = {
  name: string;
  clientId: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  dueDate: string;
  fee: string;
  template: string;
};

const STATUS_OPTIONS = PROJECT_STATUSES.map((status) => ({
  value: status,
  label: PROJECT_STATUS_LABELS[status],
}));

/** The project form, for adding and for editing. */
export function ProjectForm({
  action,
  clients,
  initial,
  submitLabel,
  cancelHref,
  currency,
  templates,
}: {
  action: (state: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  clients: { id: string; name: string }[];
  initial?: Partial<ProjectFormValues>;
  submitLabel: string;
  cancelHref: string;
  /** The workspace's currency, for the fee field. */
  currency: string;
  /** Templates to start from (new projects only). */
  templates?: { value: string; label: string; ownTemplate: boolean }[];
}) {
  const form = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(action, {});
  useUnsavedChanges(form, state);

  useEffect(() => {
    if (state.errors && form.current) {
      focusFirstError(form.current);
    }
  }, [state]);

  const values = { ...initial, ...state.values };
  const errors = state.errors ?? {};
  const clientChoices = [
    { value: "", label: "No client" },
    ...clients.map((client) => ({ value: client.id, label: client.name })),
  ];

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
      {templates && (
        <div className="sm:col-span-2">
          <SelectField
            key={`template-${values.template}`}
            label="Start from"
            name="template"
            defaultValue={values.template ?? ""}
            options={[
              { value: "", label: "A blank project" },
              ...templates.map((template) => ({
                value: template.value,
                label: template.ownTemplate ? `Your template: ${template.label}` : template.label,
              })),
            ]}
            hint="A template adds its tasks, due dates counted from the start date (or today)."
            error={errors.template}
            disabled={pending}
          />
        </div>
      )}
      <div className="sm:col-span-2">
        <FormField
          key={`name-${values.name}`}
          label="Project name"
          name="name"
          defaultValue={values.name}
          maxLength={PROJECT_LIMITS.name}
          error={errors.name}
          disabled={pending}
        />
      </div>
      <SelectField
        key={`client-${values.clientId}`}
        label="Client"
        name="clientId"
        defaultValue={values.clientId ?? ""}
        options={clientChoices}
        hint={clients.length === 0 ? "No clients yet: you can link one later." : undefined}
        error={errors.clientId}
        disabled={pending}
      />
      <SelectField
        key={`status-${values.status}`}
        label="Status"
        name="status"
        defaultValue={values.status ?? "PLANNING"}
        options={STATUS_OPTIONS}
        error={errors.status}
        disabled={pending}
      />
      <FormField
        key={`start-${values.startDate}`}
        label="Start date (optional)"
        name="startDate"
        type="date"
        defaultValue={values.startDate}
        error={errors.startDate}
        disabled={pending}
      />
      <FormField
        key={`due-${values.dueDate}`}
        label="Due date (optional)"
        name="dueDate"
        type="date"
        defaultValue={values.dueDate}
        error={errors.dueDate}
        disabled={pending}
      />
      <FormField
        key={`fee-${values.fee}`}
        label={`Fee in ${currency} (optional)`}
        name="fee"
        inputMode="decimal"
        autoComplete="off"
        defaultValue={values.fee}
        hint="What the client pays for it, like 1500 or 1,500.50."
        error={errors.fee}
        disabled={pending}
      />
      <div className="sm:col-span-2">
        <TextareaField
          key={`description-${values.description}`}
          label="Description (optional)"
          name="description"
          defaultValue={values.description}
          maxLength={PROJECT_LIMITS.description}
          hint="The goal, what's included, links."
          error={errors.description}
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
