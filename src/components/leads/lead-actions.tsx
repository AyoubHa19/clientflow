"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon, PencilIcon, Trash2Icon, UserCheckIcon } from "lucide-react";
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
import { LEAD_STATUS_LABELS, LEAD_STATUSES, type LeadStatus } from "@/lib/validation/lead";
import { convertLeadAction, deleteLeadAction, setLeadStatusAction } from "@/server/leads/actions";

type Match = { id: string; name: string; email: string | null } | null;

/** Edit, change stage, convert to a client and (owners) delete. */
export function LeadActions({
  id,
  contactName,
  status,
  converted,
  match,
  canDelete,
}: {
  id: string;
  contactName: string;
  status: LeadStatus;
  converted: boolean;
  match: Match;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeStatus(next: LeadStatus) {
    startTransition(async () => {
      const result = await setLeadStatusAction(id, next);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Moved to ${LEAD_STATUS_LABELS[next]}`, { id: `lead-status-${id}` });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      {!converted && (
        <div className="grid gap-1.5">
          <Label htmlFor={`stage-${id}`} className="text-xs text-muted-foreground">
            Stage
          </Label>
          <select
            id={`stage-${id}`}
            value={status}
            disabled={pending}
            onChange={(event) => changeStatus(event.target.value as LeadStatus)}
            className={`${selectClassName} h-9 w-auto min-w-36`}
          >
            {LEAD_STATUSES.map((value) => (
              <option key={value} value={value}>
                {LEAD_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      )}
      <Button asChild variant="outline">
        <Link href={`/leads/${id}/edit`}>
          <PencilIcon aria-hidden data-icon="inline-start" />
          Edit
        </Link>
      </Button>
      {!converted && <ConvertDialog id={id} contactName={contactName} match={match} />}
      {canDelete && <DeleteDialog id={id} contactName={contactName} />}
    </div>
  );
}

function ConvertDialog({
  id,
  contactName,
  match,
}: {
  id: string;
  contactName: string;
  match: Match;
}) {
  const [choice, setChoice] = useState<"link" | "create">(match ? "link" : "create");
  const [pending, startTransition] = useTransition();

  function convert() {
    startTransition(async () => {
      const result = await convertLeadAction(id, choice === "link" && match ? match.id : null);
      if (result?.message) toast.error(result.message);
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <UserCheckIcon aria-hidden data-icon="inline-start" />
          Convert to client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert {contactName} into a client?</DialogTitle>
          <DialogDescription>
            The lead is marked Won and linked to the client. This happens once.
          </DialogDescription>
        </DialogHeader>
        {match ? (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">
              A client already has the email {match.email}
            </legend>
            {(
              [
                ["link", `Link to ${match.name}`, "No duplicate: the lead points to this client."],
                ["create", "Create a new client", "A separate client with this lead's details."],
              ] as const
            ).map(([value, title, description]) => (
              <label
                key={value}
                className="flex cursor-pointer gap-3 rounded-lg border p-3 has-checked:border-ring has-checked:bg-muted/50"
              >
                <input
                  type="radio"
                  name="convert-choice"
                  value={value}
                  checked={choice === value}
                  onChange={() => setChoice(value)}
                  className="mt-0.5 size-4 accent-[var(--brand)]"
                />
                <span className="grid gap-0.5 text-sm">
                  <span className="font-medium">{title}</span>
                  <span className="text-muted-foreground">{description}</span>
                </span>
              </label>
            ))}
          </fieldset>
        ) : (
          <p className="text-sm text-muted-foreground">
            A new client is created with this lead&apos;s name, company, email, phone and notes.
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={convert} disabled={pending}>
            {pending && <Loader2Icon aria-hidden className="animate-spin" />}
            {pending ? "Converting…" : choice === "link" ? "Link client" : "Create client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ id, contactName }: { id: string; contactName: string }) {
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteLeadAction(id);
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
          <DialogTitle>Delete {contactName}?</DialogTitle>
          <DialogDescription>
            This can&apos;t be undone. A client made from this lead stays. To keep it out of the way
            instead, move it to Lost.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={remove} disabled={pending}>
            {pending && <Loader2Icon aria-hidden className="animate-spin" />}
            {pending ? "Deleting…" : "Delete lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
