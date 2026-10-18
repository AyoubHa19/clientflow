import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers";

// Stage 13: "Try the demo" gives a visitor a private workspace with sample
// data, signed in, and a way out to a real account.

test("a visitor tries the demo, then leaves it for a real account", async ({ page }) => {
  // Making the demo writes the whole sample through the app's rules.
  test.setTimeout(120_000);
  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo" }).first().click();
  await expect(page).toHaveURL(/\/today$/, { timeout: 90_000 });
  await expect(page.getByText("You're in a demo")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
  // The sample data is there.
  await expect(
    page
      .getByRole("region", { name: /^Due today or late/ })
      .getByText("Send menu proofs to Atlas Café (sample)"),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByRole("button", { name: "Create your own account" }).click();
  await expect(page).toHaveURL(/\/sign-up$/);
  await expect(page.getByRole("heading", { level: 1, name: "Create your account" })).toBeVisible();
});
