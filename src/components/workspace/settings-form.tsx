"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { focusFirstError, FormMessage } from "@/components/forms/form-field";
import { useUnsavedChanges } from "@/components/forms/use-unsaved-changes";
import { Button } from "@/components/ui/button";
import { updateWorkspaceAction, type WorkspaceFormState } from "@/server/workspace/actions";
import { WorkspaceFields } from "./workspace-fields";

export function SettingsForm({
  zones,
  name,
  timezone,
  currency,
  canEdit,
}: {
  zones: string[];
  name: string;
  timezone: string;
  currency: string;
  canEdit: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<WorkspaceFormState, FormData>(
    updateWorkspaceAction,
    {},
  );
  useUnsavedChanges(form, state);

  useEffect(() => {
    if (state.saved) {
      toast.success("Workspace settings saved");
    } else if (state.errors && form.current) {
      focusFirstError(form.current);
    }
  }, [state]);

  const values = state.values ?? { name, timezone, currency };

  return (
    <form ref={form} action={formAction} noValidate className="grid gap-5">
      <FormMessage>{state.errors ? undefined : state.message}</FormMessage>
      <WorkspaceFields
        zones={zones}
        key={JSON.stringify(values)}
        defaultName={values.name}
        defaultTimeZone={values.timezone}
        defaultCurrency={values.currency}
        errors={state.errors}
        disabled={pending || !canEdit}
      />
      {canEdit ? (
        <div>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2Icon aria-hidden className="animate-spin" />}
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only the workspace owner can change these settings.
        </p>
      )}
    </form>
  );
}
