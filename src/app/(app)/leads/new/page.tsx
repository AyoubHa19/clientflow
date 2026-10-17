import type { Metadata } from "next";
import { LeadForm } from "@/components/leads/lead-form";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { createLeadAction } from "@/server/leads/actions";

export const metadata: Metadata = { title: "New lead" };

export default function NewLeadPage() {
  return (
    <PageContainer>
      <Breadcrumbs list={{ label: "Leads", href: "/leads" }} items={[{ label: "New lead" }]} />
      <PageHeader title="New lead" description="Only the contact's name is required." />
      <Card className="max-w-3xl">
        <CardContent>
          <LeadForm action={createLeadAction} submitLabel="Add lead" cancelHref="/leads" />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
