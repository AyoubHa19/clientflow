import { defineConfig } from "vitest/config";

export default defineConfig({
  // Lets tests import with "@/..." like the app does (paths in tsconfig.json).
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Database tests need the test branch: `npm run test:db`.
    exclude: ["**/node_modules/**", "src/**/*.db.test.ts"],
  },
});
