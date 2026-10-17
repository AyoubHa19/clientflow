import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * A Prisma client for one database URL. The app uses the shared one in
 * `src/server/db.ts`; tests make their own against the test branch.
 */
export function createPrismaClient(connectionString: string) {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    // Prisma waits 2 s for a connection before a transaction gives up. Neon's
    // free plan sleeps when idle and is shared, so under load (or on waking)
    // that was sometimes too short: "Unable to start a transaction in the
    // given time". Wait a little longer before failing.
    transactionOptions: { maxWait: 5_000, timeout: 10_000 },
  });
}

export type Db = ReturnType<typeof createPrismaClient>;
