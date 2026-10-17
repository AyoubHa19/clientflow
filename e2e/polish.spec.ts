import { expect, test, type Page } from "@playwright/test";
import {
  expectNoAxeViolations,
  isPhone,
  openFilters,
  openQuickAddOptions,
  signUpWithWorkspace,
} from "./helpers";

const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });

const main = (page: Page) => page.locator("main").filter({ visible: true });

async function addClient(page: Page, name: string) {
  await page.goto("/clients/new");
  await field(page, "Name").fill(name);
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test("filters fold away on phones and show how many are set", async ({ page }) => {
  await signUpWithWorkspace(page);
  await page.goto("/tasks");
  const filters = page.getByRole("search", { name: "Find tasks" });
  const toggle = filters.getByRole("button", { name: /^Filters/ });
  const due = filters.getByLabel("Due", { exact: true });

  if (isPhone(page)) {
    // Only the search shows until the filters are opened.
    await expect(filters.getByLabel("Search", { exact: true })).toBeVisible();
    await expect(due).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(due).toBeVisible();
  } else {
    // Wide screens: everything in one row, no button.
    await expect(toggle).toBeHidden();
    await expect(due).toBeVisible();
  }

  await due.selectOption("overdue");
  await filters.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/due=overdue/);
  if (isPhone(page)) {
    await expect(filters.getByRole("button", { name: "Filters (1 set)" })).toBeVisible();
  }

  // The quick add's extras fold the same way.
  const quickAdd = page.getByRole("form", { name: "Add a task" });
  if (isPhone(page)) await expect(quickAdd.getByLabel("Priority", { exact: true })).toBeHidden();
  await openQuickAddOptions(quickAdd);
  await expect(quickAdd.getByLabel("Priority", { exact: true })).toBeVisible();
});

test("leaving a form with unsaved changes asks first", async ({ page }) => {
  await signUpWithWorkspace(page);
  const dialogs: string[] = [];
  let answer = false;
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await (answer ? dialog.accept() : dialog.dismiss());
  });

  // An untouched form leaves without asking.
  await page.goto("/clients/new");
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page).toHaveURL("/clients");
  expect(dialogs).toEqual([]);

  // Typed something: "Cancel" asks; saying no stays, with the text kept.
  await page.goto("/clients/new");
  await field(page, "Email (optional)").fill("hello@example.com");
  await page.getByRole("link", { name: "Cancel" }).click();
  expect(dialogs).toEqual(["Leave this page? Your changes haven't been saved."]);
  await expect(page).toHaveURL("/clients/new");
  await expect(field(page, "Email (optional)")).toHaveValue("hello@example.com");

  // A save that fails (no name) keeps the guard on.
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(field(page, "Name")).toBeFocused();
  await page.getByRole("link", { name: "Cancel" }).click();
  expect(dialogs).toHaveLength(2);
  await expect(page).toHaveURL("/clients/new");

  // A save that works moves on without asking.
  await field(page, "Name").fill("Atlas Café (sample)");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Atlas Café (sample)" })).toBeVisible();
  expect(dialogs).toHaveLength(2);

  // Saying yes leaves.
  answer = true;
  await page.getByRole("link", { name: "Edit" }).click();
  await field(page, "Name").fill("Atlas Studio (sample)");
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Atlas Café (sample)" })).toBeVisible();
  expect(dialogs).toHaveLength(3);
});

test("breadcrumbs lead back to the list as it was left", async ({ page }) => {
  await signUpWithWorkspace(page);
  await addClient(page, "Atlas Café (sample)");

  await page.goto("/clients?status=all&sort=name");
  await main(page)
    .getByRole("link", { name: "Atlas Café (sample)" })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveTitle("Atlas Café (sample) · ClientFlow");

  const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(crumbs.getByRole("listitem")).toHaveText(["Clients", "Atlas Café (sample)"]);
  await expect(crumbs.getByText("Atlas Café (sample)")).toHaveAttribute("aria-current", "page");

  // The edit page: one more level, and its own tab title.
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveTitle("Edit Atlas Café (sample) · ClientFlow");
  await expect(crumbs.getByRole("listitem")).toHaveText(["Clients", "Atlas Café (sample)", "Edit"]);
  await crumbs.getByRole("link", { name: "Atlas Café (sample)" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Atlas Café (sample)" })).toBeVisible();

  await crumbs.getByRole("link", { name: "Clients" }).click();
  await expect(page).toHaveURL("/clients?status=all&sort=name");

  // A new-record page has them too.
  await page.goto("/projects/new");
  await expect(crumbs.getByRole("listitem")).toHaveText(["Projects", "New project"]);
});

test("pages slide in, unless reduced motion is asked for", async ({ page }) => {
  await signUpWithWorkspace(page);
  const duration = () =>
    main(page)
      .locator(":scope > div")
      .first()
      .evaluate((element) => parseFloat(getComputedStyle(element).animationDuration));

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/activity");
  expect(await duration()).toBeCloseTo(0.2);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  expect(await duration()).toBeLessThan(0.001);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`axe finds no problems with filters and extras open, and on breadcrumbs (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await signUpWithWorkspace(page);
    await addClient(page, "Atlas Café (sample)");
    await expectNoAxeViolations(page);

    await page.goto("/tasks?due=overdue");
    await openFilters(page);
    await openQuickAddOptions(page.getByRole("form", { name: "Add a task" }));
    await expect(page.getByLabel("Due", { exact: true }).filter({ visible: true })).toBeVisible();
    await expectNoAxeViolations(page);
  });
}
