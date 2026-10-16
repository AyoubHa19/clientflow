import { defineConfig } from "vitest/config";

// Tests that run against a real PostgreSQL database: Neon's "test" branch
// (TEST_DATABASE_URL in .env.local), wiped and migrated before each run.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.db.test.ts"],
    globalSetup: ["./src/test/db-global-setup.ts"],
    // One file at a time: they share one database.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
