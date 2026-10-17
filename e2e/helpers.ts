import { randomBytes, randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

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
  // A record's tab title streams in after its page: wait until the page has
  // finished loading (no requests for a moment) and has its title.
  await page.waitForLoadState("networkidle");
  // ...and the title has settled (present for three checks in a row): the
  // old page's title can linger a moment before the new one replaces it.
  await expect
    .poll(async () => {
      for (let i = 0; i < 3; i++) {
        if (!(await page.title()).trim()) return false;
        await page.waitForTimeout(150);
      }
      return true;
    })
    .toBe(true);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  // Each problem names the elements and, for contrast, the measured ratio.
  expect(
    results.violations.map(
      (v) =>
        `${v.id}: ${v.help} → ${v.nodes
          .slice(0, 4)
          .map(
            (node) => `${node.target.join(" ")} (${node.any[0]?.message ?? node.failureSummary})`,
          )
          .join(" | ")}`,
    ),
  ).toEqual([]);
}

/** Signs a new account up and names its workspace, as onboarding does. */
export async function signUpWithWorkspace(page: Page, workspaceName = "Tester Studio (sample)") {
  const user = await signUpViaApi(page);
  await page.goto("/onboarding");
  await page
    .getByLabel("Workspace name", { exact: true })
    .filter({ visible: true })
    .fill(workspaceName);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL("/");
  return { ...user, workspaceName };
}

/** On narrow screens the filters fold behind a "Filters" button: opens them. */
export async function openFilters(page: Page) {
  // The filters stream in with the list; wait for them before looking.
  const search = page.getByRole("search").filter({ visible: true });
  await expect(search).toBeVisible();
  const toggle = search.getByRole("button", { name: /^Filters/ });
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }
}

/** The quick add's extras (project, due date, priority), folded on narrow screens. */
export async function openQuickAddOptions(form: Locator) {
  await expect(form).toBeVisible();
  const toggle = form.getByRole("button", { name: "More options" });
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }
}
