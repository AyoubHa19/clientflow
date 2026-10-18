import { expect, test, type Page } from "@playwright/test";
import { signUpWithWorkspace } from "./helpers";

// Stage 17: timers, time added by hand, the real hourly rate and client health.

const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });

test("time on a project gives its real hourly rate and the client's health", async ({ page }) => {
  await signUpWithWorkspace(page);

  await page.goto("/clients/new");
  await field(page, "Name").fill("Kenza Studio (sample)");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Kenza Studio (sample)" }),
  ).toBeVisible();

  await page.goto("/projects/new");
  await field(page, "Project name").fill("Website (sample)");
  await field(page, "Client").selectOption({ label: "Kenza Studio (sample)" });
  await page
    .getByLabel(/^Fee in [A-Z]{3} \(optional\)$/)
    .filter({ visible: true })
    .fill("3000");
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Website (sample)" })).toBeVisible();
  const projectUrl = page.url();
  const main = page.getByRole("main");

  // A timer: started here, visible at the top, stopped from there.
  await main.getByRole("button", { name: "Start timer" }).click();
  const bar = page.getByRole("group", { name: "Timer running on Website (sample)" });
  await expect(bar).toBeVisible();
  await bar.getByRole("button", { name: "Stop the timer" }).click();
  await expect(page.getByText("1m saved on Website (sample)")).toBeVisible();
  await expect(bar).toHaveCount(0);

  // Time by hand: 9h 59m more makes 10 hours, so 3,000 pays 300 an hour.
  const form = main.getByRole("form", { name: "Add time" });
  await form.getByLabel("How long").fill("soon");
  await form.getByRole("button", { name: "Add time" }).click();
  await expect(form.getByText('Enter a duration like "1:30", "90m" or "1.5".')).toBeVisible();
  await form.getByLabel("How long").fill("9h 59m");
  await form.getByRole("button", { name: "Add time" }).click();
  await expect(page.getByText("9h 59m added")).toBeVisible();
  await expect(main.getByText("10h", { exact: true })).toBeVisible();
  await expect(main.getByText(/^[A-Z]{3} 300\/h$/)).toBeVisible();

  // The client's page explains its health; the list shows it.
  await page.goto("/clients");
  await expect(
    // "Health: " is read out to screen readers before the word.
    page.getByRole("main").getByText("Health: Good").filter({ visible: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Kenza Studio (sample)" })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page.getByText("Pays about your average per hour")).toBeVisible();
  await expect(page.getByText("Nothing overdue")).toBeVisible();

  // Deleting an entry takes it off the total.
  await page.goto(projectUrl);
  await main.getByRole("button", { name: /^Delete 1m on/ }).click();
  await expect(main.getByText("9h 59m", { exact: true }).first()).toBeVisible();
});
