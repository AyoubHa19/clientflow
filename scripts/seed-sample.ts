/**
 * Creates the "(sample)" demo account with a workspace full of realistic
 * data: clients, leads (one converted), projects and tasks, with dates
 * around today so the dashboard has something overdue and something coming
 * up. Everything goes through the app's own rules (the services), so it's
 * data the app could have made itself.
 *
 * Safe to run twice: if the account already exists, it stops.
 *
 *   SAMPLE_USER_EMAIL=... SAMPLE_USER_PASSWORD=... DATABASE_URL=... \
 *     npx tsx scripts/seed-sample.ts
 *
 * The password is never printed.
 */
import { randomBytes } from "node:crypto";
import { todayIn } from "@/lib/dates";
import { createAuth } from "@/server/auth/config";
import { createClient, setClientArchived } from "@/server/clients/service";
import { createPrismaClient } from "@/server/db/client";
import { convertLead, createLead } from "@/server/leads/service";
import { createProject } from "@/server/projects/service";
import { createTask } from "@/server/tasks/service";
import { createWorkspace, type WorkspaceContext } from "@/server/workspace/service";
import type { ServiceResult } from "@/server/result";

const TIME_ZONE = "Africa/Casablanca";

function must<T>(result: ServiceResult<T>, what: string): T {
  if (!result.ok) throw new Error(`${what}: ${result.message} ${JSON.stringify(result.errors)}`);
  return result.value;
}

/** A "YYYY-MM-DD" day `offset` days from today (in the workspace's zone). */
function day(today: string, offset: number) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

