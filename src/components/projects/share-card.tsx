"use client";

import { useId, useRef, useState, useTransition } from "react";
import { CopyIcon, ExternalLinkIcon, Link2Icon, Loader2Icon, RefreshCwIcon } from "lucide-react";
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
import {
  setShareTasksAction,
  shareProjectAction,
  stopSharingAction,
} from "@/server/projects/actions";

/** A button that asks first: both of these break the link the client has. */
function Confirm({
  trigger,
  title,
  description,
  action,
  pending,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  action: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive" onClick={onConfirm} disabled={pending}>
              {action}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * "Share with client": a private link to a status page for this project.
 * The owner creates it, copies it, chooses whether the tasks show, and can
 * replace it or turn it off. Members see whether it's shared.
 */
export function ShareCard({
  projectId,
  url,
  sharedOn,
  showTasks,
  canEdit,
}: {
  projectId: string;
  /** The full link, or null when sharing is off. */
  url: string | null;
  /** When the current link was made, already formatted. */
  sharedOn: string | null;
  showTasks: boolean;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  // Ticks at once; goes back if saving fails.
  const [tasksShown, setTasksShown] = useState(showTasks);
  const input = useRef<HTMLInputElement>(null);
  const linkId = useId();

  const run = (action: () => Promise<{ ok: boolean; message?: string }>, done?: string) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.message ?? "Something went wrong. Try again.");
      else if (done) toast.success(done);
    });

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      // No clipboard access (an old browser, or not allowed): select it instead.
      input.current?.select();
      toast("Press Ctrl+C (or ⌘C) to copy the selected link");
    }
  }

  if (!url) {
    return (
      <div className="grid gap-3 text-sm">
        <p className="text-muted-foreground">
          Send your client a link to a page with this project&apos;s progress: its status, due date
          and tasks. They don&apos;t need an account. The fee, the description and your notes stay
          private.
        </p>
        {canEdit ? (
          <Button
            className="justify-self-start"
            disabled={pending}
            onClick={() => run(() => shareProjectAction(projectId), "Link created")}
          >
            {pending ? (
              <Loader2Icon aria-hidden className="animate-spin" />
            ) : (
              <Link2Icon aria-hidden data-icon="inline-start" />
            )}
            {pending ? "Creating…" : "Create a link"}
          </Button>
        ) : (
          <p className="text-muted-foreground">Only the workspace owner can share projects.</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 text-sm">
      <p className="text-muted-foreground">
        Anyone with this link sees the project&apos;s progress, without an account
        {sharedOn ? ` (made ${sharedOn})` : ""}.
      </p>
      <div className="grid gap-2">
        <label htmlFor={linkId} className="font-medium">
          Link for your client
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            id={linkId}
            readOnly
            value={url}
            onFocus={(event) => event.target.select()}
            className="h-10 min-w-0 flex-1 basis-56 rounded-xl border border-input bg-(--surface-fill) px-3 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button onClick={copy}>
            <CopyIcon aria-hidden data-icon="inline-start" />
            Copy link
          </Button>
          <Button asChild variant="outline">
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLinkIcon aria-hidden data-icon="inline-start" />
              Preview
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
        </div>
      </div>
      {canEdit && (
        <>
          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={tasksShown}
              disabled={pending}
              onChange={(event) => {
                const show = event.target.checked;
                setTasksShown(show);
                startTransition(async () => {
                  const result = await setShareTasksAction(projectId, show);
                  if (result.ok) {
                    toast.success(show ? "Tasks are shown" : "Only the progress is shown");
                  } else {
                    setTasksShown(!show);
                    toast.error(result.message);
                  }
                });
              }}
              className="size-4 accent-(--brand)"
            />
            Show the task list (titles and due dates)
          </label>
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Confirm
              trigger={
                <Button variant="outline" disabled={pending}>
                  <RefreshCwIcon aria-hidden data-icon="inline-start" />
                  New link
                </Button>
              }
              title="Make a new link?"
              description="The link you sent before stops working. Send your client the new one."
              action="Make a new link"
              pending={pending}
              onConfirm={() => run(() => shareProjectAction(projectId), "New link created")}
            />
            <Confirm
              trigger={
                <Button variant="outline" disabled={pending}>
                  Stop sharing
                </Button>
              }
              title="Stop sharing this project?"
              description="The link stops working straight away. You can make a new one later."
              action="Stop sharing"
              pending={pending}
              onConfirm={() => run(() => stopSharingAction(projectId), "Sharing stopped")}
            />
          </div>
        </>
      )}
    </div>
  );
}
