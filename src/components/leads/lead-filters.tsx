import { FilterBar, FilterSelect } from "@/components/filter-bar";
import {
  LEAD_SORT_LABELS,
  LEAD_SORTS,
  LEAD_STATUS_FILTER_LABELS,
  LEAD_STATUS_FILTERS,
  type LeadListParams,
} from "@/lib/validation/lead";

/** Search and filters. The board only uses search and source; the list adds status and sort. */
export function LeadFilters({ params, sources }: { params: LeadListParams; sources: string[] }) {
  const isList = params.view === "list";
  const activeCount = (params.source ? 1 : 0) + (isList && params.status !== "all" ? 1 : 0);
  return (
    <FilterBar
      action="/leads"
      label="Find leads"
      searchId="leads-q"
      searchValue={params.q}
      searchPlaceholder="Name, company, email or phone"
      activeCount={activeCount}
      className={
        isList
          ? "lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]"
          : "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]"
      }
      hidden={isList && <input type="hidden" name="view" value="list" />}
    >
      <FilterSelect
        id="leads-source"
        label="Source"
        name="source"
        value={params.source}
        options={[
          { value: "", label: "Any source" },
          ...sources.map((source) => ({ value: source, label: source })),
        ]}
      />
      {isList && (
        <>
          <FilterSelect
            id="leads-status"
            label="Status"
            name="status"
            value={params.status}
            options={LEAD_STATUS_FILTERS.map((value) => ({
              value,
              label: LEAD_STATUS_FILTER_LABELS[value],
            }))}
          />
          <FilterSelect
            id="leads-sort"
            label="Sort by"
            name="sort"
            value={params.sort}
            options={LEAD_SORTS.map((value) => ({ value, label: LEAD_SORT_LABELS[value] }))}
          />
        </>
      )}
    </FilterBar>
  );
}
