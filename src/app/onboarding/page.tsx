import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingForm } from "@/components/workspace/onboarding-form";
import { timeZoneOptions } from "@/lib/validation/workspace";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { findMembership } from "@/server/workspace/service";

export const metadata: Metadata = { title: "Set up your workspace" };

// Signed in but without a workspace: name it here. Anyone who already has
// one goes straight to the app.
async function Onboarding() {
  const user = await requireUser();
  if (await findMembership(db, user.id)) redirect("/");
  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome, {firstName}</h1>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        One last step: name your workspace. Your clients, leads, projects and tasks live in it.
      </p>
      <OnboardingForm zones={timeZoneOptions()} />
    </>
  );
}

function OnboardingFallback() {
  return (
    <div className="grid gap-4" aria-hidden>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="mt-6 h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <main className="flex min-h-dvh flex-col px-4 py-6 sm:px-8">
      <div className="flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        <p className="mb-3 text-xs font-medium tracking-wide text-brand uppercase">Step 2 of 2</p>
        <Suspense fallback={<OnboardingFallback />}>
          <Onboarding />
        </Suspense>
      </div>
    </main>
  );
}
