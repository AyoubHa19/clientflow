import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        Free to use. You can set up your workspace next.
      </p>
      <SignUpForm />
    </>
  );
}
