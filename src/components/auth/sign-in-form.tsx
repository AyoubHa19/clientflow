"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { fieldErrors, safeNextPath, signInSchema } from "@/lib/validation/auth";
import { focusFirstError, FormField, FormMessage } from "./form-field";

export function SignInForm() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const parsed = signInSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    setMessage(undefined);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      focusFirstError(formElement);
      return;
    }
    setErrors({});
    setPending(true);
    const { error } = await authClient.signIn.email(parsed.data);
    if (error) {
      setPending(false);
      setMessage(authErrorMessage(error));
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <FormMessage>{message}</FormMessage>
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email}
        disabled={pending}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        error={errors.password}
        disabled={pending}
      />
      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending && <Loader2Icon aria-hidden className="animate-spin" />}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New to ClientFlow?{" "}
        <Link href="/sign-up" className="font-medium text-brand underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
