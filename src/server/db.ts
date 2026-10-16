// The app's one connection to the database.
//
// "server-only" makes the build fail if a Client Component ever imports
// this file, so database code and the connection string can't reach the
// browser.
import "server-only";

import { createPrismaClient, type Db } from "./db/client";
import { parseServerEnv } from "./env";

// In development Next reloads modules on every save; keeping the client on
// globalThis stops each reload from opening a new pool of connections.
const globalForDb = globalThis as unknown as { clientflowDb?: Db };

/** The database client. Prisma connects on the first query. */
export const db: Db =
  globalForDb.clientflowDb ?? createPrismaClient(parseServerEnv(process.env).DATABASE_URL);

if (process.env.NODE_ENV !== "production") globalForDb.clientflowDb = db;
