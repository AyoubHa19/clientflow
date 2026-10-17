import { FilterBar, FilterSelect } from "@/components/filter-bar";
import {
  CLIENT_SORT_LABELS,
  CLIENT_SORTS,
  CLIENT_STATUS_FILTER_LABELS,
  CLIENT_STATUS_FILTERS,
  type ClientListParams,
} from "@/lib/validation/client";

/** Search, status and sort. */
export function ClientFilters({ params }: { params: ClientListParams }) {
  return (
    <FilterBar
      action="/clients"
      label="Find clients"
      searchId="clients-q"
      searchValue={params.q}
      searchPlaceholder="Name, company, email or phone"
      activeCount={params.status !== "open" ? 1 : 0}
      className="lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
    >
      <FilterSelect
        id="clients-status"
        label="Status"
        name="status"
        value={params.status}
        options={CLIENT_STATUS_FILTERS.map((value) => ({
          value,
          label: CLIENT_STATUS_FILTER_LABELS[value],
        }))}
      />
      <FilterSelect
        id="clients-sort"
        label="Sort by"
        name="sort"
        value={params.sort}
        options={CLIENT_SORTS.map((value) => ({ value, label: CLIENT_SORT_LABELS[value] }))}
      />
    </FilterBar>
  );
}
