"use server";

// "Try the demo": makes a private demo account and workspace for this
// visitor, fills it with the sample data, signs them in and opens Today.
// Anyone may call it (that's the point), so it's capped per hour and old
// demos are cleared first.

import { randomBytes, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { todayIn } from "@/lib/dates";
import { isValidTimeZone } from "@/lib/validation/workspace";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { seedSampleWorkspace } from "@/server/sample/seed";
import { createWorkspace } from "@/server/workspace/service";
import { canStartDemo, cleanUpDemos, DEMO_DOMAIN } from "./service";

export type DemoState = { message?: string };

const BUSY =
  "A lot of people are trying the demo right now. Try again in a few minutes, or create a free account.";
const FAILED = "The demo couldn't start. Please try again.";

export async function startDemoAction(
  _previous: DemoState,
  formData: FormData,
): Promise<DemoState> {
  const zone = String(formData.get("timezone") ?? "");
  const timezone = isValidTimeZone(zone) ? zone : "UTC";

  await cleanUpDemos(db);
  if (!(await canStartDemo(db))) return { message: BUSY };

  let userId: string | null = null;
  try {
    // A throwaway account; nextCookies() signs the visitor in with it.
    const result = await auth.api.signUpEmail({
      body: {
        name: "Demo visitor",
        email: `visitor-${randomUUID()}@${DEMO_DOMAIN}`,
        password: randomBytes(24).toString("base64url"),
      },
      headers: await headers(),
    });
    userId = result.user.id;
    const workspace = await createWorkspace(db, userId, { name: "Demo Studio", timezone });
    if (!workspace.ok) throw new Error(workspace.message);
    await seedSampleWorkspace(
      db,
      {
        user: { id: userId, name: result.user.name, email: result.user.email },
        workspace: workspace.value,
        role: "OWNER",
      },
      todayIn(timezone),
    );
  } catch {
    // Half made: remove it, so nothing is left behind.
    if (userId) {
      const id = userId;
      await db.workspace
        .deleteMany({ where: { memberships: { some: { userId: id } } } })
        .catch(() => {});
      await db.user.delete({ where: { id } }).catch(() => {});
    }
    return { message: FAILED };
  }
  redirect("/today");
}
