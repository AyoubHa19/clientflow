"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2Icon } from "lucide-react";
import { focusFirstError, FormMessage } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { createWorkspaceAction, type WorkspaceFormState } from "@/server/workspace/actions";
import { WorkspaceFields } from "./workspace-fields";

export function OnboardingForm({ zones }: { zones: string[] }) {
  const [state, formAction, pending] = useActionState<WorkspaceFormState, FormData>(
    createWorkspaceAction,
    {},
  );
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.errors && form.current) focusFirstError(form.current);
  }, [state]);

  return (
    <form ref={form} action={formAction} noValidate className="grid gap-5">
      <FormMessage>{state.errors ? undefined : state.message}</FormMessage>
      <WorkspaceFields
        zones={zones}
        // A failed attempt keeps what was typed.
        key={JSON.stringify(state.values ?? {})}
        defaultName={state.values?.name}
        defaultTimeZone={state.values?.timezone}
        defaultCurrency={state.values?.currency}
        guessTimeZone={!state.values}
        errors={state.errors}
        disabled={pending}
      />
      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending && <Loader2Icon aria-hidden className="animate-spin" />}
        {pending ? "Creating your workspace…" : "Create workspace"}
      </Button>
    </form>
  );
}
