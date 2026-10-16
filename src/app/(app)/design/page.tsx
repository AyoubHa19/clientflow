import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { DesignShowcase } from "./showcase";

export const metadata: Metadata = { title: "Design system" };

// A reference sheet of the shared components, for development only: it
// isn't linked anywhere, and in production it answers "not found".
export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <PageContainer>
      <PageHeader
        title="Design system"
        description="The shared components and colours, in one place. Only available in development."
      />
      <DesignShowcase />
    </PageContainer>
  );
}
