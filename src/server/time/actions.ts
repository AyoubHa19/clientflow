"use server";

// Server Actions for time tracking. Next checks each call comes from this
// site; the workspace and the person come from requireWorkspace(), and the
// service checks the project and task belong to the workspace.

import { refresh } from "next/cache";
import { formatDuration } from "@/lib/time";
import { db } from "@/server/db";
import { requireWorkspace } from "@/server/workspace/context";
import { deleteTimeEntry, logTime, startTimer, stopTimer } from "./service";

type Result = { ok: true; message?: string } | { ok: false; message: string };

export async function startTimerAction(projectId: string, taskId: string | null): Promise<Result> {
  const ctx = await requireWorkspace();
  const result = await startTimer(db, ctx, { projectId, taskId });
  if (!result.ok) return { ok: false, message: result.message };
  refresh();
  const stopped = result.value.stopped;
  return {
    ok: true,
    message: stopped
      ? `Timer started. ${formatDuration(stopped.minutes)} saved on ${stopped.projectName}.`
      : "Timer started",
  };
}

export async function stopTimerAction(): Promise<Result> {
  const ctx = await requireWorkspace();
  const result = await stopTimer(db, ctx);
  if (!result.ok) return { ok: false, message: "No timer is running." };
  refresh();
  const { minutes, capped, projectName } = result.value;
  return {
    ok: true,
    message: capped
      ? `Saved 24h on ${projectName}: the timer ran longer than a day, so it was capped. Fix it by deleting the entry and adding the real time.`
      : `${formatDuration(minutes)} saved on ${projectName}`,
  };
}

export type TimeFormState = {
  errors?: Record<string, string>;
  message?: string;
  values?: Record<string, string>;
  /** Changes on every save, so the form starts empty again. */
  savedAt?: number;
};

const FIELDS = ["projectId", "taskId", "day", "duration", "note"] as const;

export async function logTimeAction(
  _previous: TimeFormState,
  formData: FormData,
): Promise<TimeFormState> {
  const ctx = await requireWorkspace();
  const values = Object.fromEntries(
    FIELDS.map((field) => [field, String(formData.get(field) ?? "")]),
  );
  const result = await logTime(db, ctx, values);
  if (!result.ok) return { errors: result.errors, message: result.message, values };
  refresh();
  return { savedAt: Date.now(), message: `${formatDuration(result.value.minutes)} added` };
}

export async function deleteTimeEntryAction(id: string): Promise<Result> {
  const ctx = await requireWorkspace();
  const result = await deleteTimeEntry(db, ctx, id);
  if (!result.ok) return { ok: false, message: result.message };
  refresh();
  return { ok: true };
}
