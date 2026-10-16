import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsForm } from "@/components/workspace/settings-form";
import { timeZoneOptions } from "@/lib/validation/workspace";
import { requireWorkspace } from "@/server/workspace/context";

export const metadata: Metadata = { title: "Settings" };

const ROLE_LABELS = { OWNER: "Owner", MEMBER: "Member" } as const;

async function Settings() {
  const { user, workspace, role } = await requireWorkspace();

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Workspace</h2>
          </CardTitle>
          <CardDescription>The name people see, and the time zone for dates.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            zones={timeZoneOptions()}
            name={workspace.name}
            timezone={workspace.timezone}
            canEdit={role === "OWNER"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Your account</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium break-words">{user.name}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium break-words">{user.email}</dd>
            <dt className="text-muted-foreground">Role in this workspace</dt>
            <dd className="font-medium">{ROLE_LABELS[role]}</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsFallback() {
  return (
    <div className="grid gap-6" aria-hidden>
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader title="Settings" description="Your workspace and your account." />
      <Suspense fallback={<SettingsFallback />}>
        <Settings />
      </Suspense>
    </PageContainer>
  );
}
