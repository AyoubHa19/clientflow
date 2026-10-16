import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { findMembership, type WorkspaceContext } from "./service";

/**
 * The signed-in user's workspace context, checked in the database once per
 * request. Visitors go to sign in; people without a workspace to the
 * onboarding page. Reads cookies, so callers sit inside <Suspense>.
 *
 * Every page and action that touches workspace data starts here, and
 * filters its queries by `ctx.workspace.id`.
 */
export const requireWorkspace = cache(async (): Promise<WorkspaceContext> => {
  const user = await requireUser();
  const membership = await findMembership(db, user.id);
  if (!membership) redirect("/onboarding");
  return { user, workspace: membership.workspace, role: membership.role };
});
