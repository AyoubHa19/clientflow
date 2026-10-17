import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations, signUpWithWorkspace } from "./helpers";

const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });

async function addClient(page: Page, name: string) {
  await page.goto("/clients/new");
  await field(page, "Name").fill(name);
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test("search finds records from anywhere, by keyboard or by click", async ({ page }) => {
  await signUpWithWorkspace(page);
  await addClient(page, "Atlas Café (sample)");
  await addClient(page, "Nour Architects (sample)");

  // Ctrl+K opens it from any page.
  await page.goto("/tasks");
  await expect(page.getByRole("heading", { level: 1, name: "Tasks" })).toBeVisible();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search the workspace" });
  const box = dialog.getByRole("combobox", { name: "Search" });
  await expect(box).toBeFocused();

  await box.fill("atlas");
  const options = dialog.getByRole("option");
  await expect(options).toHaveCount(1);
  await expect(options.first()).toContainText("Atlas Café (sample)");
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Atlas Café (sample)" })).toBeVisible();
  await expect(dialog).toBeHidden();

  // The search bar opens it too; nothing found says so.
  await page.getByRole("button", { name: /Search clients, leads, projects/ }).click();
  await box.fill("zzz-nothing");
  await expect(dialog.getByRole("status")).toHaveText("Nothing matches “zzz-nothing”.");
  await box.fill("nour");
  await dialog.getByRole("option", { name: /Nour Architects/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Nour Architects (sample)" }),
  ).toBeVisible();

  // Escape closes it.
  await page.keyboard.press("Control+k");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`axe finds no problems on the glass dashboard and the open search (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await signUpWithWorkspace(page);
    await addClient(page, "Atlas Café (sample)");
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Search the workspace" });
    await dialog.getByRole("combobox", { name: "Search" }).fill("atlas");
    await expect(dialog.getByRole("option")).toHaveCount(1);
    await expectNoAxeViolations(page);
  });
}
