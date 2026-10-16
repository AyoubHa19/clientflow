import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { Client } from "pg";

// Direct database access for test setup that would be slow through the UI
// (like 25 clients for pagination). Dev branch only, test accounts only.

function uuidv7() {
  const bytes = randomBytes(16);
  const now = BigInt(Date.now());
  for (let i = 0; i < 6; i++) bytes[i] = Number((now >> BigInt(8 * (5 - i))) & BigInt(0xff));
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function withDb<T>(run: (client: Client) => Promise<T>) {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const client = new Client({ connectionString: process.env.DIRECT_DATABASE_URL });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

/** Adds `names` as clients in the workspace of the test account `email`. */
export async function addClientsFor(email: string, names: string[]) {
  if (!email.startsWith("e2e-")) throw new Error("Only for e2e test accounts");
  await withDb(async (db) => {
    const { rows } = await db.query<{ workspaceId: string }>(
      `SELECT m."workspaceId" FROM workspace_memberships m
       JOIN users u ON u.id = m."userId" WHERE u.email = $1`,
      [email],
    );
    const workspaceId = rows[0]?.workspaceId;
    if (!workspaceId) throw new Error("That account has no workspace");
    for (const name of names) {
      await db.query(
        `INSERT INTO clients (id, "workspaceId", name, status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'ACTIVE', now(), now())`,
        [uuidv7(), workspaceId, name],
      );
    }
  });
}
