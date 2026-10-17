"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * What a page shows when it fails to load. The cause is usually brief (the
 * database waking up, a dropped connection), so "Try again" comes first.
 * Production hides the error's message; its digest matches the server log.
 */
export function ErrorView({ error, retry }: { error: unknown; retry: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  // "Trying again" lasts until this error is replaced (by the page, or by a
  // new error if it fails again).
  const [retriedError, setRetriedError] = useState<unknown>(null);
  const retrying = retriedError !== null && retriedError === error;
  const digest =
    error instanceof Error && "digest" in error && typeof error.digest === "string"
      ? error.digest
      : null;

  useEffect(() => {
    console.error(error);
    // Screen readers and keyboards land on the explanation.
    heading.current?.focus();
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-4 py-16 text-center">
      <title>Something went wrong · ClientFlow</title>
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlertIcon aria-hidden className="size-6" />
      </div>
      <div>
        <h1
          ref={heading}
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight outline-none"
        >
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          This page couldn&apos;t load. It&apos;s often a brief connection problem, so try again in
          a moment. Nothing you saved is lost.
        </p>
        {digest && <p className="mt-3 text-xs text-muted-foreground">Reference: {digest}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          disabled={retrying}
          onClick={() => {
            setRetriedError(error);
            retry();
          }}
        >
          <RotateCwIcon aria-hidden className={retrying ? "animate-spin" : undefined} />
          {retrying ? "Trying again…" : "Try again"}
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go to the overview</Link>
        </Button>
      </div>
    </div>
  );
}
