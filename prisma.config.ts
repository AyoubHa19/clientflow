import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Read .env.local the same way Next.js does, so the Prisma CLI and the app
// share one file. Variables already set in the shell win, which is how the
// database tests point migrations at the test branch.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrations use the direct connection (not Neon's pooler). It may be
  // missing where only `prisma generate` runs, which needs no database.
  datasource: { url: process.env.DIRECT_DATABASE_URL },
});
