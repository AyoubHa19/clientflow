import { SearchIcon } from "lucide-react";
import { selectClassName } from "@/components/forms/styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CLIENT_SORT_LABELS,
  CLIENT_SORTS,
  CLIENT_STATUS_FILTER_LABELS,
  CLIENT_STATUS_FILTERS,
  type ClientListParams,
} from "@/lib/validation/client";

/**
 * Search, status and sort. A plain GET form: the settings go into the
 * address (shareable, back button works) and it works without JavaScript.
 */
export function ClientFilters({ params }: { params: ClientListParams }) {
  return (
    <form
      method="get"
      action="/clients"
      role="search"
      aria-label="Find clients"
      className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end"
    >
      <div className="grid gap-2 sm:col-span-2 lg:col-span-1">
        <Label htmlFor="clients-q">Search</Label>
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="clients-q"
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
        <Label htmlFor="clients-status">Status</Label>
        <select
          id="clients-status"
          name="status"
          defaultValue={params.status}
          className={selectClassName}
        >
          {CLIENT_STATUS_FILTERS.map((value) => (
            <option key={value} value={value}>
              {CLIENT_STATUS_FILTER_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="clients-sort">Sort by</Label>
        <select
          id="clients-sort"
          name="sort"
          defaultValue={params.sort}
          className={selectClassName}
        >
          {CLIENT_SORTS.map((value) => (
            <option key={value} value={value}>
              {CLIENT_SORT_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="secondary" size="lg" className="sm:col-span-2 lg:col-span-1">
        Apply
      </Button>
    </form>
  );
}
