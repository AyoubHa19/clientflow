import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations, signUpWithWorkspace } from "./helpers";

// Stage 16: the owner shares a project's status page; the client opens it
// without an account.

const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });

test("a project's status page: shared, opened without an account, then switched off", async ({
  page,
  browser,
}) => {
  await signUpWithWorkspace(page);
  await page.goto("/projects/new");
  await field(page, "Project name").fill("Brand book (sample)");
  // The currency in the label follows the browser's time zone.
  await page
    .getByLabel(/^Fee in [A-Z]{3} \(optional\)$/)
    .filter({ visible: true })
    .fill("4200");
  await field(page, "Description (optional)").fill("Internal: keep the budget tight");
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Brand book (sample)" })).toBeVisible();

  const main = page.getByRole("main");
  await main.getByRole("button", { name: "Create a link" }).click();
  const link = main.getByLabel("Link for your client");
  await expect(link).toHaveValue(/\/status\/[A-Za-z0-9_-]{43}$/);
  const url = await link.inputValue();

  // The client: a fresh browser, never signed in.
  const client = await browser.newContext();
  const view = await client.newPage();
  const response = await view.goto(url);
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(view.getByRole("heading", { level: 1, name: "Brand book (sample)" })).toBeVisible();
  await expect(view.getByText("No tasks yet")).toBeVisible();
  await expect(view.getByText("4,200")).toHaveCount(0);
  await expect(view.getByText("Internal: keep the budget tight")).toHaveCount(0);
  await expectNoAxeViolations(view);

  // Switched off: the same link now says it doesn't work.
  await main.getByRole("button", { name: "Stop sharing" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Stop sharing" }).click();
  await expect(main.getByRole("button", { name: "Create a link" })).toBeVisible();
  await view.goto(url);
  await expect(
    view.getByRole("heading", { level: 1, name: "This link doesn't work" }),
  ).toBeVisible();
  await client.close();
});
