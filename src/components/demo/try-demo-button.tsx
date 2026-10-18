"use client";

import { useActionState } from "react";
import { Loader2Icon, PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { startDemoAction, type DemoState } from "@/server/demo/actions";

/**
 * "Try the demo": a private workspace full of sample data, no sign-up.
 * The demo's dates follow the visitor's own time zone.
 */
export function TryDemoButton({
  className,
  variant = "outline",
  size,
  messageClassName,
}: {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  /** For the message when the demo can't start (on the sky, it needs white text). */
  messageClassName?: string;
}) {
  const [state, formAction, pending] = useActionState<DemoState, FormData>((previous, data) => {
    data.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    return startDemoAction(previous, data);
  }, {});
  return (
    <form action={formAction} className="grid justify-items-center gap-2">
      <Button type="submit" variant={variant} size={size} disabled={pending} className={className}>
        {pending ? (
          <Loader2Icon aria-hidden className="animate-spin" />
        ) : (
          <PlayIcon aria-hidden data-icon="inline-start" className="fill-current" />
        )}
        {pending ? "Setting up your demo…" : "Try the demo"}
      </Button>
      <div role="alert" aria-live="assertive">
        {state.message && (
          <p className={cn("max-w-xs text-center text-sm", messageClassName)}>{state.message}</p>
        )}
      </div>
    </form>
  );
}
