import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations, isPhone, newTestUser, signUpViaApi } from "./helpers";

// With Cache Components, Next keeps the page you came from in the DOM,
// hidden, so look only at the visible copy of each field.
const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });

async function fillSignUp(page: Page, user: { name: string; email: string; password: string }) {
  await field(page, "Name").fill(user.name);
  await field(page, "Email").fill(user.email);
  await field(page, "Password").fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();
}

async function fillSignIn(page: Page, email: string, password: string) {
  await field(page, "Email").fill(email);
  await field(page, "Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function createWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/onboarding$/);
  await field(page, "Workspace name").fill("Tester Studio (sample)");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL("/");
}

async function signOut(page: Page) {
  // The side bar's account button on desktop, the top bar's on phones.
  await page
    .getByRole("button", { name: /^Account:/ })
    .filter({ visible: true })
    .click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
}

test("visitors are sent to sign in, then back where they were going", async ({ page }) => {
  const user = newTestUser();
  await page.goto("/sign-up");
  await fillSignUp(page, user);
  await createWorkspace(page);
  await signOut(page);

  await page.goto("/design");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdesign$/);
  await fillSignIn(page, user.email, user.password);
  await expect(page).toHaveURL(/\/design$/);
});

test("sign up, sign out and sign in again", async ({ page }) => {
  const user = newTestUser();
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByRole("link", { name: "Create an account" }).click();
  await fillSignUp(page, user);
  // A new account names its workspace first.
  await createWorkspace(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome, Sara");

  await signOut(page);
  // Signed out means signed out: the app sends you back.
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);

  await fillSignIn(page, user.email, user.password);
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome, Sara");
});

test("a wrong password gets one clear message", async ({ page }) => {
  const user = await signUpViaApi(page);
  await page.context().clearCookies();
  await page.goto("/sign-in");

  await fillSignIn(page, user.email, "not-the-password");
  await expect(page.getByRole("main").getByRole("alert").filter({ visible: true })).toHaveText(
    "Email or password is incorrect.",
  );
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("an email that already has an account is pointed to sign-in", async ({ page }) => {
  const user = await signUpViaApi(page);
  await page.context().clearCookies();
  await page.goto("/sign-up");

  await fillSignUp(page, { ...user, password: "another-password" });
  await expect(page.getByRole("main").getByRole("alert").filter({ visible: true })).toContainText(
    "already exists",
  );
});

test("the forms explain what's missing and focus it", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Enter your name.")).toBeVisible();
  await expect(page.getByText("Enter your email address.")).toBeVisible();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  await expect(field(page, "Name")).toBeFocused();
  await expect(field(page, "Name")).toHaveAttribute("aria-invalid", "true");
});

test("the password can be shown and hidden", async ({ page }) => {
  await page.goto("/sign-in");
  const password = field(page, "Password");
  await password.fill("secret-value");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
});

test("signed-in people skip the sign-in page", async ({ page }) => {
  await signUpViaApi(page);
  await page.goto("/sign-in");
  // Into the app, which first asks this new account for a workspace.
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("signed-out visitors to unknown pages are asked to sign in", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fno-such-page$/);
});

test("the sign-in form works with the keyboard alone", async ({ page }) => {
  test.skip(isPhone(page), "Keyboard test, desktop only");
  const user = await signUpViaApi(page);
  await page.context().clearCookies();
  await page.goto("/sign-in");

  await field(page, "Email").focus();
  await page.keyboard.type(user.email);
  await page.keyboard.press("Tab");
  await page.keyboard.type(user.password);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/onboarding$/);
});

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`accessibility (${colorScheme})`, () => {
    test.use({ colorScheme });

    for (const path of ["/sign-in", "/sign-up"]) {
      test(`axe finds no problems on ${path}, with errors showing`, async ({ page }) => {
        await page.goto(path);
        await expectNoAxeViolations(page);
        await page.getByRole("button", { name: /^(Sign in|Create account)$/ }).click();
        await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
        await expectNoAxeViolations(page);
      });
    }
  });
}
