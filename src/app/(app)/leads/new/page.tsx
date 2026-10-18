import type { Metadata } from "next";
import { Suspense } from "react";
import { LeadForm } from "@/components/leads/lead-form";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { createLeadAction } from "@/server/leads/actions";
import { requireWorkspace } from "@/server/workspace/context";

export const metadata: Metadata = { title: "New lead" };

/** The form, once the workspace (and so its currency) is known. */
async function NewLead() {
  const { workspace } = await requireWorkspace();
  return (
    <LeadForm
      action={createLeadAction}
      currency={workspace.currency}
      submitLabel="Add lead"
      cancelHref="/leads"
    />
  );
}

export default function NewLeadPage() {
  return (
    <PageContainer>
      <Breadcrumbs list={{ label: "Leads", href: "/leads" }} items={[{ label: "New lead" }]} />
      <PageHeader title="New lead" description="Only the contact's name is required." />
      <Card className="max-w-3xl">
        <CardContent>
          <Suspense fallback={<Skeleton aria-hidden className="h-96 w-full" />}>
            <NewLead />
          </Suspense>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
