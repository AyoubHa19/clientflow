"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { selectClassName } from "@/components/forms/styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TASK_LIMITS, TASK_PRIORITIES, TASK_PRIORITY_LABELS } from "@/lib/validation/task";
import { quickAddTaskAction, type TaskFormState } from "@/server/tasks/actions";

// Whole class names, so Tailwind finds them.
const WIDE = {
  lg: {
    grid: "lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto]",
    toggle: "lg:hidden",
    contents: "lg:contents",
    last: "lg:order-last",
    full: "lg:col-span-full",
  },
  xl: {
    grid: "xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]",
    toggle: "xl:hidden",
    contents: "xl:contents",
    last: "xl:order-last",
    full: "xl:col-span-full",
  },
};

/**
 * Add a task in one line: a title, and if wanted a project, due date and
 * priority. On a project's page, `projectId` fixes the project. On narrower
 * screens the extras fold away behind "More options", so the list stays in
 * view (below lg on a project's page, with two extras; below xl with three).
 */
export function TaskQuickAdd({
  projects,
  projectId = null,
}: {
  projects: { id: string; name: string }[];
  projectId?: string | null;
}) {
  const id = useId();
  const [showOptions, setShowOptions] = useState(false);
  const wide = projectId ? WIDE.lg : WIDE.xl;
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

  const errors = state.errors ?? {};
  const error = errors.title ?? errors.dueDate ?? errors.projectId ?? errors.priority;

  // A problem with an extra opens the extras, so it can be fixed (state
  // adjusted while rendering, as React recommends, not in an effect).
  const [seenErrors, setSeenErrors] = useState(state.errors);
  if (state.errors !== seenErrors) {
    setSeenErrors(state.errors);
    if (state.errors && !state.errors.title) setShowOptions(true);
  }

  useEffect(() => {
    if (!state.errors) return;
    if (state.errors.title) {
      title.current?.focus();
      return;
    }
    requestAnimationFrame(() => {
      const invalid = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      (invalid ?? title.current)?.focus();
    });
  }, [state.errors]);

  return (
    <form
      ref={form}
      action={formAction}
      noValidate
      aria-label="Add a task"
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 rounded-xl border bg-muted/30 p-3",
        wide.grid,
      )}
    >
      <div className="grid gap-1.5">
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
      <Button type="submit" size="lg" disabled={pending} className={wide.last}>
        {pending ? (
          <Loader2Icon aria-hidden className="animate-spin" />
        ) : (
          <PlusIcon aria-hidden data-icon="inline-start" />
        )}
        Add task
      </Button>
      <button
        type="button"
        aria-expanded={showOptions}
        aria-controls={`${id}-options`}
        onClick={() => setShowOptions((value) => !value)}
        className={cn(
          "col-span-2 flex w-fit items-center gap-1 rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          wide.toggle,
        )}
      >
        More options
        <ChevronDownIcon
          aria-hidden
          className={cn("size-4 transition-transform", showOptions && "rotate-180")}
        />
      </button>
      {/* From lg the wrapper's box disappears and the extras join the row. */}
      <div
        id={`${id}-options`}
        className={cn(
          "col-span-2 gap-3",
          wide.contents,
          projectId ? "sm:grid-cols-2" : "sm:grid-cols-3",
          showOptions ? "grid" : "hidden",
        )}
      >
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
      </div>
      <div role="alert" aria-live="assertive" className={cn("col-span-2", wide.last, wide.full)}>
        {error && (
          <p id={`${id}-error`} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
