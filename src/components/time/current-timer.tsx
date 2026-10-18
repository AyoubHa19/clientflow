import { Suspense } from "react";
import { db } from "@/server/db";
import { runningTimer } from "@/server/time/service";
import { requireWorkspace } from "@/server/workspace/context";
import { RunningTimerBar } from "./running-timer";

async function Timer() {
  const ctx = await requireWorkspace();
  const running = await runningTimer(db, ctx);
  if (!running?.startedAt) return null;
  return (
    <RunningTimerBar
      startedAt={running.startedAt.toISOString()}
      projectId={running.project.id}
      projectName={running.project.name}
      taskTitle={running.task?.title ?? null}
    />
  );
}

/** The person's running timer, if any; it streams in with the page. */
export function CurrentTimer() {
  return (
    <Suspense fallback={null}>
      <Timer />
    </Suspense>
  );
}
