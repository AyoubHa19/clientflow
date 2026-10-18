import type { Db } from "@/server/db/client";

// "Try the demo" (Stage 13): each visitor gets a private, throwaway account
// and workspace filled with the sample data. Demo accounts have an address
// in a domain that can't receive mail (.invalid is reserved), are deleted
// 24 hours after they start, and only so many can start in an hour.

export const DEMO_DOMAIN = "demo.clientflow.invalid";
/** How long a demo lives. */
export const DEMO_HOURS = 24;
/** New demos allowed per hour, across the whole site. */
export const DEMOS_PER_HOUR = 30;

export const isDemoEmail = (email: string) => email.toLowerCase().endsWith(`@${DEMO_DOMAIN}`);

const demoUsers = { email: { endsWith: `@${DEMO_DOMAIN}` } };

/**
 * Deletes demos older than DEMO_HOURS: their workspaces (and everything in
 * them), then the accounts (and their sessions). Returns how many went.
 */
export async function cleanUpDemos(db: Db, now = new Date()) {
  const cutoff = new Date(now.getTime() - DEMO_HOURS * 3600_000);
  const old = await db.user.findMany({
    where: { ...demoUsers, createdAt: { lt: cutoff } },
    select: { id: true },
    take: 200,
  });
  if (old.length === 0) return 0;
  const ids = old.map((user) => user.id);
  await db.$transaction([
    db.workspace.deleteMany({ where: { memberships: { some: { userId: { in: ids } } } } }),
    db.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
  return ids.length;
}

/** Whether another demo may start now (fewer than DEMOS_PER_HOUR in the last hour). */
export async function canStartDemo(db: Db, now = new Date()) {
  const recent = await db.user.count({
    where: { ...demoUsers, createdAt: { gte: new Date(now.getTime() - 3600_000) } },
  });
  return recent < DEMOS_PER_HOUR;
}
