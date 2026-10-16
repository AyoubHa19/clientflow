import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// End-to-end tests drive a real browser against the app. They start their
// own dev server on port 3100. Next allows only one dev server per folder,
// so if `npm run dev` is already running, point the tests at it instead:
//   E2E_BASE_URL=http://localhost:3000 npm run test:e2e
const existingServer = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
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
        command: `npm run dev -- --port ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
