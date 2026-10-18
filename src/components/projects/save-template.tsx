"use client";

import { useActionState, useState } from "react";
import { CopyPlusIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { FormField, FormMessage } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TEMPLATE_LIMITS } from "@/lib/templates";
import type { ProjectFormState } from "@/server/projects/actions";

type State = ProjectFormState & { savedAt?: number };

/** "Save as template": this project's tasks, ready for the next one. */
export function SaveTemplate({
  action,
  projectName,
  taskCount,
}: {
  action: (state: State, formData: FormData) => Promise<State>;
  projectName: string;
  taskCount: number;
}) {
  const [open, setOpen] = useState(false);
  // Saved: say so and close the dialog, right as the action finishes.
  const [state, formAction, pending] = useActionState(async (previous: State, data: FormData) => {
    const next = await action(previous, data);
    if (next.savedAt) {
      toast.success(next.message);
      setOpen(false);
    }
    return next;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={taskCount === 0}>
          <CopyPlusIcon aria-hidden data-icon="inline-start" />
          Save as template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Save as a template</DialogTitle>
            <DialogDescription>
              Its {taskCount} {taskCount === 1 ? "task" : "tasks"} become a template for new
              projects. Due dates are kept as days after the start date.
            </DialogDescription>
          </DialogHeader>
          <FormMessage>{state.errors || state.savedAt ? undefined : state.message}</FormMessage>
          <FormField
            key={state.savedAt ?? "name"}
            label="Template name"
            name="name"
            defaultValue={state.values?.name ?? projectName}
            maxLength={TEMPLATE_LIMITS.name}
            error={state.errors?.name}
            disabled={pending}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2Icon aria-hidden className="animate-spin" />}
              {pending ? "Saving…" : "Save template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
