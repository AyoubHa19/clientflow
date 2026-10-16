import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <LogoMark className="size-10" />
      <div>
        <p className="text-sm font-medium text-brand">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 max-w-sm text-sm text-pretty text-muted-foreground">
          The page you were looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to ClientFlow</Link>
      </Button>
    </main>
  );
}
