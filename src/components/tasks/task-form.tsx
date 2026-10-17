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
  TASK_LIMITS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/validation/task";
import type { TaskFormState } from "@/server/tasks/actions";

export type TaskFormValues = {
  title: string;
  description: string;
  projectId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
};

/** Editing a task. */
export function TaskForm({
  action,
  projects,
  initial,
  cancelHref,
}: {
  action: (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  projects: { id: string; name: string }[];
  initial: TaskFormValues;
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
      <div className="sm:col-span-2">
        <FormField
          key={`title-${values.title}`}
          label="Title"
          name="title"
          defaultValue={values.title}
          maxLength={TASK_LIMITS.title}
          error={errors.title}
          disabled={pending}
        />
      </div>
      <SelectField
        key={`project-${values.projectId}`}
        label="Project"
        name="projectId"
        defaultValue={values.projectId}
        options={[
          { value: "", label: "No project" },
          ...projects.map((project) => ({ value: project.id, label: project.name })),
        ]}
        error={errors.projectId}
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
      <SelectField
        key={`status-${values.status}`}
        label="Status"
        name="status"
        defaultValue={values.status}
        options={TASK_STATUSES.map((value) => ({ value, label: TASK_STATUS_LABELS[value] }))}
        error={errors.status}
        disabled={pending}
      />
      <SelectField
        key={`priority-${values.priority}`}
        label="Priority"
        name="priority"
        defaultValue={values.priority}
        options={TASK_PRIORITIES.map((value) => ({ value, label: TASK_PRIORITY_LABELS[value] }))}
        error={errors.priority}
        disabled={pending}
      />
      <div className="sm:col-span-2">
        <TextareaField
          key={`description-${values.description}`}
          label="Notes (optional)"
          name="description"
          defaultValue={values.description}
          maxLength={TASK_LIMITS.description}
          error={errors.description}
          disabled={pending}
        />
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2Icon aria-hidden className="animate-spin" />}
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button asChild variant="outline">
          <Link href={cancelHref}>Back</Link>
        </Button>
      </div>
    </form>
  );
}
