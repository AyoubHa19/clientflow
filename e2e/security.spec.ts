import { expect, test, type Page } from "@playwright/test";
import { newTestUser, signUpViaApi, signUpWithWorkspace } from "./helpers";

const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });

test("every page is sent with the security headers", async ({ page }) => {
  const response = await page.goto("/sign-in");
  const headers = response!.headers();

  const csp = headers["content-security-policy"] ?? "";
  for (const directive of [
    "default-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]) {
    expect(csp).toContain(directive);
  }
  // No outside scripts, and no eval in production.
  expect(csp).toMatch(/script-src 'self' 'unsafe-inline'(;|$)/);
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
  // HSTS only when served over HTTPS; this test server is plain http.
  expect(headers["strict-transport-security"]).toBeUndefined();
});

test("the policy blocks nothing the app itself needs", async ({ page }) => {
  const blocked: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) blocked.push(message.text());
  });
  await signUpWithWorkspace(page);
  for (const path of ["/", "/clients", "/leads", "/projects", "/tasks", "/settings"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  }
  // The theme script (inline) still runs: the page follows a dark system theme.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(blocked).toEqual([]);
});

test("signing in never sends people to another site", async ({ page, context }) => {
  const user = await signUpViaApi(page, newTestUser());
  await context.clearCookies();

  // Browsers drop the tab (%09), which would turn "/\t/evil.example" into
  // "//evil.example": another site.
  await page.goto("/sign-in?next=%2F%09%2Fevil.example");
  await field(page, "Email").fill(user.email);
  await field(page, "Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Back to the app (no workspace yet, so onboarding), never evil.example.
  await expect(page).toHaveURL(/\/onboarding$/);
  expect(new URL(page.url()).hostname).toBe("localhost");
});

test("passwords could never end up in an address", async ({ page }) => {
  for (const path of ["/sign-in", "/sign-up"]) {
    await page.goto(path);
    const form = page.locator("form").filter({ has: page.getByLabel("Password", { exact: true }) });
    // Posted, never a GET form (which would put the fields in the URL)...
    await expect(form).toHaveAttribute("method", "post");
    // ...and its button only works once the page's JavaScript is running.
    await expect(form.getByRole("button", { name: /Sign in|Create account/ })).toBeEnabled();
  }
});

test("sign-up refuses a name with a null character, with a clear answer", async ({ page }) => {
  await page.goto("/sign-in");
  const user = newTestUser();
  const response = await page.request.post("/api/auth/sign-up/email", {
    data: { ...user, name: "Sara\u0000 (sample)" },
    headers: { origin: new URL(page.url()).origin },
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({ code: "INVALID_SIGN_UP" });
});

test("odd characters in an address show the page, not an error", async ({ page }) => {
  await signUpWithWorkspace(page);
  for (const [path, heading] of [
    ["/clients?q=Atlas%00", "Clients"],
    ["/leads?view=list&q=%00&source=%00", "Leads"],
    ["/projects?q=%00", "Projects"],
    ["/tasks?q=%00", "Tasks"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
  }
});
