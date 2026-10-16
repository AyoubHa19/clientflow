"use client";

import { useEffect, useId, useRef } from "react";
import { FormField } from "@/components/auth/form-field";
import { Label } from "@/components/ui/label";
import { WORKSPACE_NAME_MAX } from "@/lib/validation/workspace";

/** "Africa/Casablanca" → "Africa / Casablanca", easier to scan in a list. */
const label = (zone: string) => zone.replaceAll("_", " ").replaceAll("/", " / ");

/**
 * The name and time zone fields, shared by onboarding and settings. With
 * `guessTimeZone`, the browser's own time zone is picked once it loads (the
 * server can't know it, so it renders UTC first). `zones` comes from the
 * server, so the list is the same on both sides and matches what the
 * server accepts.
 */
export function WorkspaceFields({
  zones,
  defaultName = "",
  defaultTimeZone = "UTC",
  guessTimeZone = false,
  errors = {},
  disabled = false,
}: {
  zones: string[];
  defaultName?: string;
  defaultTimeZone?: string;
  guessTimeZone?: boolean;
  errors?: Record<string, string>;
  disabled?: boolean;
}) {
  const id = useId();
  const select = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!guessTimeZone || !select.current) return;
    // Someone quick (or on a slow phone) may have picked a zone before
    // this ran: never overwrite their choice.
    if (select.current.value !== defaultTimeZone) return;
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zones.includes(browserZone)) select.current.value = browserZone;
  }, [guessTimeZone, zones, defaultTimeZone]);

  const errorId = `${id}-timezone-error`;
  const hintId = `${id}-timezone-hint`;

  return (
    <>
      <FormField
        label="Workspace name"
        name="name"
        defaultValue={defaultName}
        maxLength={WORKSPACE_NAME_MAX}
        autoComplete="organization"
        hint="Your business or studio name. You can change it later."
        error={errors.name}
        disabled={disabled}
      />
      <div className="grid content-start gap-2">
        <Label htmlFor={`${id}-timezone`}>Time zone</Label>
        <select
          ref={select}
          id={`${id}-timezone`}
          name="timezone"
          defaultValue={defaultTimeZone}
          disabled={disabled}
          aria-invalid={errors.timezone ? true : undefined}
          aria-describedby={errors.timezone ? errorId : hintId}
          className="h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30"
        >
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {label(zone)}
            </option>
          ))}
        </select>
        {errors.timezone ? (
          <p id={errorId} className="text-sm text-destructive">
            {errors.timezone}
          </p>
        ) : (
          <p id={hintId} className="text-sm text-muted-foreground">
            Decides what &ldquo;today&rdquo; and &ldquo;overdue&rdquo; mean for your tasks.
          </p>
        )}
      </div>
    </>
  );
}
