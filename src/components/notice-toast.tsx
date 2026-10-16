"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * Shows a toast named by `?notice=` (set by a Server Action's redirect), then
 * removes it from the address so a reload doesn't show it again.
 */
export function NoticeToast({ messages }: { messages: Record<string, string> }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const notice = searchParams.get("notice");

  useEffect(() => {
    if (!notice) return;
    const message = messages[notice];
    // A fixed id, so the toast shows once even if this runs twice.
    if (message) toast.success(message, { id: `notice-${notice}` });
    const rest = new URLSearchParams(searchParams);
    rest.delete("notice");
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [notice, messages, pathname, router, searchParams]);

  return null;
}
