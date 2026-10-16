"use client";

import { useId, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = Omit<React.ComponentProps<"input">, "id"> & {
  label: string;
  error?: string;
  hint?: string;
};

/** A labelled input with its error (read out by screen readers) or hint. */
export function FormField({ label, error, hint, type = "text", className, ...props }: FieldProps) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn("h-10", isPassword && "pr-11", className)}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {revealed ? (
              <EyeOffIcon aria-hidden className="size-4" />
            ) : (
              <EyeIcon aria-hidden className="size-4" />
            )}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Moves focus to the first field with an error, once it has rendered. */
export function focusFirstError(form: HTMLFormElement) {
  requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
}

/** A message about the whole form, announced when it appears. */
export function FormMessage({ children }: { children?: React.ReactNode }) {
  return (
    <div role="alert" aria-live="assertive">
      {children ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {children}
        </p>
      ) : null}
    </div>
  );
}
