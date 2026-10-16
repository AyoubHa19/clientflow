import { Suspense } from "react";
import { SparklesIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireWorkspace } from "@/server/workspace/context";

async function Greeting() {
  const { user, workspace } = await requireWorkspace();
  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;
  return (
    <PageHeader
      title={`Welcome, ${firstName}`}
      description={`Here's what's happening in ${workspace.name}.`}
    />
  );
}

function GreetingFallback() {
  return (
    <div className="grid gap-2" aria-hidden>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}

export default function OverviewPage() {
  return (
    <PageContainer>
      <Suspense fallback={<GreetingFallback />}>
        <Greeting />
      </Suspense>
      <EmptyState
        icon={SparklesIcon}
        title="Your workspace is ready"
        description="Clients, leads, projects and tasks come next. This page will show your real numbers once they exist."
      />
    </PageContainer>
  );
}
