"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { selectClassName } from "@/components/forms/styles";
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
import { Label } from "@/components/ui/label";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  type ProjectStatus,
} from "@/lib/validation/project";
import { deleteProjectAction, setProjectStatusAction } from "@/server/projects/actions";

/** Status, edit and (owners) delete, on a project's page. */
export function ProjectActions({
  id,
  name,
  status,
  canDelete,
}: {
  id: string;
  name: string;
  status: ProjectStatus;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function changeStatus(next: ProjectStatus) {
    startTransition(async () => {
      const result = await setProjectStatusAction(id, next);
      if (!result.ok) toast.error(result.message);
      else
        toast.success(`Marked ${PROJECT_STATUS_LABELS[next].toLowerCase()}`, {
          id: `project-${id}`,
        });
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteProjectAction(id);
      if (result?.message) toast.error(result.message);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="grid gap-1.5">
        <Label htmlFor={`project-status-${id}`} className="text-xs text-muted-foreground">
          Status
        </Label>
        <select
          id={`project-status-${id}`}
          value={status}
          disabled={pending}
          onChange={(event) => changeStatus(event.target.value as ProjectStatus)}
          className={`${selectClassName} h-9 w-auto min-w-36`}
        >
          {PROJECT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {PROJECT_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <Button asChild variant="outline">
        <Link href={`/projects/${id}/edit`}>
          <PencilIcon aria-hidden data-icon="inline-start" />
          Edit
        </Link>
      </Button>
      {canDelete && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2Icon aria-hidden data-icon="inline-start" />
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {name}?</DialogTitle>
              <DialogDescription>
                This can&apos;t be undone. Its tasks stay, without a project. To keep it but out of
                the way, mark it Completed or Cancelled instead.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button variant="destructive" onClick={remove} disabled={pending}>
                {pending && <Loader2Icon aria-hidden className="animate-spin" />}
                {pending ? "Deleting…" : "Delete project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
