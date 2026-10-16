import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./index";

/** What pages may know about the signed-in person: nothing more. */
export type CurrentUser = { id: string; name: string; email: string };

/**
 * The signed-in user, or null. The session is checked in the database on
 * every request (not just the cookie), once per request thanks to cache().
 * It reads cookies, so callers must sit inside <Suspense>.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { id, name, email };
});

/** The signed-in user; anyone else is sent to the sign-in page. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** For the sign-in and sign-up pages: someone signed in goes to the app. */
export async function redirectIfSignedIn() {
  if (await getCurrentUser()) redirect("/");
}
