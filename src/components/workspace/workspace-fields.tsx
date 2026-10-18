"use client";

import { useEffect, useId, useRef } from "react";
import { FormField } from "@/components/forms/form-field";
import { selectClassName } from "@/components/forms/styles";
import { Label } from "@/components/ui/label";
import { CURRENCIES, currencyForTimeZone } from "@/lib/money";
import { WORKSPACE_NAME_MAX } from "@/lib/validation/workspace";

/** "Africa/Casablanca" → "Africa / Casablanca", easier to scan in a list. */
const label = (zone: string) => zone.replaceAll("_", " ").replaceAll("/", " / ");

/**
 * The name, time zone and currency fields, shared by onboarding and
 * settings. With `guessTimeZone`, the browser's own time zone is picked once
 * it loads (the server can't know it, so it renders UTC first), and the
 * currency follows the time zone until someone picks one. `zones` comes
 * from the server, so the list is the same on both sides and matches what
 * the server accepts.
 */
export function WorkspaceFields({
  zones,
  defaultName = "",
  defaultTimeZone = "UTC",
  defaultCurrency,
  guessTimeZone = false,
  errors = {},
  disabled = false,
}: {
  zones: string[];
  defaultName?: string;
  defaultTimeZone?: string;
  /** Empty: guessed from the time zone. */
  defaultCurrency?: string;
  guessTimeZone?: boolean;
  errors?: Record<string, string>;
  disabled?: boolean;
}) {
  const id = useId();
  const select = useRef<HTMLSelectElement>(null);
  const currency = useRef<HTMLSelectElement>(null);
  // Set once someone picks a currency themselves; then it no longer follows the zone.
  const currencyPicked = useRef(false);
  const followZone = (zone: string) => {
    if (guessTimeZone && !currencyPicked.current && currency.current) {
      currency.current.value = currencyForTimeZone(zone);
    }
  };

  useEffect(() => {
    if (!guessTimeZone || !select.current) return;
    // Someone quick (or on a slow phone) may have picked a zone before
    // this ran: never overwrite their choice.
    if (select.current.value !== defaultTimeZone) return;
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zones.includes(browserZone)) {
      select.current.value = browserZone;
      if (!currencyPicked.current && currency.current) {
        currency.current.value = currencyForTimeZone(browserZone);
      }
    }
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
          onChange={(event) => followZone(event.target.value)}
          disabled={disabled}
          aria-invalid={errors.timezone ? true : undefined}
          aria-describedby={errors.timezone ? errorId : hintId}
          className={selectClassName}
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
      <div className="grid content-start gap-2">
        <Label htmlFor={`${id}-currency`}>Currency</Label>
        <select
          ref={currency}
          id={`${id}-currency`}
          name="currency"
          defaultValue={defaultCurrency || currencyForTimeZone(defaultTimeZone)}
          onChange={() => (currencyPicked.current = true)}
          disabled={disabled}
          aria-invalid={errors.currency ? true : undefined}
          aria-describedby={errors.currency ? `${id}-currency-error` : `${id}-currency-hint`}
          className={selectClassName}
        >
          {CURRENCIES.map(({ code, name }) => (
            <option key={code} value={code}>
              {code} · {name}
            </option>
          ))}
        </select>
        {errors.currency ? (
          <p id={`${id}-currency-error`} className="text-sm text-destructive">
            {errors.currency}
          </p>
        ) : (
          <p id={`${id}-currency-hint`} className="text-sm text-muted-foreground">
            For lead values and project fees. Changing it later relabels amounts; it doesn&apos;t
            convert them.
          </p>
        )}
      </div>
    </>
  );
}
