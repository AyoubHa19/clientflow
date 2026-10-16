import { SearchIcon } from "lucide-react";
import { selectClassName } from "@/components/forms/styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PROJECT_SORT_LABELS,
  PROJECT_SORTS,
  PROJECT_STATUS_FILTER_LABELS,
  PROJECT_STATUS_FILTERS,
  type ProjectListParams,
} from "@/lib/validation/project";

/** Search, status, client and sort as a plain GET form. */
export function ProjectFilters({
  params,
  clients,
}: {
  params: ProjectListParams;
  clients: { id: string; name: string }[];
}) {
  return (
    <form
      method="get"
      action="/projects"
      role="search"
      aria-label="Find projects"
      className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end"
    >
      <div className="grid gap-2 sm:col-span-2 lg:col-span-1">
        <Label htmlFor="projects-q">Search</Label>
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="projects-q"
            name="q"
            type="search"
            defaultValue={params.q}
            placeholder="Project or client name"
            maxLength={100}
            className="h-10 pl-8"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="projects-status">Status</Label>
        <select
          id="projects-status"
          name="status"
          defaultValue={params.status}
          className={selectClassName}
        >
          {PROJECT_STATUS_FILTERS.map((value) => (
            <option key={value} value={value}>
              {PROJECT_STATUS_FILTER_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="projects-client">Client</Label>
        <select
          id="projects-client"
          name="client"
          defaultValue={params.client}
          className={selectClassName}
        >
          <option value="">Any client</option>
          <option value="none">No client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="projects-sort">Sort by</Label>
        <select
          id="projects-sort"
          name="sort"
          defaultValue={params.sort}
          className={selectClassName}
        >
          {PROJECT_SORTS.map((value) => (
            <option key={value} value={value}>
              {PROJECT_SORT_LABELS[value]}
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
