import { Suspense } from "react";
import { SparklesIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/server/auth/session";

async function Greeting() {
  const user = await requireUser();
  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;
  return (
    <PageHeader
      title={`Welcome, ${firstName}`}
      description="Clients, leads, projects and tasks in one calm workspace."
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
        title="Your workspace is on its way"
        description="Next you'll name your workspace, then add clients, leads, projects and tasks. This page will show your real numbers once they exist."
      />
    </PageContainer>
  );
}
