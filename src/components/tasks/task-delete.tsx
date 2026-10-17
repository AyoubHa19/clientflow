"use client";

import { useTransition } from "react";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
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
import { deleteTaskAction } from "@/server/tasks/actions";

export function TaskDelete({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteTaskAction(id);
      if (result?.message) toast.error(result.message);
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2Icon aria-hidden data-icon="inline-start" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this task?</DialogTitle>
          <DialogDescription>
            &ldquo;{title}&rdquo; will be gone for good. To keep it, tick it as done instead.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={remove} disabled={pending}>
            {pending && <Loader2Icon aria-hidden className="animate-spin" />}
            {pending ? "Deleting…" : "Delete task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
