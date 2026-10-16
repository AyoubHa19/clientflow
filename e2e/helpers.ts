import { randomBytes, randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// Accounts made by the browser tests use this address pattern, so
// e2e/global-teardown.ts can delete them afterwards.
export const E2E_EMAIL_PREFIX = "e2e-";

export function newTestUser() {
  return {
    name: "Sara Tester (sample)",
    email: `${E2E_EMAIL_PREFIX}${randomUUID()}@example.com`,
    password: `Test-${randomBytes(9).toString("base64url")}`,
  };
}

export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;

/** Signs a new account up through Better Auth's endpoint; the page keeps its cookie. */
export async function signUpViaApi(page: Page, user = newTestUser()) {
  // Opening a page first gives the site's address for the Origin header.
  await page.goto("/sign-in");
  const response = await page.request.post("/api/auth/sign-up/email", {
    data: user,
    headers: { origin: new URL(page.url()).origin },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return user;
}

export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}
