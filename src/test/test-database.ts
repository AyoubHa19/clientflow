import { existsSync } from "node:fs";

/**
 * The test branch's URL, after checking it can't be the app's database:
 * the database tests wipe whatever they point at.
 */
export function getTestDatabaseUrl() {
  // Next's own loader skips .env.local when NODE_ENV is "test" (as under
  // Vitest), so read it with Node's. Variables already set win.
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");

  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error("TEST_DATABASE_URL is missing: add the Neon test branch to .env.local.");
  }
  const host = (url: string | undefined) => (url ? new URL(url).host.replace("-pooler", "") : "");
  const appHosts = [process.env.DATABASE_URL, process.env.DIRECT_DATABASE_URL].map(host);
  if (appHosts.includes(host(testUrl))) {
    throw new Error("TEST_DATABASE_URL points at the app's database. Refusing to wipe it.");
  }
  return testUrl;
}
