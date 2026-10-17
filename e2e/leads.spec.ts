import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations, isPhone, openFilters, signUpWithWorkspace } from "./helpers";

const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });

/** Waits until the board has saved every move. */
const saved = (page: Page) =>
  expect(page.locator("[data-board]")).toHaveAttribute("aria-busy", "false");

const column = (page: Page, status: string) => page.locator(`[data-status="${status}"]`);

/** The names of the cards in a board column. */
const cardsIn = (page: Page, status: string) => column(page, status).locator("li a");

async function addLead(page: Page, name: string, extra: { email?: string; source?: string } = {}) {
  await page.goto("/leads/new");
  await field(page, "Contact name").fill(name);
  if (extra.email) await field(page, "Email (optional)").fill(extra.email);
  if (extra.source) await field(page, "Source (optional)").fill(extra.source);
  await page.getByRole("button", { name: "Add lead" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test("leads move along the board by menu, keyboard and mouse", async ({ page }) => {
  await signUpWithWorkspace(page);
  await page.goto("/leads");
  await expect(page.getByText("No leads yet")).toBeVisible();

  await addLead(page, "Leila Haddad (sample)", { source: "Instagram" });
  await page.goto("/leads");
  await expect(cardsIn(page, "NEW")).toHaveText(["Leila Haddad (sample)"]);

  // The menu: no dragging needed.
  await page.getByRole("button", { name: "Move Leila Haddad (sample)" }).click();
  await page.getByRole("menuitemradio", { name: "Contacted" }).click();
  await expect(cardsIn(page, "CONTACTED")).toHaveText(["Leila Haddad (sample)"]);
  await expect(cardsIn(page, "NEW")).toHaveCount(0);
  await saved(page);

  // Keyboard and mouse are desktop things; phones use the menu above.
  if (isPhone(page)) return;

  // The keyboard: pick up, two columns right, drop.
  await page.getByRole("button", { name: "Drag Leila Haddad (sample)" }).focus();
  // Waiting for each announcement, as a person hearing them would.
  const live = page.getByRole("status");
  await page.keyboard.press("Space");
  await expect(live.filter({ hasText: "is over Contacted." })).toHaveCount(1);
  await page.keyboard.press("ArrowRight");
  await expect(live.filter({ hasText: "is over Qualified." })).toHaveCount(1);
  await page.keyboard.press("ArrowRight");
  await expect(live.filter({ hasText: "Leila Haddad (sample) is over Won." })).toHaveCount(1);
  await page.keyboard.press("Space");
  await expect(cardsIn(page, "WON")).toHaveText(["Leila Haddad (sample)"]);
  await saved(page);

  // The mouse: drag the handle onto the Lost column.
  {
    const handle = page.getByRole("button", { name: "Drag Leila Haddad (sample)" });
    const target = column(page, "LOST");
    const from = (await handle.boundingBox())!;
    const to = (await target.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 30, from.y + 10, { steps: 5 });
    await page.mouse.move(to.x + to.width / 2, to.y + 80, { steps: 15 });
    await page.mouse.up();
    await expect(cardsIn(page, "LOST")).toHaveText(["Leila Haddad (sample)"]);
    await saved(page);
  }

  // Saved, in order: still in Lost after a reload.
  await page.reload();
  await expect(cardsIn(page, "LOST")).toHaveText(["Leila Haddad (sample)"]);
});

test("a lead becomes a client once", async ({ page }) => {
  await signUpWithWorkspace(page);
  await addLead(page, "Karim Benali (sample)", { email: "karim@riad.example" });

  await page.getByRole("button", { name: "Convert to client" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("A new client is created")).toBeVisible();
  await dialog.getByRole("button", { name: "Create client" }).click();

  await expect(page.getByText("Converted into a client")).toBeVisible();
  await expect(page.getByText("Won", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Convert to client" })).toHaveCount(0);

  // The client exists, and the lead links to it.
  await page.getByRole("link", { name: "Open Karim Benali (sample)" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Karim Benali (sample)" }),
  ).toBeVisible();
  await expect(page.getByText("karim@riad.example").filter({ visible: true })).toBeVisible();
  await page.goto("/clients");
  await expect(page.getByText("1–1 of 1 client")).toBeVisible();

  // On the board it is marked as a client and can't be dragged.
  await page.goto("/leads");
  await expect(column(page, "WON").getByText("Client")).toBeVisible();
  await expect(page.getByRole("button", { name: "Drag Karim Benali (sample)" })).toHaveCount(0);
});

test("converting links to an existing client with the same email", async ({ page }) => {
  await signUpWithWorkspace(page);
  await page.goto("/clients/new");
  await field(page, "Name").fill("Nour Architects (sample)");
  await field(page, "Email (optional)").fill("studio@nour.example");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Nour Architects (sample)" }),
  ).toBeVisible();

  await addLead(page, "Nour again (sample)", { email: "studio@nour.example" });
  await page.getByRole("button", { name: "Convert to client" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("radio", { name: /Link to Nour Architects/ })).toBeChecked();
  await dialog.getByRole("button", { name: "Link client" }).click();

  await expect(page.getByRole("link", { name: "Open Nour Architects (sample)" })).toBeVisible();
  await page.goto("/clients");
  await expect(page.getByText("1–1 of 1 client")).toBeVisible();
});

test("the list view filters by stage and source", async ({ page }) => {
  await signUpWithWorkspace(page);
  await addLead(page, "From Instagram (sample)", { source: "Instagram" });
  await addLead(page, "From an event (sample)", { source: "Event" });

  await page.goto("/leads");
  await page.getByRole("link", { name: "List" }).click();
  await expect(page).toHaveURL(/view=list/);
  await openFilters(page);
  await field(page, "Source").selectOption("Event");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(
    page.getByRole("main").getByText("From an event (sample)").filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByText("From Instagram (sample)").filter({ visible: true })).toHaveCount(0);

  await page.goto("/leads?view=list&status=won");
  await expect(page.getByText("No leads match")).toBeVisible();
});

test("another workspace's lead is not found", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  try {
    await signUpWithWorkspace(pageA, "Alpha (sample)");
    await signUpWithWorkspace(pageB, "Bravo (sample)");
    await addLead(pageA, "Alpha's secret lead (sample)");
    const leadUrl = pageA.url().split("?")[0]!;

    for (const path of [leadUrl, `${leadUrl}/edit`]) {
      await pageB.goto(path);
      await expect(pageB.getByRole("heading", { level: 1 })).toHaveText("Page not found");
      await expect(pageB.getByText("Alpha's secret lead")).toHaveCount(0);
    }
    await pageB.goto("/leads");
    await expect(pageB.getByText("No leads yet")).toBeVisible();
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`accessibility (${colorScheme})`, () => {
    test.use({ colorScheme });

    test("axe finds no problems on the lead pages", async ({ page }) => {
      await signUpWithWorkspace(page);
      await page.goto("/leads/new");
      await page.getByRole("button", { name: "Add lead" }).click();
      await expect(page.getByText("Enter the contact's name.")).toBeVisible();
      await expectNoAxeViolations(page);

      await addLead(page, "Leila Haddad (sample)", { email: "leila@example.com" });
      await expectNoAxeViolations(page);
      await page.getByRole("button", { name: "Convert to client" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expectNoAxeViolations(page);
      await page.keyboard.press("Escape");

      await page.goto("/leads");
      await expect(cardsIn(page, "NEW")).toHaveCount(1);
      await expectNoAxeViolations(page);
      await page.getByRole("button", { name: "Move Leila Haddad (sample)" }).click();
      await expect(page.getByRole("menuitemradio", { name: "Won" })).toBeVisible();
      await expectNoAxeViolations(page);
      await page.keyboard.press("Escape");

      await page.goto("/leads?view=list");
      await expectNoAxeViolations(page);
    });
  });
}

test("log a contact, then the follow-up shows on the dashboard and in the list", async ({
  page,
}) => {
  await signUpWithWorkspace(page);
  await addLead(page, "Amina Kettani (sample)");

  // On the lead's page: contacted today, follow up today.
  const form = page.getByRole("form", { name: "Log a contact" }).filter({ visible: true });
  const today = await form.getByLabel("When did you get in touch?").inputValue();
  await form.getByLabel("What happened? (optional)").fill("Called, sending a quote");
  // A quick pick fills the date; "None" clears it again.
  await form.getByRole("button", { name: "In a week" }).click();
  await expect(form.getByRole("button", { name: "In a week" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await form.getByRole("button", { name: "None" }).click();
  await expect(form.getByLabel("Next follow-up (optional)")).toHaveValue("");
  await form.getByLabel("Next follow-up (optional)").fill(today);
  await form.getByRole("button", { name: "Save contact" }).click();

  const card = page.locator("#log-contact").filter({ visible: true });
  await expect(card.getByText("Follow up today")).toBeVisible();
  // Logging a contact moves a New lead to Contacted.
  await expect(
    page.getByRole("main").getByText("Contacted", { exact: true }).first(),
  ).toBeVisible();

  // The dashboard lists it under "Due today or late".
  await page.goto("/");
  const followUps = page.getByRole("region", { name: "Follow up" });
  await expect(followUps.getByRole("link", { name: "Amina Kettani (sample)" })).toBeVisible();
  await expect(followUps.getByText("Follow up today")).toBeVisible();

  // The list's follow-up filter finds it; "Gone cold" doesn't.
  await page.goto("/leads?view=list&followUp=due");
  await expect(
    page.getByRole("link", { name: "Amina Kettani (sample)" }).filter({ visible: true }),
  ).toBeVisible();
  await page.goto("/leads?view=list&followUp=cold");
  await expect(page.getByText("No leads match")).toBeVisible();

  // The note is in the activity log.
  await page.goto("/activity");
  await expect(
    page.getByText("Contacted Amina Kettani (sample): Called, sending a quote").first(),
  ).toBeVisible();
});
