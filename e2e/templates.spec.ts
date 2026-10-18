import { expect, test, type Page } from "@playwright/test";
import { signUpWithWorkspace } from "./helpers";

// Stage 19: starting a project from a template, and saving one.

const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });

test("a project starts from a template, and is saved as a new one", async ({ page }) => {
  await signUpWithWorkspace(page);

  await page.goto("/projects/new");
  await field(page, "Start from").selectOption({ label: "Logo & brand (6 tasks)" });
  await field(page, "Project name").fill("Bakery logo (sample)");
  await field(page, "Start date (optional)").fill("2026-11-02");
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Bakery logo (sample)" })).toBeVisible();

  const main = page.getByRole("main");
  await expect(main.locator("[data-task-status]").filter({ visible: true })).toHaveCount(6);
  // "Discovery questionnaire" is due 2 days after the start.
  await expect(
    main.locator("[data-task-status]").filter({ hasText: "Discovery questionnaire" }),
  ).toContainText("Due 4 Nov 2026");

  await main.getByRole("button", { name: "Save as template" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Template name").fill("Bakery brand");
  await dialog.getByRole("button", { name: "Save template" }).click();
  await expect(page.getByText('Saved "Bakery brand" with 6 tasks')).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByText("Bakery brand", { exact: true })).toBeVisible();
  await page.goto("/projects/new");
  await expect(
    field(page, "Start from").locator("option", {
      hasText: "Your template: Bakery brand (6 tasks)",
    }),
  ).toHaveCount(1);
});
