import { expect, test } from "@playwright/test";
import { openQuickAddOptions, signUpWithWorkspace } from "./helpers";

// Stage 18: the Today page and the weekly review.

test("a task due today shows on Today; ticked off, it's in the week's review", async ({ page }) => {
  await signUpWithWorkspace(page);
  // The workspace's time zone is the browser's (picked at onboarding).
  const today = await page.evaluate(() => new Date().toLocaleDateString("en-CA"));

  await page.goto("/tasks");
  const form = page.getByRole("form", { name: "Add a task" });
  await form.getByLabel("New task", { exact: true }).fill("Call the printer (sample)");
  await openQuickAddOptions(form);
  await form.getByLabel("Due date", { exact: true }).fill(today);
  await form.getByRole("button", { name: "Add task" }).click();
  await expect(form.getByLabel("New task", { exact: true })).toHaveValue("");

  // Today, from the menu (the side bar, or the phone's menu).
  await page.goto("/today");
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
  const due = page.getByRole("region", { name: /^Due today or late/ });
  await expect(due.getByText("Call the printer (sample)")).toBeVisible();
  await expect(page.getByRole("region", { name: "Follow up" })).toBeVisible();

  await due.getByRole("checkbox", { name: /Call the printer \(sample\)/ }).check();
  await expect(due.getByText("Nothing due today. A good day to get ahead.")).toBeVisible();

  // The week in review counts it as done.
  await page.getByRole("link", { name: "Week in review" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Week in review" })).toBeVisible();
  const done = page.getByRole("region", { name: /^Done/ });
  await expect(done.getByRole("link", { name: "Call the printer (sample)" })).toBeVisible();

  // Last week is empty; the way back is there.
  await page.getByRole("link", { name: "Previous week" }).click();
  await expect(page.getByText("No tasks finished this week.")).toBeVisible();
  await page.getByRole("link", { name: "This week", exact: true }).click();
  await expect(done.getByRole("link", { name: "Call the printer (sample)" })).toBeVisible();
});
