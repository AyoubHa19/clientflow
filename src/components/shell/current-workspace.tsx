import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireWorkspace } from "@/server/workspace/context";

async function WorkspaceName() {
  const { workspace } = await requireWorkspace();
  return (
    <p className="truncate text-xs text-muted-foreground" title={workspace.name}>
      <span className="sr-only">Workspace: </span>
      {workspace.name}
    </p>
  );
}

/** The current workspace's name, under the logo; it streams in. */
export function CurrentWorkspace() {
  return (
    <Suspense fallback={<Skeleton aria-hidden className="h-3.5 w-24" />}>
      <WorkspaceName />
    </Suspense>
  );
}
