import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test("the overview opens inside the shell", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("ClientFlow");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome to ClientFlow");

  if (isPhone(page)) {
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog");
    await expect(menu.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  } else {
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
});

test("the skip link moves focus to the page", async ({ page }) => {
  test.skip(isPhone(page), "Keyboard test, desktop only");
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("the theme can be changed and is remembered", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole("button", { name: "Change theme" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(html).toHaveClass(/dark/);

  await page.reload();
  await expect(html).toHaveClass(/dark/);

  await page.getByRole("button", { name: "Change theme" }).click();
  await expect(page.getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByRole("menuitemradio", { name: "System" }).click();
  await expect(html).not.toHaveClass(/dark/);
});

test("the system theme is followed by default", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("an unknown page shows the not-found page", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await page.getByRole("link", { name: "Back to ClientFlow" }).click();
  await expect(page).toHaveURL("/");
});

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`accessibility (${colorScheme})`, () => {
    test.use({ colorScheme });

    for (const path of ["/", "/design", "/no-such-page"]) {
      test(`axe finds no problems on ${path}`, async ({ page }) => {
        await page.goto(path);
        await expectNoAxeViolations(page);
      });
    }

    test("axe finds no problems in the open dialog", async ({ page }) => {
      await page.goto("/design");
      await page.getByRole("button", { name: "Open a dialog" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expectNoAxeViolations(page);
    });
  });
}
