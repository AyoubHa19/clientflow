import { existsSync } from "node:fs";
import { Client } from "pg";
import { E2E_EMAIL_PREFIX } from "./helpers";

// After the browser tests: delete the workspaces and accounts they made
// (and, through the database's cascade rules, everything in them). Only addresses with the e2e
// prefix are touched; the "(sample)" account you use by hand stays.
export default async function globalTeardown() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const url = process.env.DIRECT_DATABASE_URL;
  if (!url) return;
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const pattern = `${E2E_EMAIL_PREFIX}%@example.com`;
    await client.query(
      `DELETE FROM workspaces WHERE id IN (
         SELECT m."workspaceId" FROM workspace_memberships m
         JOIN users u ON u.id = m."userId" WHERE u.email LIKE $1)`,
      [pattern],
    );
    await client.query(`DELETE FROM users WHERE email LIKE $1`, [pattern]);
  } finally {
    await client.end();
  }
}
