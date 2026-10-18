"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { Loader2Icon, PlayIcon, SquareIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { focusFirstError, FormField, FormMessage } from "@/components/forms/form-field";
import { selectClassName } from "@/components/forms/styles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DURATION_HINT } from "@/lib/time";
import { TIME_NOTE_LIMIT } from "@/lib/validation/time";
import {
  deleteTimeEntryAction,
  logTimeAction,
  startTimerAction,
  stopTimerAction,
  type TimeFormState,
} from "@/server/time/actions";
import { TimerClock } from "./timer-clock";

export type TimeEntryRow = {
  id: string;
  day: string;
  duration: string | null;
  task: string | null;
  note: string | null;
  who: string;
  canDelete: boolean;
};

function TaskSelect({
  id,
  tasks,
  value,
  onChange,
  name,
  disabled,
}: {
  id: string;
  tasks: { id: string; title: string }[];
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={onChange && ((event) => onChange(event.target.value))}
      disabled={disabled}
      className={selectClassName}
    >
      <option value="">No task, the project in general</option>
      {tasks.map((task) => (
        <option key={task.id} value={task.id}>
          {task.title}
        </option>
      ))}
    </select>
  );
}

/**
 * A project's time: a timer (start here, stop here or from the bar at the
 * top), time added by hand, the entries, and the total with what the fee
 * really pays per hour.
 */
export function TimeCard({
  projectId,
  today,
  tasks,
  running,
  otherTimer,
  entries,
  total,
  rate,
}: {
  projectId: string;
  /** Today in the workspace, "YYYY-MM-DD". */
  today: string;
  /** The project's unfinished tasks, for the pickers. */
  tasks: { id: string; title: string }[];
  /** This person's timer, when it runs on this project. */
  running: { startedAt: string; task: string | null } | null;
  /** The project a timer of theirs runs on elsewhere, if any. */
  otherTimer: string | null;
  entries: TimeEntryRow[];
  /** "12h 30m" logged so far. */
  total: string;
  /** "MAD 312/h", or a hint when there's no fee or no time. */
  rate: { value: string | null; hint: string };
}) {
  const ids = { timerTask: useId(), task: useId() };
  const form = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [timerTask, setTimerTask] = useState("");
  const [state, formAction, saving] = useActionState<TimeFormState, FormData>(logTimeAction, {});

  useEffect(() => {
    if (state.savedAt) toast.success(state.message);
    else if (state.errors && form.current) focusFirstError(form.current);
  }, [state]);

  const run = (action: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.message ?? "Something went wrong.");
      else if (result.message) toast.success(result.message);
    });

  const values = state.savedAt ? {} : (state.values ?? {});
  const errors = state.errors ?? {};

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Logged</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{total}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Real hourly rate</p>
          {rate.value ? (
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{rate.value}</p>
          ) : (
            <p className="max-w-64 text-sm text-muted-foreground">{rate.hint}</p>
          )}
        </div>
      </div>

      {/* The timer. */}
      <div className="grid gap-3 rounded-xl border border-(--surface-edge) bg-(--surface-fill) p-4">
        {running ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid min-w-0 gap-0.5">
              <p className="truncate text-sm text-muted-foreground">
                Timer running{running.task ? ` on ${running.task}` : ""}
              </p>
              <TimerClock
                startedAt={running.startedAt}
                className="text-3xl font-semibold tracking-tight tabular-nums"
              />
            </div>
            <Button disabled={pending} onClick={() => run(stopTimerAction)}>
              {pending ? (
                <Loader2Icon aria-hidden className="animate-spin" />
              ) : (
                <SquareIcon aria-hidden data-icon="inline-start" className="fill-current" />
              )}
              Stop timer
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor={ids.timerTask}>Timer on</Label>
              <TaskSelect
                id={ids.timerTask}
                tasks={tasks}
                value={timerTask}
                onChange={setTimerTask}
                disabled={pending}
              />
            </div>
            <Button
              disabled={pending}
              onClick={() => run(() => startTimerAction(projectId, timerTask || null))}
            >
              {pending ? (
                <Loader2Icon aria-hidden className="animate-spin" />
              ) : (
                <PlayIcon aria-hidden data-icon="inline-start" className="fill-current" />
              )}
              Start timer
            </Button>
            {otherTimer && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Your timer on {otherTimer} stops and saves when you start this one.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Time added by hand. */}
      <form
        ref={form}
        key={state.savedAt ?? "form"}
        action={formAction}
        noValidate
        aria-label="Add time"
        className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <div className="sm:col-span-2">
          <h3 className="font-semibold">Add time</h3>
          {/* Problems with the whole form (field problems show by their field). */}
          <FormMessage>{state.savedAt || state.errors ? undefined : state.message}</FormMessage>
        </div>
        <FormField
          label="Day"
          name="day"
          type="date"
          max={today}
          defaultValue={values.day ?? today}
          error={errors.day}
          disabled={saving}
        />
        <FormField
          label="How long"
          name="duration"
          autoComplete="off"
          defaultValue={values.duration}
          hint={DURATION_HINT}
          error={errors.duration}
          disabled={saving}
        />
        <div className="grid content-start gap-2">
          <Label htmlFor={ids.task}>Task (optional)</Label>
          <TaskSelect
            id={ids.task}
            name="taskId"
            tasks={tasks}
            disabled={saving}
            key={values.taskId ?? ""}
          />
          {errors.taskId && <p className="text-sm text-destructive">{errors.taskId}</p>}
        </div>
        <FormField
          label="Note (optional)"
          name="note"
          defaultValue={values.note}
          maxLength={TIME_NOTE_LIMIT}
          error={errors.note}
          disabled={saving}
        />
        <Button type="submit" disabled={saving} className="justify-self-start">
          {saving && <Loader2Icon aria-hidden className="animate-spin" />}
          {saving ? "Adding…" : "Add time"}
        </Button>
      </form>

      {/* The entries. */}
      {entries.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-(--surface-edge) bg-(--surface-fill)">
          {/* Fixed columns, so a long task name is cut short instead of pushing the
              delete button off a phone's screen. */}
          <table className="w-full table-fixed text-left text-sm">
            <caption className="sr-only">Time logged on this project</caption>
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="w-28 px-3 py-2.5 font-medium">
                  Day
                </th>
                <th scope="col" className="w-20 px-3 py-2.5 font-medium">
                  Time
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  On
                </th>
                <th scope="col" className="hidden w-44 px-3 py-2.5 font-medium sm:table-cell">
                  Who
                </th>
                <th scope="col" className="w-12 px-1 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-3 py-2.5 whitespace-nowrap">{entry.day}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                    {entry.duration ?? <span className="text-brand">Running</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="block truncate">{entry.task ?? "The project"}</span>
                    {entry.note && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {entry.note}
                      </span>
                    )}
                  </td>
                  <td className="hidden truncate px-3 py-2.5 text-muted-foreground sm:table-cell">
                    {entry.who}
                  </td>
                  <td className="px-1 py-1.5 text-right">
                    {entry.canDelete && entry.duration && (
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => run(() => deleteTimeEntryAction(entry.id))}
                      >
                        <Trash2Icon aria-hidden />
                        <span className="sr-only">
                          Delete {entry.duration} on {entry.day}
                        </span>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
