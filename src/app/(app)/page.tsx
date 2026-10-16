import { SparklesIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageContainer, PageHeader } from "@/components/shell/page-header";

export default function OverviewPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Welcome to ClientFlow"
        description="Clients, leads, projects and tasks in one calm workspace."
      />
      <EmptyState
        icon={SparklesIcon}
        title="Your workspace is on its way"
        description="Sign-in comes next, then clients, leads, projects and tasks. This page will show your real numbers once they exist."
      />
    </PageContainer>
  );
}
