import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations, isPhone, openFilters, signUpWithWorkspace } from "./helpers";

const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });

const visibleText = (page: Page, text: string | RegExp) =>
  page.getByText(text).filter({ visible: true });

async function addClient(page: Page, name: string) {
  await page.goto("/clients/new");
  await field(page, "Name").fill(name);
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

async function addProject(
  page: Page,
  name: string,
  extra: { client?: string; start?: string; due?: string; status?: string } = {},
) {
  await page.goto("/projects/new");
  await field(page, "Project name").fill(name);
  if (extra.client) await field(page, "Client").selectOption({ label: extra.client });
  if (extra.status) await field(page, "Status").selectOption(extra.status);
  if (extra.start) await field(page, "Start date (optional)").fill(extra.start);
  if (extra.due) await field(page, "Due date (optional)").fill(extra.due);
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test("add a project for a client, with dates, then edit and complete it", async ({ page }) => {
  await signUpWithWorkspace(page);
  await addClient(page, "Atlas Café (sample)");

  // The form checks the dates on the server and keeps what was typed.
  await page.goto("/projects/new");
  await field(page, "Project name").fill("Menu design (sample)");
  await field(page, "Client").selectOption({ label: "Atlas Café (sample)" });
  await field(page, "Start date (optional)").fill("2026-11-10");
  await field(page, "Due date (optional)").fill("2026-11-01");
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(visibleText(page, "The due date can't be before the start date.")).toBeVisible();
  await expect(field(page, "Due date (optional)")).toBeFocused();
  await expect(field(page, "Client")).toHaveValue(/.+/);

  // A due date long past: overdue.
  await field(page, "Start date (optional)").fill("2020-01-01");
  await field(page, "Due date (optional)").fill("2020-01-15");
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Menu design (sample)" })).toBeVisible();
  await expect(visibleText(page, "Project added")).toBeVisible();
  await expect(visibleText(page, /Overdue by \d+ days/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Atlas Café (sample)" })).toBeVisible();

  // Edit: a far due date, no badge.
  await page.getByRole("link", { name: "Edit" }).click();
  await field(page, "Due date (optional)").fill("2099-12-31");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(visibleText(page, "Changes saved")).toBeVisible();
  await expect(visibleText(page, "31 Dec 2099")).toBeVisible();
  await expect(visibleText(page, /Overdue/)).toHaveCount(0);

  // Complete it: it leaves the open list.
  await field(page, "Status").selectOption("COMPLETED");
  await expect(visibleText(page, "Marked completed")).toBeVisible();
  await page.goto("/projects");
  await expect(visibleText(page, "No open projects")).toBeVisible();
  await page.goto("/projects?status=completed");
  await expect(visibleText(page, "Menu design (sample)")).toBeVisible();

  // The client's page lists it.
  await page.getByRole("main").getByRole("link", { name: "Menu design (sample)" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Menu design (sample)" })).toBeVisible();
  await page.getByRole("link", { name: "Atlas Café (sample)" }).click();
  await expect(page).toHaveURL(/\/clients\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { level: 2, name: "Projects" })).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Menu design (sample)" }).first(),
  ).toBeVisible();
});

test("a client's page starts a project for that client", async ({ page }) => {
  await signUpWithWorkspace(page);
  await addClient(page, "Nour Architects (sample)");
  await page.getByRole("link", { name: "New project" }).click();
  await expect(field(page, "Client")).toHaveValue(/.+/);
  await field(page, "Project name").fill("Office plans (sample)");
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.getByRole("link", { name: "Nour Architects (sample)" })).toBeVisible();
});

test("the list filters by client and sorts by due date", async ({ page }) => {
  await signUpWithWorkspace(page);
  await addClient(page, "Atlas Café (sample)");
  await addProject(page, "Later (sample)", { client: "Atlas Café (sample)", due: "2099-06-01" });
  await addProject(page, "Sooner (sample)", { client: "Atlas Café (sample)", due: "2099-01-01" });
  await addProject(page, "Undated (sample)");

  await page.goto("/projects");
  const names = page.locator("main table tbody td:first-child a").filter({ visible: true });
  const cards = page.locator("main ul > li a .truncate.font-medium").filter({ visible: true });
  const listed = isPhone(page) ? cards : names;
  await expect(listed).toHaveText(["Sooner (sample)", "Later (sample)", "Undated (sample)"]);

  await openFilters(page);
  await field(page, "Client").selectOption("none");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/client=none/);
  await expect(listed).toHaveText(["Undated (sample)"]);

  await page.goto("/projects?q=atlas");
  await expect(listed).toHaveText(["Sooner (sample)", "Later (sample)"]);
});

test("another workspace's project is not found", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  try {
    await signUpWithWorkspace(pageA, "Alpha (sample)");
    await signUpWithWorkspace(pageB, "Bravo (sample)");
    await addProject(pageA, "Alpha's secret project (sample)");
    const url = pageA.url().split("?")[0]!;

    for (const path of [url, `${url}/edit`]) {
      await pageB.goto(path);
      await expect(pageB.getByRole("heading", { level: 1 })).toHaveText("Page not found");
      await expect(pageB.getByText("Alpha's secret project")).toHaveCount(0);
    }
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`accessibility (${colorScheme})`, () => {
    test.use({ colorScheme });

    test("axe finds no problems on the project pages", async ({ page }) => {
      await signUpWithWorkspace(page);
      await page.goto("/projects");
      await expectNoAxeViolations(page);
      await page.goto("/projects/new");
      await page.getByRole("button", { name: "Add project" }).click();
      await expect(visibleText(page, "Enter a project name.")).toBeVisible();
      await expectNoAxeViolations(page);
      await addProject(page, "Website (sample)", { due: "2020-01-15" });
      await expectNoAxeViolations(page);
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expectNoAxeViolations(page);
      await page.getByRole("dialog").getByRole("button", { name: "Delete project" }).click();
      await expect(page).toHaveURL(/\/projects$/);
      await expect(visibleText(page, "Project deleted")).toBeVisible();
    });
  });
}
