import { FilterBar, FilterSelect } from "@/components/filter-bar";
import {
  PROJECT_SORT_LABELS,
  PROJECT_SORTS,
  PROJECT_STATUS_FILTER_LABELS,
  PROJECT_STATUS_FILTERS,
  type ProjectListParams,
} from "@/lib/validation/project";

/** Search, status, client and sort. */
export function ProjectFilters({
  params,
  clients,
}: {
  params: ProjectListParams;
  clients: { id: string; name: string }[];
}) {
  return (
    <FilterBar
      action="/projects"
      label="Find projects"
      searchId="projects-q"
      searchValue={params.q}
      searchPlaceholder="Project or client name"
      activeCount={(params.status !== "open" ? 1 : 0) + (params.client ? 1 : 0)}
      className="lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_auto]"
    >
      <FilterSelect
        id="projects-status"
        label="Status"
        name="status"
        value={params.status}
        options={PROJECT_STATUS_FILTERS.map((value) => ({
          value,
          label: PROJECT_STATUS_FILTER_LABELS[value],
        }))}
      />
      <FilterSelect
        id="projects-client"
        label="Client"
        name="client"
        value={params.client}
        options={[
          { value: "", label: "Any client" },
          { value: "none", label: "No client" },
          ...clients.map((client) => ({ value: client.id, label: client.name })),
        ]}
      />
      <FilterSelect
        id="projects-sort"
        label="Sort by"
        name="sort"
        value={params.sort}
        options={PROJECT_SORTS.map((value) => ({ value, label: PROJECT_SORT_LABELS[value] }))}
      />
    </FilterBar>
  );
}
