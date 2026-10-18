import { expect, test } from "@playwright/test";

// Stage 19: ClientFlow can be installed like an app, and shows an offline
// page when the connection drops. The browser tests run a production build,
// where the service worker is registered.

test("the manifest and its icons are served, and Chrome finds the app installable", async ({
  page,
  request,
}) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: "ClientFlow",
    display: "standalone",
    start_url: "/today",
  });
  for (const icon of manifest.icons as { src: string }[]) {
    const image = await request.get(icon.src);
    expect(image.ok(), icon.src).toBe(true);
    expect(image.headers()["content-type"]).toBe("image/png");
  }

  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Chrome's own check (the one behind its "Install app" button).
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  expect(installabilityErrors).toEqual([]);
});

test("with no connection, opening a page shows the offline page", async ({ page, context }) => {
  await page.goto("/sign-in");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // The worker takes over this page once it's active; reload so it does.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.goto("/sign-up").catch(() => {});
  await expect(page.getByRole("heading", { level: 1, name: "You're offline" })).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Create your account" })).toBeVisible();
});
