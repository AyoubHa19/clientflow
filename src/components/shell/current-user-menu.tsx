import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/server/auth/session";
import { UserMenu } from "./user-menu";

async function LoadedUserMenu({ showDetails }: { showDetails?: boolean }) {
  const user = await requireUser();
  return <UserMenu name={user.name} email={user.email} showDetails={showDetails} />;
}

/** The account menu for the signed-in user; it streams in after the frame. */
export function CurrentUserMenu({ showDetails }: { showDetails?: boolean }) {
  const fallback = showDetails ? (
    <Skeleton aria-hidden className="h-12 w-full rounded-lg" />
  ) : (
    <Skeleton aria-hidden className="size-9 rounded-full" />
  );
  return (
    <Suspense fallback={fallback}>
      <LoadedUserMenu showDetails={showDetails} />
    </Suspense>
  );
}
