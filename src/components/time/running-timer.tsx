"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Loader2Icon, SquareIcon, TimerIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { stopTimerAction } from "@/server/time/actions";
import { TimerClock } from "./timer-clock";

/** The running timer, shown at the top of every page while it runs. */
export function RunningTimerBar({
  startedAt,
  projectId,
  projectName,
  taskTitle,
}: {
  startedAt: string;
  projectId: string;
  projectName: string;
  taskTitle: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const what = taskTitle ? `${projectName}: ${taskTitle}` : projectName;
  return (
    <div
      role="group"
      aria-label={`Timer running on ${what}`}
      className="flex max-w-full min-w-0 items-center gap-2 rounded-full border border-(--surface-edge) bg-(--surface-fill) py-1 pr-1 pl-3 text-sm backdrop-blur-xl"
    >
      <TimerIcon
        aria-hidden
        className="size-4 shrink-0 animate-pulse text-brand motion-reduce:animate-none"
      />
      <TimerClock startedAt={startedAt} className="font-semibold tabular-nums" />
      <Link
        href={`/projects/${projectId}`}
        className="hidden min-w-0 truncate text-muted-foreground underline-offset-4 hover:underline sm:block"
      >
        {what}
      </Link>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await stopTimerAction();
            if (result.ok) toast.success(result.message);
            else toast.error(result.message);
          })
        }
      >
        {pending ? (
          <Loader2Icon aria-hidden className="animate-spin" />
        ) : (
          <SquareIcon aria-hidden data-icon="inline-start" className="fill-current" />
        )}
        Stop<span className="sr-only"> the timer</span>
      </Button>
    </div>
  );
}
