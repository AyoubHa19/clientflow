import { SearchIcon } from "lucide-react";
import { selectClassName } from "@/components/forms/styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function Choice({
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

/** Search and filters as a plain GET form (shareable URL, no JavaScript needed). */
export function TaskFilters({
  params,
  projects,
}: {
  params: TaskListParams;
  projects: { id: string; name: string }[];
}) {
  return (
    <form
      method="get"
      action="/tasks"
      role="search"
      aria-label="Find tasks"
      className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))_auto] xl:items-end"
    >
      <div className="grid gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-1">
        <Label htmlFor="tasks-q">Search</Label>
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="tasks-q"
            name="q"
            type="search"
            defaultValue={params.q}
            placeholder="Task title"
            maxLength={100}
            className="h-10 pl-8"
          />
        </div>
      </div>
      <Choice
        id="tasks-status"
        label="Status"
        name="status"
        value={params.status}
        options={TASK_STATUS_FILTERS.map((value) => ({
          value,
          label: TASK_STATUS_FILTER_LABELS[value],
        }))}
      />
      <Choice
        id="tasks-due"
        label="Due"
        name="due"
        value={params.due}
        options={TASK_DUE_FILTERS.map((value) => ({ value, label: TASK_DUE_FILTER_LABELS[value] }))}
      />
      <Choice
        id="tasks-priority"
        label="Priority"
        name="priority"
        value={params.priority}
        options={TASK_PRIORITY_FILTERS.map((value) => ({ value, label: PRIORITY_LABELS[value] }))}
      />
      <Choice
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
      <Choice
        id="tasks-sort"
        label="Sort by"
        name="sort"
        value={params.sort}
        options={TASK_SORTS.map((value) => ({ value, label: TASK_SORT_LABELS[value] }))}
      />
      <Button
        type="submit"
        variant="secondary"
        size="lg"
        className="sm:col-span-2 lg:col-span-3 xl:col-span-1"
      >
        Apply
      </Button>
    </form>
  );
}
