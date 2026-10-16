import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/server/auth/session";

// Every page in the (app) group needs a signed-in user. proxy.ts already
// turns away visitors without a session cookie; this checks the session
// itself in the database, for every page in the group, even one that
// forgets to. (Data access checks again, from Stage 4.)
async function RequireSignIn() {
  await requireUser();
  return null;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <RequireSignIn />
      </Suspense>
      {children}
    </AppShell>
  );
}
