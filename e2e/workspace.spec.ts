import { expect, test, type Page } from "@playwright/test";
import {
  expectNoAxeViolations,
  isPhone,
  newTestUser,
  signUpViaApi,
  signUpWithWorkspace,
} from "./helpers";

const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });

/** Checks the workspace name under the logo (side bar, or the phone menu). */
async function expectWorkspaceName(page: Page, name: string) {
  const phone = isPhone(page);
  if (phone) await page.getByRole("button", { name: "Open menu" }).click();
  const scope = phone ? page.getByRole("dialog") : page.locator("aside");
  await expect(scope.locator("p").filter({ hasText: /^Workspace:/ })).toHaveText(
    `Workspace: ${name}`,
  );
  if (phone) await page.keyboard.press("Escape");
}

test("a new account names its workspace, then sees it", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  const user = newTestUser();
  await page.goto("/sign-up");
  await field(page, "Name").fill(user.name);
  await field(page, "Email").fill(user.email);
  await field(page, "Password").fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByText("Step 2 of 2")).toBeVisible();
  // The browser's own time zone is picked (Playwright runs in UTC here, or
  // whatever the machine uses): it must be one of the options.
  const zone = await page.locator("select[name=timezone]").inputValue();
  expect(zone).not.toBe("");

  await field(page, "Workspace name").fill("Atlas Studio (sample)");
  await page.getByRole("button", { name: "Create workspace" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Here's what's happening in Atlas Studio (sample).")).toBeVisible();
  await expectWorkspaceName(page, "Atlas Studio (sample)");
});

test("onboarding explains a missing name and keeps the time zone", async ({ page }) => {
  await signUpViaApi(page);
  await page.goto("/onboarding");
  await page.locator("select[name=timezone]").selectOption("Asia/Tokyo");
  await page.getByRole("button", { name: "Create workspace" }).click();

  await expect(page.getByText("Enter a name for your workspace.")).toBeVisible();
  await expect(field(page, "Workspace name")).toBeFocused();
  await expect(page.locator("select[name=timezone]")).toHaveValue("Asia/Tokyo");
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("people without a workspace are sent to onboarding, and back once done", async ({ page }) => {
  await signUpViaApi(page);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/onboarding$/);

  await field(page, "Workspace name").fill("Done Studio (sample)");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/onboarding");
  await expect(page).toHaveURL("/");
});

test("the owner renames the workspace and the frame follows", async ({ page }) => {
  await signUpWithWorkspace(page, "Before (sample)");
  await page.goto("/settings");
  await expect(page.getByText("Owner", { exact: true })).toBeVisible();

  await field(page, "Workspace name").fill("After (sample)");
  await page.locator("select[name=timezone]").selectOption("Europe/Paris");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByText("Workspace settings saved")).toBeVisible();
  await expectWorkspaceName(page, "After (sample)");

  await page.reload();
  await expect(field(page, "Workspace name")).toHaveValue("After (sample)");
  await expect(page.locator("select[name=timezone]")).toHaveValue("Europe/Paris");
});

test("settings explain a name that is too long", async ({ page }) => {
  await signUpWithWorkspace(page);
  await page.goto("/settings");
  // The field stops at 100 characters; the server checks too, so send more
  // by removing that limit first, as a tampered request could.
  const name = field(page, "Workspace name");
  await name.evaluate((input) => input.removeAttribute("maxlength"));
  await name.fill("x".repeat(101));
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Use 100 characters or fewer.")).toBeVisible();
});

test("two people never see each other's workspace", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  try {
    await signUpWithWorkspace(pageA, "Alpha Studio (sample)");
    await signUpWithWorkspace(pageB, "Bravo Studio (sample)");

    await pageA.goto("/settings");
    await pageB.goto("/settings");
    await expect(field(pageA, "Workspace name")).toHaveValue("Alpha Studio (sample)");
    await expect(field(pageB, "Workspace name")).toHaveValue("Bravo Studio (sample)");
    await expect(pageB.getByText("Alpha Studio (sample)")).toHaveCount(0);
    await expect(pageA.getByText("Bravo Studio (sample)")).toHaveCount(0);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`accessibility (${colorScheme})`, () => {
    test.use({ colorScheme });

    test("axe finds no problems on onboarding, with an error showing", async ({ page }) => {
      await signUpViaApi(page);
      await page.goto("/onboarding");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoAxeViolations(page);
      await page.getByRole("button", { name: "Create workspace" }).click();
      await expect(page.getByText("Enter a name for your workspace.")).toBeVisible();
      await expectNoAxeViolations(page);
    });
  });
}