async function main() {
  const { DATABASE_URL, SAMPLE_USER_EMAIL, SAMPLE_USER_PASSWORD } = process.env;
  if (!DATABASE_URL || !SAMPLE_USER_EMAIL || !SAMPLE_USER_PASSWORD) {
    throw new Error("Set DATABASE_URL, SAMPLE_USER_EMAIL and SAMPLE_USER_PASSWORD.");
  }
  const db = createPrismaClient(DATABASE_URL);
  try {
    const email = SAMPLE_USER_EMAIL.toLowerCase();
    if (await db.user.findUnique({ where: { email } })) {
      console.log("The sample account already exists; nothing to do.");
      return;
    }

    // The account, through Better Auth (the password is hashed with scrypt).
    // The secret only signs session cookies, and this script keeps none.
    const auth = createAuth({
      db,
      secret: randomBytes(32).toString("hex"),
      baseURL: "http://localhost",
    });
    const signedUp = await auth.api.signUpEmail({
      body: { name: "Sara Bennani (sample)", email, password: SAMPLE_USER_PASSWORD },
    });
    await db.session.deleteMany({ where: { userId: signedUp.user.id } });

    const workspace = must(
      await createWorkspace(db, signedUp.user.id, {
        name: "Bennani Design Studio (sample)",
        timezone: TIME_ZONE,
      }),
      "workspace",
    );
    const ctx: WorkspaceContext = {
      user: { id: signedUp.user.id, name: signedUp.user.name, email },
      workspace,
      role: "OWNER",
    };
    const today = todayIn(TIME_ZONE);

    // Clients.
    const client = async (data: Record<string, string>) =>
      must(await createClient(db, ctx, data), `client ${data.name}`);
    const atlas = await client({
      name: "Atlas Café (sample)",
      email: "hello@atlas-cafe.example",
      phone: "+212 522 12 34 56",
      notes: "Met at the Casablanca food fair. Wants a new menu and social posts.",
    });
    await client({
      name: "Marrakech Riad Group (sample)",
      company: "Riad Group",
      email: "contact@riad-group.example",
      phone: "+212 524 38 90 12",
    });
    await client({
      name: "Youssef El Amrani (sample)",
      email: "youssef.elamrani@example.com",
      phone: "+212 661 23 45 67",
    });
    const nour = await client({
      name: "Nour Architects (sample)",
      company: "Nour SARL",
      email: "studio@nour-architects.example",
      phone: "+212 537 70 11 22",
    });
    await client({
      name: "Sophie Laurent (sample)",
      email: "sophie.laurent@example.com",
      status: "INACTIVE",
      notes: "Paused her rebrand until next year.",
    });
    const tanger = await client({
      name: "Tanger Logistics (sample)",
      company: "Tanger Logistics SA",
      email: "it@tanger-logistics.example",
    });
    must(await setClientArchived(db, ctx, tanger.id, true), "archive Tanger Logistics");

    // Leads, along the pipeline; one becomes a client.
    const lead = async (data: Record<string, string | undefined>) =>
      must(await createLead(db, ctx, data), `lead ${data.contactName}`);
    const karim = await lead({
      contactName: "Karim Benali (sample)",
      company: "Riad Yasmine",
      email: "karim@riad-yasmine.example",
      phone: "+212 661 11 22 33",
      source: "Referral",
      status: "QUALIFIED",
      notes: "Needs a booking site before the high season.",
    });
    const converted = must(await convertLead(db, ctx, karim.id), "convert Karim");
    // Follow-ups: one due today, one late, one planned, and two gone cold
    // (added a while ago, nothing planned, no recent contact).
    for (const { addedDaysAgo, ...data } of [
      {
        contactName: "Leila Haddad (sample)",
        company: "Studio Leila",
        source: "Instagram",
        status: "QUALIFIED",
        lastContactedOn: day(today, -3),
        nextFollowUpOn: today,
      },
      {
        contactName: "Omar Tazi (sample)",
        email: "omar.tazi@example.com",
        source: "Website",
        status: "CONTACTED",
        lastContactedOn: day(today, -9),
        nextFollowUpOn: day(today, -2),
      },
      {
        contactName: "Hiba Alaoui (sample)",
        company: "Alaoui & Co",
        source: "LinkedIn",
        status: "CONTACTED",
        lastContactedOn: day(today, -2),
        nextFollowUpOn: day(today, 5),
      },
      {
        contactName: "Nadia Fassi (sample)",
        company: "Fassi Textiles",
        source: "Event",
        status: "CONTACTED",
        lastContactedOn: day(today, -20),
        addedDaysAgo: 40,
      },
      { contactName: "Youssef Ait (sample)", source: "Website", status: "NEW", addedDaysAgo: 18 },
      {
        contactName: "Salma Idrissi (sample)",
        company: "Idrissi Bakery",
        source: "Referral",
        status: "LOST",
      },
      {
        contactName: "Thomas Martin (sample)",
        company: "Martin Events",
        source: "Event",
        status: "LOST",
      },
    ]) {
      const created = await lead(data);
      if (addedDaysAgo) {
        await db.lead.update({
          where: { id: created.id },
          data: { createdAt: new Date(`${day(today, -addedDaysAgo)}T09:00:00Z`) },
        });
      }
    }

    // Projects: one late, one due soon, one planned, one paused, one done.
    const project = async (data: Record<string, string>) =>
      must(await createProject(db, ctx, data), `project ${data.name}`);
    const menu = await project({
      name: "Atlas Café menu design (sample)",
      clientId: atlas.id,
      status: "IN_PROGRESS",
      startDate: day(today, -27),
      dueDate: day(today, -7),
      description: "New printed menu and Instagram templates.",
    });
    const booking = await project({
      name: "Riad Yasmine booking site (sample)",
      clientId: converted.client.id,
      status: "IN_PROGRESS",
      startDate: day(today, -16),
      dueDate: day(today, 3),
      description: "A small site with rooms, photos and a booking form.",
    });
    const plans = await project({
      name: "Nour office plans (sample)",
      clientId: nour.id,
      status: "PLANNING",
      dueDate: day(today, 44),
    });
    const portfolio = await project({ name: "Portfolio refresh (sample)", status: "ON_HOLD" });
    await project({
      name: "Riad Group brochure (sample)",
      status: "COMPLETED",
      startDate: day(today, -60),
      dueDate: day(today, -30),
    });

    // Tasks, some done, some overdue, some coming up.
    const task = async (data: Record<string, string | undefined>) =>
      must(await createTask(db, ctx, data), `task ${data.title}`);
    for (const data of [
      {
        title: "Print test of the menu (sample)",
        projectId: menu.id,
        status: "DONE",
        dueDate: day(today, -9),
      },
      {
        title: "Send menu proofs to Atlas Café (sample)",
        projectId: menu.id,
        priority: "HIGH",
        dueDate: day(today, -5),
      },
      {
        title: "Instagram story templates (sample)",
        projectId: menu.id,
        status: "IN_PROGRESS",
        dueDate: day(today, -3),
      },
      {
        title: "Choose photos for the rooms (sample)",
        projectId: booking.id,
        status: "DONE",
        dueDate: day(today, -4),
      },
      {
        title: "Connect online deposit (sample)",
        projectId: booking.id,
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate: day(today, -1),
      },
      { title: "Write room descriptions (sample)", projectId: booking.id, dueDate: day(today, 2) },
      { title: "Site visit at Nour office (sample)", projectId: plans.id, dueDate: day(today, 11) },
      { title: "Update portfolio case studies (sample)", projectId: portfolio.id, priority: "LOW" },
      { title: "Renew domain name (sample)", priority: "LOW", dueDate: day(today, 19) },
      { title: "Call Karim about photos (sample)", status: "DONE", dueDate: day(today, -2) },
      { title: "Send invoice to Riad Group (sample)", priority: "HIGH", dueDate: day(today, 1) },
    ]) {
      await task(data);
    }

    const counts = await Promise.all([
      db.client.count({ where: { workspaceId: workspace.id } }),
      db.lead.count({ where: { workspaceId: workspace.id } }),
      db.project.count({ where: { workspaceId: workspace.id } }),
      db.task.count({ where: { workspaceId: workspace.id } }),
    ]);
    console.log(
      `Sample account ready: ${counts[0]} clients, ${counts[1]} leads, ${counts[2]} projects, ${counts[3]} tasks.`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
