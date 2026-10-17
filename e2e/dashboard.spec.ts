import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations, signUpWithWorkspace } from "./helpers";

const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });

const main = (page: Page) => page.locator("main").filter({ visible: true });

/** The number on one of the four cards at the top of the overview. */
const kpi = (page: Page, label: string) =>
  page
    .getByRole("region", { name: "Key numbers" })
    .locator(":scope > div")
    .filter({ has: page.getByRole("link", { name: label, exact: true }) })
    .locator("p");

/** A client, a lead, a project and an overdue task, added through the forms. */
async function addOneOfEach(page: Page) {
  await page.goto("/clients/new");
  await field(page, "Name").fill("Atlas Café (sample)");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Atlas Café (sample)" })).toBeVisible();

  await page.goto("/leads/new");
  await field(page, "Contact name").fill("Leila Haddad (sample)");
  await page.getByRole("button", { name: "Add lead" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Leila Haddad (sample)" }),
  ).toBeVisible();

  await page.goto("/projects/new");
  await field(page, "Project name").fill("Menu design (sample)");
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Menu design (sample)" })).toBeVisible();

  await page.goto("/tasks");
  const form = page.getByRole("form", { name: "Add a task" });
  await form.getByLabel("New task", { exact: true }).fill("Send proofs (sample)");
  await form.getByLabel("Due date", { exact: true }).fill("2020-01-15");
  await form.getByRole("button", { name: "Add task" }).click();
  await expect(form.getByLabel("New task", { exact: true })).toHaveValue("");
}

test("a new workspace starts with a checklist, then the numbers fill in", async ({ page }) => {
  await signUpWithWorkspace(page);
  await page.goto("/");

  const checklist = page.getByRole("region", { name: "Getting started" });
  await expect(checklist).toContainText("0 of 4 done");
  for (const label of ["Active clients", "Open leads", "Open projects", "Pending tasks"]) {
    await expect(kpi(page, label)).toHaveText("0");
  }
  await expect(main(page).getByText("Nothing due soon.")).toBeVisible();
  await expect(main(page).getByText("No leads yet.")).toBeVisible();
  await expect(main(page).getByText("Nothing yet: changes show up here.")).toBeVisible();

  // The checklist's first step opens the client form.
  await checklist.getByRole("link", { name: /Add your first client/ }).click();
  await expect(page).toHaveURL("/clients/new");

  await addOneOfEach(page);
  await page.goto("/");

  // Everything's started, so the checklist steps aside.
  await expect(kpi(page, "Active clients")).toHaveText("1");
  await expect(page.getByRole("region", { name: "Getting started" })).toHaveCount(0);
  await expect(kpi(page, "Open leads")).toHaveText("1");
  await expect(kpi(page, "Open projects")).toHaveText("1");
  await expect(kpi(page, "Pending tasks")).toHaveText("1");

  // The overdue task is listed under Coming up, with its badge.
  const comingUp = page.getByRole("region", { name: "Coming up" });
  await expect(comingUp.getByRole("link", { name: "Task: Send proofs (sample)" })).toBeVisible();
  await expect(comingUp.getByText(/Overdue by \d+ days/)).toBeVisible();

  // The funnel counts the new lead.
  const funnel = page.getByRole("region", { name: "Leads pipeline" });
  await expect(funnel).toContainText("1 lead in total");
  await expect(funnel).toContainText("Win rate shows once leads are won or lost.");

  // Recent activity, newest first.
  const activity = page.getByRole("region", { name: "Recent activity" });
  await expect(activity.getByRole("listitem").first()).toContainText(
    "Added task Send proofs (sample)",
  );
  await expect(activity.getByRole("listitem")).toHaveCount(4);

  // The cards open the matching lists.
  await page.getByRole("link", { name: "1 overdue" }).click();
  await expect(page).toHaveURL("/tasks?due=overdue");
  await page.goto("/");
  await page.getByRole("link", { name: "Active clients", exact: true }).click();
  await expect(page).toHaveURL("/clients?status=active");
});

test("the activity page lists every change and filters by type", async ({ page }) => {
  await signUpWithWorkspace(page);
  await page.goto("/activity");
  await expect(main(page).getByText("No activity yet")).toBeVisible();

  await addOneOfEach(page);
  await page.goto("/");
  await page.getByRole("link", { name: "See all" }).click();
  await expect(page).toHaveURL("/activity");
  await expect(page.getByRole("heading", { level: 1, name: "Activity" })).toBeVisible();
  await expect(main(page).getByText("1–4 of 4 changes")).toBeVisible();

  const types = page.getByRole("navigation", { name: "Activity types" });
  await types.getByRole("link", { name: "Leads" }).click();
  await expect(page).toHaveURL("/activity?type=lead");
  await expect(types.getByRole("link", { name: "Leads" })).toHaveAttribute("aria-current", "page");
  await expect(main(page).getByText("1–1 of 1 change")).toBeVisible();

  // Each entry links to its record while it exists.
  await main(page).getByRole("link", { name: "Added lead Leila Haddad (sample)" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Leila Haddad (sample)" }),
  ).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`axe finds no problems on the filled-in overview and activity (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await signUpWithWorkspace(page);
    await addOneOfEach(page);
    for (const path of ["/", "/activity"]) {
      await page.goto(path);
      await expect(main(page).getByText("Send proofs (sample)").first()).toBeVisible();
      await expectNoAxeViolations(page);
    }
  });
}
