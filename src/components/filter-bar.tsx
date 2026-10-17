"use client";

import { useId, useState } from "react";
import { SearchIcon, SlidersHorizontalIcon } from "lucide-react";
import { selectClassName } from "@/components/forms/styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * A list's search and filters, as a plain GET form (the settings go into the
 * address, so it can be shared and the back button works). On wide screens
 * everything sits in one row. Below `lg` only the search shows, with a
 * "Filters" button (and how many are set) that opens the rest, so the list
 * itself isn't pushed off the screen. `wideFrom="xl"` keeps that until xl,
 * for a list with many filters.
 *
 * `className` sets the wide layout: the grid columns from `lg` (or `xl`). The
 * children are the filter fields; `applyClassName` places the Apply button.
 */
export function FilterBar({
  action,
  label,
  searchId,
  searchValue,
  searchPlaceholder,
  activeCount,
  className,
  searchClassName,
  applyClassName,
  hidden,
  wideFrom = "lg",
  children,
}: {
  action: string;
  label: string;
  searchId: string;
  searchValue: string;
  searchPlaceholder: string;
  activeCount: number;
  className?: string;
  searchClassName?: string;
  applyClassName?: string;
  hidden?: React.ReactNode;
  wideFrom?: "lg" | "xl";
  children: React.ReactNode;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const wide = WIDE[wideFrom];

  return (
    <form
      method="get"
      action={action}
      role="search"
      aria-label={label}
      className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3", className)}
    >
      {hidden}
      <div className={cn("grid gap-2", searchClassName)}>
        <Label htmlFor={searchId}>Search</Label>
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={searchId}
            name="q"
            type="search"
            enterKeyHint="search"
            defaultValue={searchValue}
            placeholder={searchPlaceholder}
            maxLength={100}
            className="h-10 pl-8"
          />
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={wide.toggle}
      >
        <SlidersHorizontalIcon aria-hidden data-icon="inline-start" />
        Filters
        {activeCount > 0 && (
          <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-brand-foreground">
            <span aria-hidden>{activeCount}</span>
            <span className="sr-only">({activeCount} set)</span>
          </span>
        )}
      </Button>
      {/* From lg the panel's box disappears and its fields join the row. */}
      <div
        id={panelId}
        className={cn(
          "col-span-2 grid-cols-[minmax(0,1fr)] gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 sm:grid-cols-2",
          wide.panel,
          open ? "grid" : "hidden",
        )}
      >
        {children}
        <Button
          type="submit"
          variant="secondary"
          size="lg"
          className={cn("sm:col-span-2", wide.apply, applyClassName)}
        >
          Apply
        </Button>
      </div>
    </form>
  );
}

// Whole class names, so Tailwind finds them.
const WIDE = {
  lg: { toggle: "lg:hidden", panel: "lg:contents", apply: "lg:col-span-1" },
  xl: { toggle: "xl:hidden", panel: "xl:contents", apply: "xl:col-span-1" },
};

/** One labelled filter (a native select: easy on phones and screen readers). */
export function FilterSelect({
  id,
  label,
  name,
  value,
  options,
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} name={name} defaultValue={value} className={selectClassName}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
