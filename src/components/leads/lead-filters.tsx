import { SearchIcon } from "lucide-react";
import { selectClassName } from "@/components/forms/styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LEAD_SORT_LABELS,
  LEAD_SORTS,
  LEAD_STATUS_FILTER_LABELS,
  LEAD_STATUS_FILTERS,
  type LeadListParams,
} from "@/lib/validation/lead";

/**
 * Search and filters as a plain GET form (shareable URL, works without
 * JavaScript). The board only uses search and source; the list adds status
 * and sort.
 */
export function LeadFilters({ params, sources }: { params: LeadListParams; sources: string[] }) {
  const isList = params.view === "list";
  return (
    <form
      method="get"
      action="/leads"
      role="search"
      aria-label="Find leads"
      className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none lg:items-end"
    >
      {isList && <input type="hidden" name="view" value="list" />}
      <div className="grid gap-2 sm:col-span-2 lg:col-span-1">
        <Label htmlFor="leads-q">Search</Label>
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="leads-q"
            name="q"
            type="search"
            defaultValue={params.q}
            placeholder="Name, company, email or phone"
            maxLength={100}
            className="h-10 pl-8"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="leads-source">Source</Label>
        <select
          id="leads-source"
          name="source"
          defaultValue={params.source}
          className={selectClassName}
        >
          <option value="">Any source</option>
          {sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </div>
      {isList && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="leads-status">Status</Label>
            <select
              id="leads-status"
              name="status"
              defaultValue={params.status}
              className={selectClassName}
            >
              {LEAD_STATUS_FILTERS.map((value) => (
                <option key={value} value={value}>
                  {LEAD_STATUS_FILTER_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="leads-sort">Sort by</Label>
            <select
              id="leads-sort"
              name="sort"
              defaultValue={params.sort}
              className={selectClassName}
            >
              {LEAD_SORTS.map((value) => (
                <option key={value} value={value}>
                  {LEAD_SORT_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      <Button type="submit" variant="secondary" size="lg" className="sm:col-span-2 lg:col-span-1">
        Apply
      </Button>
    </form>
  );
}
