import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClientForm } from "@/components/clients/client-form";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { updateClientAction } from "@/server/clients/actions";
import { getClient } from "@/server/clients/service";
import { db } from "@/server/db";
import { requireWorkspace } from "@/server/workspace/context";

export const metadata: Metadata = { title: "Edit client" };

async function EditClient({ params }: { params: PageProps<"/clients/[id]/edit">["params"] }) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const client = await getClient(db, ctx, id);
  if (!client) notFound();

  return (
    <>
      <PageHeader title={`Edit ${client.name}`} />
      <Card className="max-w-3xl">
        <CardContent>
          <ClientForm
            // The id is fixed into the action on the server; the service still
            // checks it belongs to this workspace.
            action={updateClientAction.bind(null, client.id)}
            initial={{
              name: client.name,
              email: client.email ?? "",
              phone: client.phone ?? "",
              company: client.company ?? "",
              notes: client.notes ?? "",
              status: client.status,
            }}
            submitLabel="Save changes"
            cancelHref={`/clients/${client.id}`}
          />
        </CardContent>
      </Card>
    </>
  );
}

export default function EditClientPage({ params }: PageProps<"/clients/[id]/edit">) {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton aria-hidden className="h-96 w-full max-w-3xl rounded-xl" />}>
        <EditClient params={params} />
      </Suspense>
    </PageContainer>
  );
}
