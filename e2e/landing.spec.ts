import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, isPhone, signUpWithWorkspace } from "./helpers";

test("visitors see the landing page at the home address", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle("ClientFlow · Client work, organised");
  await expect(
    page.getByRole("heading", { level: 1, name: /Your clients\. Your work\./ }),
  ).toBeVisible();

  // The product preview says its numbers are made up.
  await expect(
    page.getByRole("img", { name: /preview of the ClientFlow dashboard, with made-up numbers/ }),
  ).toHaveCount(2);
  for (const name of [
    "Everything a freelancer juggles, in one place",
    "Private by design",
    "Clear skies for your client work",
  ]) {
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  }
  // The photographers are credited.
  await expect(page.getByText(/Harper van Mourik and Vlad ION/)).toBeVisible();

  // The section links jump down the page (desktop menu).
  if (!isPhone(page)) {
    await page
      .getByRole("navigation", { name: "Sections" })
      .getByRole("link", { name: "Security" })
      .click();
    await expect(page).toHaveURL("/#security");
  }

  // The calls to action lead to sign-up and sign-in.
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/\/sign-up$/);
  await page.goto("/");
  await page.getByRole("main").getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("signed-in people still get their dashboard at the home address", async ({ page }) => {
  await signUpWithWorkspace(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome, Sara");
});

test("the landing page fits phones without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`axe finds no problems on the landing page (${colorScheme})`, async ({ page }) => {
    // Still frames: scroll animations would catch elements mid-fade.
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoAxeViolations(page);
  });
}
