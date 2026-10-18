/**
 * Creates the "(sample)" demo account with a workspace full of realistic
 * data: clients, leads (one converted), projects and tasks, with dates
 * around today so the dashboard has something overdue and something coming
 * up. Everything goes through the app's own rules (the services), so it's
 * data the app could have made itself.
 *
 * Safe to run twice: if the account already exists, it stops.
 *
 *   SAMPLE_USER_EMAIL=... SAMPLE_USER_PASSWORD=... DATABASE_URL=... \
 *     npx tsx scripts/seed-sample.ts
 *
 * The password is never printed.
 */
import { randomBytes } from "node:crypto";
import { todayIn } from "@/lib/dates";
import { createAuth } from "@/server/auth/config";
import { createPrismaClient } from "@/server/db/client";
import { seedSampleWorkspace } from "@/server/sample/seed";
import { createWorkspace, type WorkspaceContext } from "@/server/workspace/service";
import type { ServiceResult } from "@/server/result";

const TIME_ZONE = "Africa/Casablanca";

function must<T>(result: ServiceResult<T>, what: string): T {
  if (!result.ok) throw new Error(`${what}: ${result.message} ${JSON.stringify(result.errors)}`);
  return result.value;
}

async function main() {
  const { DATABASE_URL, SAMPLE_USER_EMAIL, SAMPLE_USER_PASSWORD } = process.env;
  if (!DATABASE_URL || !SAMPLE_USER_EMAIL || !SAMPLE_USER_PASSWORD) {
    throw new Error("Set DATABASE_URL, SAMPLE_USER_EMAIL and SAMPLE_USER_PASSWORD.");
  }
  const db = createPrismaClient(DATABASE_URL);
  try {
    const email = SAMPLE_USER_EMAIL.toLowerCase();
    if (await db.user.findUnique({ where: { email } })) {
      console.log("The sample account already exists; nothing to do.");
      return;
    }

    // The account, through Better Auth (the password is hashed with scrypt).
    // The secret only signs session cookies, and this script keeps none.
    const auth = createAuth({
      db,
      secret: randomBytes(32).toString("hex"),
      baseURL: "http://localhost",
    });
    const signedUp = await auth.api.signUpEmail({
      body: { name: "Sara Bennani (sample)", email, password: SAMPLE_USER_PASSWORD },
    });
    await db.session.deleteMany({ where: { userId: signedUp.user.id } });

    const workspace = must(
      await createWorkspace(db, signedUp.user.id, {
        name: "Bennani Design Studio (sample)",
        timezone: TIME_ZONE,
      }),
      "workspace",
    );
    const ctx: WorkspaceContext = {
      user: { id: signedUp.user.id, name: signedUp.user.name, email },
      workspace,
      role: "OWNER",
    };
    const today = todayIn(TIME_ZONE);

    await seedSampleWorkspace(db, ctx, today);

    const counts = await Promise.all([
      db.client.count({ where: { workspaceId: workspace.id } }),
      db.lead.count({ where: { workspaceId: workspace.id } }),
      db.project.count({ where: { workspaceId: workspace.id } }),
      db.task.count({ where: { workspaceId: workspace.id } }),
    ]);
    console.log(
      `Sample account ready: ${counts[0]} clients, ${counts[1]} leads, ${counts[2]} projects, ${counts[3]} tasks.`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
