import type { Metadata } from "next";
import { ClientForm } from "@/components/clients/client-form";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { createClientAction } from "@/server/clients/actions";

export const metadata: Metadata = { title: "New client" };

export default function NewClientPage() {
  return (
    <PageContainer>
      <Breadcrumbs
        list={{ label: "Clients", href: "/clients" }}
        items={[{ label: "New client" }]}
      />
      <PageHeader title="New client" description="Only the name is required." />
      <Card className="max-w-3xl">
        <CardContent>
          <ClientForm action={createClientAction} submitLabel="Add client" cancelHref="/clients" />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
