import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// End-to-end tests drive a real browser against the app. They start their
// own dev server on port 3100. Next allows only one dev server per folder,
// so if `npm run dev` is already running, point the tests at it instead:
//   E2E_BASE_URL=http://localhost:3001 npm run test:e2e
const existingServer = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: existingServer ?? `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: existingServer
    ? undefined
    : {
        // `npx next dev`, not `npm run dev`, which fixes the port at 3001.
        command: `npx next dev --port ${PORT}`,
        // Better Auth checks that requests come from its own address.
        env: { BETTER_AUTH_URL: `http://localhost:${PORT}` },
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
