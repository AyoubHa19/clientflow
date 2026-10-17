import { expect, test, type Page } from "@playwright/test";
import { addClientsFor } from "./db";
import { expectNoAxeViolations, isPhone, signUpWithWorkspace } from "./helpers";

const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });

/** The clients shown in the list (table on desktop, cards on phones). */
const listedNames = (page: Page) =>
  isPhone(page)
    ? page.locator("main ul > li a .truncate.font-medium").filter({ visible: true })
    : page.locator("main table tbody td:first-child a").filter({ visible: true });

async function addClient(
  page: Page,
  name: string,
  extra: { email?: string; company?: string } = {},
) {
  await page.goto("/clients/new");
  await field(page, "Name").fill(name);
  if (extra.email) await field(page, "Email (optional)").fill(extra.email);
  if (extra.company) await field(page, "Company (optional)").fill(extra.company);
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test("add, find, edit, archive, restore and delete a client", async ({ page }) => {
  await signUpWithWorkspace(page);
  await page.goto("/clients");
  await expect(page.getByText("No clients yet")).toBeVisible();

  // Add: the form checks the email on the server and keeps what was typed.
  await page.getByRole("link", { name: "New client" }).click();
  await field(page, "Name").fill("Atlas Café (sample)");
  await field(page, "Email (optional)").fill("not-an-email");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByText("Enter a valid email address, or leave it empty.")).toBeVisible();
  await expect(field(page, "Name")).toHaveValue("Atlas Café (sample)");
  await expect(field(page, "Email (optional)")).toBeFocused();
  await field(page, "Email (optional)").fill("hello@atlas.example");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Atlas Café (sample)" })).toBeVisible();
  await expect(page.getByText("Client added")).toBeVisible();

  await addClient(page, "Nour Architects (sample)", { company: "Nour SARL" });

  // Search by company, any case.
  await page.goto("/clients");
  // Enter searches (the Apply button is folded away on phones).
  await field(page, "Search").fill("nour sarl");
  await field(page, "Search").press("Enter");
  await expect(page).toHaveURL(/q=nour\+sarl/);
  await expect(listedNames(page)).toHaveText(["Nour Architects (sample)"]);

  // Edit.
  await listedNames(page).first().click();
  await page.getByRole("link", { name: "Edit" }).click();
  await field(page, "Name").fill("Nour Studio (sample)");
  await field(page, "Status").selectOption("INACTIVE");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Nour Studio (sample)" })).toBeVisible();
  await expect(page.getByText("Inactive", { exact: true }).filter({ visible: true })).toBeVisible();

  // Archive: gone from the usual list, there under "Archived".
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Client archived")).toBeVisible();
  await page.goto("/clients");
  await expect(listedNames(page)).toHaveText(["Atlas Café (sample)"]);
  await page.goto("/clients?status=archived");
  await expect(listedNames(page)).toHaveText(["Nour Studio (sample)"]);

  // Restore.
  await listedNames(page).first().click();
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByText("Client restored")).toBeVisible();
  await expect(page.getByText("Active", { exact: true }).filter({ visible: true })).toBeVisible();

  // Delete, after confirming.
  await page.getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Delete Nour Studio (sample)?" })).toBeVisible();
  await dialog.getByRole("button", { name: "Delete client" }).click();
  await expect(page).toHaveURL(/\/clients$/);
  await expect(page.getByText("Client deleted")).toBeVisible();
  await expect(listedNames(page)).toHaveText(["Atlas Café (sample)"]);
});

test("the list pages through many clients and sorts by name", async ({ page }) => {
  const user = await signUpWithWorkspace(page);
  const names = Array.from(
    { length: 25 },
    (_, n) => `Client ${String(n + 1).padStart(2, "0")} (sample)`,
  );
  await addClientsFor(user.email, names);

  await page.goto("/clients?sort=name");
  await expect(listedNames(page)).toHaveCount(20);
  await expect(listedNames(page).first()).toHaveText("Client 01 (sample)");
  await expect(page.getByText("1–20 of 25 clients")).toBeVisible();

  await page.getByRole("link", { name: "Next", exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(listedNames(page)).toHaveCount(5);
  await expect(page.getByText("21–25 of 25 clients")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next", exact: true }).filter({ visible: true }),
  ).toBeDisabled();
});

test("a search with no results offers to clear it", async ({ page }) => {
  await signUpWithWorkspace(page);
  await addClient(page, "Atlas Café (sample)");
  await page.goto("/clients?q=nothing-like-this");
  await expect(page.getByText("No clients match")).toBeVisible();
  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(listedNames(page)).toHaveText(["Atlas Café (sample)"]);
});

test("another workspace's client is simply not found", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  try {
    await signUpWithWorkspace(pageA, "Alpha (sample)");
    await signUpWithWorkspace(pageB, "Bravo (sample)");
    await addClient(pageA, "Alpha's secret client (sample)");
    // Without ?notice=…, which the page adds after a save.
    const clientUrl = pageA.url().split("?")[0]!;

    // The page streams, so the status is already sent as 200 when the
    // server finds out; what matters is that nothing of A's shows, and the
    // page tells search engines not to index it.
    for (const path of [clientUrl, `${clientUrl}/edit`]) {
      await pageB.goto(path);
      await expect(pageB.getByRole("heading", { level: 1 })).toHaveText("Page not found");
      await expect(pageB.locator('meta[name="robots"]').first()).toHaveAttribute(
        "content",
        "noindex",
      );
      await expect(pageB.getByText("Alpha's secret client")).toHaveCount(0);
    }
    await pageB.goto("/clients?status=all");
    await expect(pageB.getByText("No clients")).toBeVisible();

    // A malformed id is not found either.
    await pageB.goto("/clients/not-a-real-id");
    await expect(pageB.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`accessibility (${colorScheme})`, () => {
    test.use({ colorScheme });

    test("axe finds no problems on the client pages", async ({ page }) => {
      await signUpWithWorkspace(page);
      await page.goto("/clients");
      await expectNoAxeViolations(page);

      await page.goto("/clients/new");
      await page.getByRole("button", { name: "Add client" }).click();
      await expect(page.getByText("Enter the client's name.")).toBeVisible();
      await expectNoAxeViolations(page);

      await addClient(page, "Atlas Café (sample)", { email: "hello@atlas.example" });
      await expectNoAxeViolations(page);
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expectNoAxeViolations(page);
      await page.keyboard.press("Escape");
      await page.goto("/clients");
      await expect(listedNames(page)).toHaveCount(1);
      await expectNoAxeViolations(page);
    });
  });
}
