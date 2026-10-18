"use client";

import { WifiOffIcon } from "lucide-react";
import { useOffline } from "next/offline";

/**
 * Says so when the connection drops. Meanwhile Next.js holds page changes
 * and saves (Server Actions) and retries them once the connection is back
 * (experimental.useOffline in next.config.ts).
 */
export function OfflineNotice() {
  const offline = useOffline();
  return (
    <div role="status" aria-live="polite">
      {offline && (
        <p className="flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 text-sm text-warning">
          <WifiOffIcon aria-hidden className="size-4 shrink-0" />
          You&apos;re offline. Changes wait and go through when you&apos;re back.
        </p>
      )}
    </div>
  );
}
