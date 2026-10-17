"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { focusFirstError, FormField, FormMessage } from "@/components/forms/form-field";
import { useUnsavedChanges } from "@/components/forms/use-unsaved-changes";
import { Button } from "@/components/ui/button";
import { addDays, FOLLOW_UP_CHOICES } from "@/lib/followups";
import { CONTACT_NOTE_LIMIT } from "@/lib/validation/lead";
import { cn } from "@/lib/utils";
import type { LeadFormState } from "@/server/leads/actions";

/**
 * "Log a contact": the day you got in touch (today by default), what
 * happened, and when to follow up next, with quick picks counted from the
 * contact day. Saving moves a New lead to Contacted.
 */
export function LogContactForm({
  action,
  today,
  initialFollowUp,
}: {
  action: (state: LeadFormState, formData: FormData) => Promise<LeadFormState>;
  /** Today in the workspace, "YYYY-MM-DD". */
  today: string;
  /** The follow-up already planned, kept unless changed. */
  initialFollowUp: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(action, {});
  useUnsavedChanges(form, state);
  const [contactedOn, setContactedOn] = useState(state.values?.contactedOn ?? today);
  const [nextFollowUpOn, setNextFollowUpOn] = useState(
    state.values?.nextFollowUpOn ?? initialFollowUp,
  );

  useEffect(() => {
    if (state.errors && form.current) focusFirstError(form.current);
  }, [state]);

  const errors = state.errors ?? {};
  // Quick picks count from the contact day (today unless changed).
  const base = /^\d{4}-\d{2}-\d{2}$/.test(contactedOn) ? contactedOn : today;

  return (
    <form
      ref={form}
      action={formAction}
      noValidate
      aria-label="Log a contact"
      className="grid grid-cols-[minmax(0,1fr)] gap-4"
    >
      <FormMessage>{state.errors ? undefined : state.message}</FormMessage>
      <FormField
        label="When did you get in touch?"
        name="contactedOn"
        type="date"
        max={today}
        value={contactedOn}
        onChange={(event) => setContactedOn(event.target.value)}
        error={errors.contactedOn}
        disabled={pending}
      />
      <FormField
        label="What happened? (optional)"
        name="note"
        defaultValue={state.values?.note}
        maxLength={CONTACT_NOTE_LIMIT}
        placeholder="Sent the quote, they'll decide Friday"
        hint="Saved in the activity log."
        error={errors.note}
        disabled={pending}
      />
      <div className="grid gap-2">
        <FormField
          label="Next follow-up (optional)"
          name="nextFollowUpOn"
          type="date"
          min={base}
          value={nextFollowUpOn}
          onChange={(event) => setNextFollowUpOn(event.target.value)}
          error={errors.nextFollowUpOn}
          disabled={pending}
        />
        <div
          role="group"
          aria-label="Quick picks for the next follow-up"
          className="flex flex-wrap gap-1.5"
        >
          {FOLLOW_UP_CHOICES.map((choice) => {
            const value = addDays(base, choice.days);
            return (
              <QuickPick
                key={choice.days}
                pressed={nextFollowUpOn === value}
                onClick={() => setNextFollowUpOn(value)}
                disabled={pending}
              >
                {choice.label}
              </QuickPick>
            );
          })}
          <QuickPick
            pressed={nextFollowUpOn === ""}
            onClick={() => setNextFollowUpOn("")}
            disabled={pending}
          >
            None
          </QuickPick>
        </div>
      </div>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending && <Loader2Icon aria-hidden className="animate-spin" />}
        {pending ? "Saving…" : "Save contact"}
      </Button>
    </form>
  );
}

function QuickPick({
  pressed,
  children,
  ...props
}: { pressed: boolean } & Omit<React.ComponentProps<"button">, "type">) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-border transition-colors outline-none ring-inset hover:bg-brand-soft hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
        pressed ? "bg-brand text-brand-foreground ring-brand" : "text-muted-foreground",
      )}
      {...props}
    >
      {children}
    </button>
  );
}
