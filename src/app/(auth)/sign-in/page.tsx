import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">Sign in to your ClientFlow account.</p>
      {/* The form reads ?next= from the address, so it waits for the request. */}
      <Suspense>
        <SignInForm />
      </Suspense>
    </>
  );
}
