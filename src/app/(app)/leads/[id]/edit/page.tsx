import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LeadForm } from "@/components/leads/lead-form";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { db } from "@/server/db";
import { updateLeadAction } from "@/server/leads/actions";
import { getLead } from "@/server/leads/service";
import { requireWorkspace } from "@/server/workspace/context";

// The record's name in the browser tab (it streams in with the page).
export async function generateMetadata({
  params,
}: PageProps<"/leads/[id]/edit">): Promise<Metadata> {
  const { id } = await params;
  const record = await getLead(db, await requireWorkspace(), id);
  return { title: record ? `Edit ${record.contactName}` : "Not found" };
}

async function EditLead({ params }: { params: PageProps<"/leads/[id]/edit">["params"] }) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const lead = await getLead(db, ctx, id);
  if (!lead) notFound();

  return (
    <>
      <Breadcrumbs
        list={{ label: "Leads", href: "/leads" }}
        items={[{ label: lead.contactName, href: `/leads/${lead.id}` }, { label: "Edit" }]}
      />
      <PageHeader title={`Edit ${lead.contactName}`} />
      <Card className="max-w-3xl">
        <CardContent>
          <LeadForm
            action={updateLeadAction.bind(null, lead.id)}
            initial={{
              contactName: lead.contactName,
              company: lead.company ?? "",
              email: lead.email ?? "",
              phone: lead.phone ?? "",
              source: lead.source ?? "",
              notes: lead.notes ?? "",
              status: lead.status,
            }}
            statusLocked={lead.convertedClient !== null}
            submitLabel="Save changes"
            cancelHref={`/leads/${lead.id}`}
          />
        </CardContent>
      </Card>
    </>
  );
}

export default function EditLeadPage({ params }: PageProps<"/leads/[id]/edit">) {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton aria-hidden className="h-96 w-full max-w-3xl rounded-xl" />}>
        <EditLead params={params} />
      </Suspense>
    </PageContainer>
  );
}
