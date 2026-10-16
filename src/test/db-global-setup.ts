import { execSync } from "node:child_process";
import { getTestDatabaseUrl } from "./test-database";

// Before the database tests: bring the test branch up to date with every
// migration, exactly as production will get them. Nothing is wiped: each
// test file deletes only the records it created.
export default function setup() {
  const testUrl = getTestDatabaseUrl();
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DIRECT_DATABASE_URL: testUrl },
  });
}
