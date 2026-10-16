import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// End-to-end tests drive a real browser against the app. By default they
// build it and run the production server on port 3100: much faster than a
// dev server, and what people will actually use. While working on one test,
// point it at the running dev server instead:
//   E2E_BASE_URL=http://localhost:3001 npx playwright test e2e/clients.spec.ts
const existingServer = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: true,
  // One server serves every test: more than three at once overloads it.
  workers: 3,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  // A dev server compiles pages on first visit and serves many tests at
  // once, so give each step more time than the 5-second default.
  timeout: 60_000,
  expect: { timeout: 15_000 },
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
        command: `npm run build && npx next start --port ${PORT}`,
        env: {
          // Better Auth checks that requests come from its own address.
          BETTER_AUTH_URL: `http://localhost:${PORT}`,
          // The tests sign up many accounts from one address (see auth/index.ts).
          AUTH_RATE_LIMIT: "off",
        },
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
      },
});
