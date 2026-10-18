import { Suspense } from "react";
import { DemoNotice } from "@/components/demo/demo-banner";
import { RunningTimerBar } from "@/components/time/running-timer";
import { db } from "@/server/db";
import { isDemoEmail } from "@/server/demo/service";
import { runningTimer } from "@/server/time/service";
import { requireWorkspace } from "@/server/workspace/context";

async function Status() {
  const ctx = await requireWorkspace();
  const running = await runningTimer(db, ctx);
  return (
    <>
      {running?.startedAt && (
        <RunningTimerBar
          startedAt={running.startedAt.toISOString()}
          projectId={running.project.id}
          projectName={running.project.name}
          taskTitle={running.task?.title ?? null}
        />
      )}
      {isDemoEmail(ctx.user.email) && <DemoNotice />}
    </>
  );
}

/**
 * What the top of every page says about the person: their running timer,
 * and that they're in a demo. One Suspense boundary for both: a second one
 * loading the session in the shell made pages hang under load (Stage 13).
 */
export function ShellStatus() {
  return (
    <Suspense fallback={null}>
      <Status />
    </Suspense>
  );
}
