"use client";

import { LogoMark } from "@/components/brand/logo";
import { ErrorView } from "@/components/error-view";

// Anything outside the app's shell failed (or the shell itself).
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center">
      <LogoMark className="size-10" />
      <ErrorView error={error} retry={retry} />
    </main>
  );
}
