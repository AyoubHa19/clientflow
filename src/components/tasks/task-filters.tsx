import { FilterBar, FilterSelect } from "@/components/filter-bar";
import {
  TASK_DUE_FILTER_LABELS,
  TASK_DUE_FILTERS,
  TASK_PRIORITY_FILTERS,
  TASK_SORT_LABELS,
  TASK_SORTS,
  TASK_STATUS_FILTER_LABELS,
  TASK_STATUS_FILTERS,
  type TaskListParams,
} from "@/lib/validation/task";

const PRIORITY_LABELS = { any: "Any priority", high: "High", medium: "Medium", low: "Low" };

/** Search, status, due date, priority, project and sort. */
export function TaskFilters({
  params,
  projects,
}: {
  params: TaskListParams;
  projects: { id: string; name: string }[];
}) {
  const activeCount =
    (params.status !== "open" ? 1 : 0) +
    (params.due !== "any" ? 1 : 0) +
    (params.priority !== "any" ? 1 : 0) +
    (params.project ? 1 : 0);
  return (
    <FilterBar
      action="/tasks"
      label="Find tasks"
      searchId="tasks-q"
      searchValue={params.q}
      searchPlaceholder="Task title"
      activeCount={activeCount}
      // Seven fields need more room than a small laptop has.
      wideFrom="xl"
      className="xl:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))_auto]"
    >
      <FilterSelect
        id="tasks-status"
        label="Status"
        name="status"
        value={params.status}
        options={TASK_STATUS_FILTERS.map((value) => ({
          value,
          label: TASK_STATUS_FILTER_LABELS[value],
        }))}
      />
      <FilterSelect
        id="tasks-due"
        label="Due"
        name="due"
        value={params.due}
        options={TASK_DUE_FILTERS.map((value) => ({ value, label: TASK_DUE_FILTER_LABELS[value] }))}
      />
      <FilterSelect
        id="tasks-priority"
        label="Priority"
        name="priority"
        value={params.priority}
        options={TASK_PRIORITY_FILTERS.map((value) => ({ value, label: PRIORITY_LABELS[value] }))}
      />
      <FilterSelect
        id="tasks-project"
        label="Project"
        name="project"
        value={params.project}
        options={[
          { value: "", label: "Any project" },
          { value: "none", label: "No project" },
          ...projects.map((project) => ({ value: project.id, label: project.name })),
        ]}
      />
      <FilterSelect
        id="tasks-sort"
        label="Sort by"
        name="sort"
        value={params.sort}
        options={TASK_SORTS.map((value) => ({ value, label: TASK_SORT_LABELS[value] }))}
      />
    </FilterBar>
  );
}
