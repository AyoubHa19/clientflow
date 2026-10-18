import { expect, test, type Page } from "@playwright/test";
import { signUpWithWorkspace } from "./helpers";

// Stage 15: a workspace's currency, lead values and project fees, and the
// money on the dashboard.

const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });

test("amounts in the workspace's currency add up on the dashboard and the board", async ({
  page,
}) => {
  await signUpWithWorkspace(page);

  // Onboarding guessed the currency from the browser's time zone (it
  // differs between machines); switch to euros.
  await page.goto("/settings");
  await expect(field(page, "Currency")).not.toHaveValue("");
  await field(page, "Currency").selectOption("EUR");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Workspace settings saved")).toBeVisible();

  // A lead: a wrong amount is explained, then a real one is saved.
  await page.goto("/leads/new");
  await field(page, "Contact name").fill("Rachid Amrani (sample)");
  await field(page, "Expected value in EUR (optional)").fill("lots");
  await page.getByRole("button", { name: "Add lead" }).click();
  await expect(
    page.getByText("Enter an amount like 1500 or 1,500.50, or leave it empty."),
  ).toBeVisible();
  await field(page, "Expected value in EUR (optional)").fill("2,500");
  await page.getByRole("button", { name: "Add lead" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Rachid Amrani (sample)" }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByText("EUR 2,500")).toBeVisible();

  // A project with a fee in cents.
  await page.goto("/projects/new");
  await field(page, "Project name").fill("Shop redesign (sample)");
  await field(page, "Fee in EUR (optional)").fill("1000.5");
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Shop redesign (sample)" }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByText("EUR 1,000.50")).toBeVisible();

  // The dashboard: the lead is in the pipeline, the project in open work.
  await page.goto("/");
  const money = page.getByRole("region", { name: "Money" });
  await expect(money.getByText("EUR 2,500")).toBeVisible();
  await expect(money.getByText("From 1 open lead with a value")).toBeVisible();
  await expect(money.getByText("EUR 1,000.50")).toBeVisible();
  await expect(money.getByText("0 leads won")).toBeVisible();

  // The board's New column shows what it's worth.
  await page.goto("/leads");
  await expect(page.locator('[data-status="NEW"] header')).toContainText("EUR 2,500");
});
