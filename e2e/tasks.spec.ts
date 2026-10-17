import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations, isPhone, signUpWithWorkspace } from "./helpers";

const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });

const visibleText = (page: Page, text: string | RegExp) =>
  page.getByText(text).filter({ visible: true });

/** The titles of the listed tasks. */
const taskTitles = (page: Page) =>
  page.locator("[data-task-status] > div:nth-child(2) > a").filter({ visible: true });

async function quickAdd(
  page: Page,
  title: string,
  extra: { due?: string; priority?: string } = {},
) {
  const form = page.getByRole("form", { name: "Add a task" });
  await form.getByLabel("New task", { exact: true }).fill(title);
  if (extra.due) await form.getByLabel("Due date", { exact: true }).fill(extra.due);
  if (extra.priority)
    await form.getByLabel("Priority", { exact: true }).selectOption(extra.priority);
  await form.getByRole("button", { name: "Add task" }).click();
  await expect(taskTitles(page).filter({ hasText: title })).toHaveCount(1);
  await expect(form.getByLabel("New task", { exact: true })).toHaveValue("");
}

test("add tasks quickly, tick them off and find them again", async ({ page }) => {
  await signUpWithWorkspace(page);
  await page.goto("/tasks");
  await expect(visibleText(page, "Nothing to do")).toBeVisible();

  // A title is required.
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(visibleText(page, "Enter what needs doing.")).toBeVisible();
  await expect(field(page, "New task")).toBeFocused();

  await quickAdd(page, "Call Karim (sample)", { due: "2020-01-15", priority: "HIGH" });
  await quickAdd(page, "Write the brief (sample)");
  // Soonest due first: the overdue one leads, with its badge.
  await expect(taskTitles(page)).toHaveText(["Call Karim (sample)", "Write the brief (sample)"]);
  await expect(visibleText(page, /Overdue by \d+ days/)).toBeVisible();

  // Tick one off: it leaves the open list and shows under Done.
  await page.getByRole("checkbox", { name: "Call Karim (sample): not done" }).check();
  await expect(taskTitles(page)).toHaveText(["Write the brief (sample)"]);
  await page.goto("/tasks?status=done");
  await expect(taskTitles(page)).toHaveText(["Call Karim (sample)"]);
  await expect(page.getByRole("checkbox", { name: "Call Karim (sample): done" })).toBeChecked();

  // The keyboard: space ticks the focused box (desktop).
  if (!isPhone(page)) {
    await page.getByRole("checkbox", { name: "Call Karim (sample): done" }).focus();
    await page.keyboard.press("Space");
    await expect(taskTitles(page)).toHaveCount(0);
    await page.goto("/tasks");
    await expect(taskTitles(page)).toHaveText(["Call Karim (sample)", "Write the brief (sample)"]);
  }

  // Filters: overdue and high priority.
  await page.goto("/tasks?due=overdue");
  await expect(taskTitles(page)).toHaveText(isPhone(page) ? [] : ["Call Karim (sample)"]);
  await page.goto("/tasks?priority=high&status=all");
  await expect(taskTitles(page)).toHaveText(["Call Karim (sample)"]);
  await page.goto("/tasks?q=brief");
  await expect(taskTitles(page)).toHaveText(["Write the brief (sample)"]);
});

test("edit a task, mark it done there, then delete it", async ({ page }) => {
  await signUpWithWorkspace(page);
  await page.goto("/tasks");
  await quickAdd(page, "Draft proposal (sample)");
  await taskTitles(page).first().click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Draft proposal (sample)" }),
  ).toBeVisible();
  await field(page, "Title").fill("Final proposal (sample)");
  await field(page, "Status").selectOption("DONE");
  await field(page, "Priority").selectOption("HIGH");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(visibleText(page, "Changes saved")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Final proposal (sample)" }),
  ).toBeVisible();
  await expect(visibleText(page, /Done \d+ \w+ \d{4}/)).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete task" }).click();
  await expect(page).toHaveURL(/\/tasks/);
  await expect(visibleText(page, "Task deleted")).toBeVisible();
});

test("a project's page lists its tasks and shows progress", async ({ page }) => {
  await signUpWithWorkspace(page);
  await page.goto("/projects/new");
  await field(page, "Project name").fill("Website (sample)");
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Website (sample)" })).toBeVisible();
  await expect(visibleText(page, "No tasks yet: add the first one above.")).toBeVisible();

  await quickAdd(page, "Design homepage (sample)");
  await quickAdd(page, "Write copy (sample)");
  await expect(page.getByRole("progressbar", { name: "Tasks done" })).toHaveAttribute(
    "aria-valuetext",
    "0 of 2 tasks done",
  );
  await page.getByRole("checkbox", { name: "Design homepage (sample): not done" }).check();
  await expect(page.getByRole("progressbar", { name: "Tasks done" })).toHaveAttribute(
    "aria-valuetext",
    "1 of 2 tasks done",
  );

  // The projects list shows it too, and the tasks list knows the project.
  await page.goto("/projects");
  await expect(visibleText(page, "1 of 2 tasks done")).toBeVisible();
  await page.goto("/tasks");
  await expect(visibleText(page, "Website (sample)").first()).toBeVisible();
});

test("another workspace's task is not found", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  try {
    await signUpWithWorkspace(pageA, "Alpha (sample)");
    await signUpWithWorkspace(pageB, "Bravo (sample)");
    await pageA.goto("/tasks");
    await quickAdd(pageA, "Alpha's secret task (sample)");
    await taskTitles(pageA).first().click();
    await expect(pageA.getByRole("heading", { level: 1 })).toHaveText(
      "Alpha's secret task (sample)",
    );
    const url = pageA.url().split("?")[0]!;

    await pageB.goto(url);
    await expect(pageB.getByRole("heading", { level: 1 })).toHaveText("Page not found");
    await expect(pageB.getByText("Alpha's secret task")).toHaveCount(0);
    await pageB.goto("/tasks");
    await expect(visibleText(pageB, "Nothing to do")).toBeVisible();
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`accessibility (${colorScheme})`, () => {
    test.use({ colorScheme });

    test("axe finds no problems on the task pages", async ({ page }) => {
      await signUpWithWorkspace(page);
      await page.goto("/tasks");
      await page.getByRole("button", { name: "Add task" }).click();
      await expect(visibleText(page, "Enter what needs doing.")).toBeVisible();
      await expectNoAxeViolations(page);
      await quickAdd(page, "Call Karim (sample)", { due: "2020-01-15", priority: "HIGH" });
      await quickAdd(page, "Write the brief (sample)");
      await page.getByRole("checkbox", { name: "Write the brief (sample): not done" }).check();
      await page.goto("/tasks?status=all");
      await expectNoAxeViolations(page);
      await taskTitles(page).first().click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoAxeViolations(page);
    });
  });
}
