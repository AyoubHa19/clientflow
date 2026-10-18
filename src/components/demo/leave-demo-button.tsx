"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/** Leaves the demo (signs out) and opens sign-up for a real account. */
export function LeaveDemoButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await authClient.signOut();
          router.replace("/sign-up");
          router.refresh();
        })
      }
    >
      {pending && <Loader2Icon aria-hidden className="animate-spin" />}
      Create your own account
    </Button>
  );
}
