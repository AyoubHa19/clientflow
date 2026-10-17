"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { selectClassName } from "@/components/forms/styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TASK_LIMITS, TASK_PRIORITIES, TASK_PRIORITY_LABELS } from "@/lib/validation/task";
import { quickAddTaskAction, type TaskFormState } from "@/server/tasks/actions";

/**
 * Add a task in one line: a title, and if wanted a project, due date and
 * priority. On a project's page, `projectId` fixes the project.
 */
export function TaskQuickAdd({
  projects,
  projectId = null,
}: {
  projects: { id: string; name: string }[];
  projectId?: string | null;
}) {
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const title = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState<TaskFormState, FormData>(
    quickAddTaskAction.bind(null, projectId),
    {},
  );

  // After an add: clear the form and get ready for the next task.
  useEffect(() => {
    if (state.added) {
      form.current?.reset();
      title.current?.focus();
    }
  }, [state.added]);

  useEffect(() => {
    if (state.errors) title.current?.focus();
  }, [state.errors]);

  const errors = state.errors ?? {};
  const error = errors.title ?? errors.dueDate ?? errors.projectId ?? errors.priority;

  return (
    <form
      ref={form}
      action={formAction}
      noValidate
      aria-label="Add a task"
      className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end"
    >
      <div className="grid gap-1.5 sm:col-span-2 lg:col-span-1">
        <Label htmlFor={`${id}-title`}>New task</Label>
        <Input
          ref={title}
          id={`${id}-title`}
          name="title"
          placeholder="What needs doing?"
          maxLength={TASK_LIMITS.title}
          defaultValue={state.values?.title}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-10"
          disabled={pending}
        />
      </div>
      {!projectId && (
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-project`}>Project</Label>
          <select
            id={`${id}-project`}
            name="projectId"
            defaultValue={state.values?.projectId ?? ""}
            className={selectClassName}
            disabled={pending}
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-due`}>Due date</Label>
        <Input
          id={`${id}-due`}
          name="dueDate"
          type="date"
          defaultValue={state.values?.dueDate}
          aria-invalid={errors.dueDate ? true : undefined}
          className="h-10"
          disabled={pending}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-priority`}>Priority</Label>
        <select
          id={`${id}-priority`}
          name="priority"
          defaultValue={state.values?.priority ?? "MEDIUM"}
          className={selectClassName}
          disabled={pending}
        >
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {TASK_PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="lg" disabled={pending} className="sm:col-span-2 lg:col-span-1">
        {pending ? (
          <Loader2Icon aria-hidden className="animate-spin" />
        ) : (
          <PlusIcon aria-hidden data-icon="inline-start" />
        )}
        Add task
      </Button>
      <div role="alert" aria-live="assertive" className="sm:col-span-2 lg:col-span-5">
        {error && (
          <p id={`${id}-error`} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
