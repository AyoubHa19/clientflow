"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArchiveIcon, ArchiveRestoreIcon, Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";
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
import { deleteClientAction, setClientArchivedAction } from "@/server/clients/actions";

/** Edit, archive or restore, and (for owners) delete, on a client's page. */
export function ClientActions({
  id,
  name,
  archived,
  canDelete,
}: {
  id: string;
  name: string;
  archived: boolean;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  function toggleArchived() {
    startTransition(async () => {
      // On success the action redirects; a returned value means it failed.
      const result = await setClientArchivedAction(id, !archived);
      if (result?.message) toast.error(result.message);
    });
  }

  function remove() {
    setDeleting(true);
    startTransition(async () => {
      const result = await deleteClientAction(id);
      if (result?.message) {
        setDeleting(false);
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline">
        <Link href={`/clients/${id}/edit`}>
          <PencilIcon aria-hidden data-icon="inline-start" />
          Edit
        </Link>
      </Button>
      <Button variant="outline" onClick={toggleArchived} disabled={pending}>
        {archived ? (
          <ArchiveRestoreIcon aria-hidden data-icon="inline-start" />
        ) : (
          <ArchiveIcon aria-hidden data-icon="inline-start" />
        )}
        {archived ? "Restore" : "Archive"}
      </Button>
      {canDelete && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive" disabled={pending}>
              <Trash2Icon aria-hidden data-icon="inline-start" />
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {name}?</DialogTitle>
              <DialogDescription>
                This can&apos;t be undone. Their projects stay, without a client. To keep the client
                out of the way but recoverable, archive it instead.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button variant="destructive" onClick={remove} disabled={deleting}>
                {deleting && <Loader2Icon aria-hidden className="animate-spin" />}
                {deleting ? "Deleting…" : "Delete client"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
