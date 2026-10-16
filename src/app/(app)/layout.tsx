import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { requireWorkspace } from "@/server/workspace/context";

// Every page in the (app) group needs a signed-in user with a workspace.
// proxy.ts already turns away visitors without a session cookie; this
// checks the session and the workspace membership in the database, for
// every page in the group, even one that forgets to. Pages and actions
// still call requireWorkspace() themselves for the data they touch.
async function RequireWorkspace() {
  await requireWorkspace();
  return null;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <RequireWorkspace />
      </Suspense>
      {children}
    </AppShell>
  );
}
