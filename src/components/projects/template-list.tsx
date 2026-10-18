"use client";

import { useTransition } from "react";
import { Trash2Icon } from "lucide-react";
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
import { deleteTemplateAction } from "@/server/projects/actions";

/** The workspace's own templates, each with its tasks and a delete button for the owner. */
export function TemplateList({
  templates,
  canDelete,
}: {
  templates: { id: string; name: string; tasks: number }[];
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();
  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        None yet. On a project&apos;s page, &ldquo;Save as template&rdquo; keeps its tasks for the
        next one.
      </p>
    );
  }
  return (
    <ul className="grid divide-y rounded-xl border border-(--surface-edge) bg-(--surface-fill)">
      {templates.map((template) => (
        <li key={template.id} className="flex items-center justify-between gap-3 px-3 py-2">
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{template.name}</span>
            <span className="text-xs text-muted-foreground">
              {template.tasks} {template.tasks === 1 ? "task" : "tasks"}
            </span>
          </span>
          {canDelete && (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" disabled={pending}>
                  <Trash2Icon aria-hidden />
                  <span className="sr-only">Delete the {template.name} template</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete the {template.name} template?</DialogTitle>
                  <DialogDescription>
                    Projects already made from it keep their tasks.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        startTransition(async () => {
                          const result = await deleteTemplateAction(template.id);
                          if (result.ok) toast.success("Template deleted");
                          else toast.error(result.message);
                        })
                      }
                    >
                      Delete template
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </li>
      ))}
    </ul>
  );
}
