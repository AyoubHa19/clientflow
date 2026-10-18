# ClientFlow

A calm workspace for freelancers and small agencies: clients, leads,
projects and tasks in one place.

> **Live:** https://clientflow-ayoubha19.vercel.app
>
> Built one stage at a time (see `PRD.md`, section 14): foundation,
> database, sign-in, workspaces, clients, leads, projects, tasks, the
> dashboard, UX polish, a security review and deployment (stages 1–12).
> Next: portfolio readiness (stage 13).

## Stack

All free and open source, or a free plan.

| Part           | Choice                                                    |
| -------------- | --------------------------------------------------------- |
| Framework      | Next.js 16 (App Router, Cache Components)                 |
| Language       | TypeScript, strict                                        |
| Styling        | Tailwind CSS 4, colour tokens in `globals.css`            |
| Components     | shadcn/ui on Radix (accessible), lucide icons             |
| Database       | PostgreSQL on Neon (free plan, Frankfurt)                 |
| ORM            | Prisma 7 with the `pg` driver adapter                     |
| Validation     | Zod                                                       |
| Tests          | Vitest (unit and database), Playwright + axe (end-to-end) |
| Authentication | Better Auth (email and password, sessions in PostgreSQL)  |

## Running it

Needs Node.js 20.9 or newer.

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill it in (the file says where
each value comes from). Then:

```bash
npm run dev
```

and open http://localhost:3001 (the port is fixed so it never clashes with
another project on 3000). Create an account, or use the sample one from
`.env.local`. In development, `/design` shows the shared components and
colours.

## Workspaces

- After signing up, `/onboarding` asks for a workspace name, time zone
  (the browser's is picked) and **currency** (guessed from the time zone:
  Casablanca → MAD, Paris → EUR...; it follows the zone until picked). The
  creator is its **owner**. For now each person has one workspace; the
  tables already allow more later.
- `/settings`: the owner renames the workspace or changes its time zone or
  currency. Changing the currency relabels amounts; it doesn't convert them.
- `requireWorkspace()` (`src/server/workspace/context.ts`) gives every
  page and action the user, their workspace and role, read from the
  session and the membership table. **The workspace id never comes from
  the browser**: forms send only names and values, and every query filters
  by `ctx.workspace.id`. Tests try to reach another workspace on purpose.

## Clients

- `/clients`: search (name, company, email, phone), a status filter
  (active and inactive by default), sorting, 20 a page. The settings live
  in the address, so a filtered list can be bookmarked or shared.
- Add, view, edit; archive (hidden from the usual list) and restore;
  delete for good after confirming (owners only; their projects stay).
- Every change is written to the activity log in the same transaction.
- Another workspace's client, or a malformed id, shows "Page not found".

## Leads

- `/leads` opens on a **board**: New → Contacted → Qualified → Won → Lost.
  Move a card by dragging its grip (mouse or touch), with the keyboard
  (space to pick up, left/right arrows to choose a column, space to drop;
  each step is announced to screen readers), or with its "Move" menu.
  The card moves at once and goes back if saving fails; moves are saved in
  the order made.
- **List view** (`?view=list`): search, stage and source filters, sorting,
  20 a page.
- **Convert to client** (once): creates the client from the lead's details,
  or, when a client already has the same email, links to it instead of
  making a duplicate. The lead becomes Won and stays Won. Two clicks at once
  still make one client (the lead row is locked during the conversion).
- **Follow-ups.** Each lead can have a "last contacted" day and a "next
  follow-up" day. **Log a contact** on a lead's page records the day (today
  by default; never a future day), a short note (kept in the activity log)
  and the next follow-up, with quick picks ("In 3 days", "In a week"...)
  counted from the contact day. It moves a New lead to Contacted. Logging an
  older contact never turns the "last contacted" day back.
- An open lead with nothing planned and no contact for **14 days** (counting
  from the later of its last contact and the day it was added) has **gone
  cold**. Badges say "Follow up today", "Follow-up 2 days late", "Follow up
  in 5 days" or "No contact for 20 days"; won and lost leads have none.
- The list filters by follow-up (due today or late, gone cold, planned) and
  sorts by next follow-up.

## Money

- A lead can have an **expected value** and a project a **fee**, in the
  workspace's currency. Forms take "1500", "1500.50", "1,500.50" or
  "1 500,50"; anything else is explained. Up to 10,000,000.
- Amounts are stored as **whole numbers of minor units** (cents): no
  floating point, so totals never drift. The database also refuses
  negative or too-large amounts (CHECK constraints). `src/lib/money.ts`.
- The dashboard's **Money** card: the pipeline (open leads with a value),
  **won this month** (by the day each lead was moved to Won, in the
  workspace's time zone; `Lead.wonAt`), and the fees of open projects. Each
  says how many records it counts.
- The board shows each lead's value and what each column is worth; the
  list sorts by value; projects show their fee, and a client's page adds up
  their projects' fees (cancelled ones left out).

## Projects

- `/projects`: open projects by default (planning, in progress, on hold),
  soonest due first (undated last); filters by status and client (or
  "no client"), search in project and client names, 20 a page.
- A project can belong to a client of the **same workspace** only (the
  server checks it; a test tries another workspace's client).
- Start and due dates are calendar days. Badges say "Overdue by N days",
  "Due today" or "Due in N days", counted from today **in the workspace's
  time zone**, and disappear once a project is completed or cancelled.
- A client's page lists their projects and starts a new one for them.

## Project templates

- **Start from** on the new project form: a blank project, a ready-made
  template (Website, Logo & brand, Social media month) or one of yours. Its
  tasks are created with the project, their due dates counted from its
  start date (or today); its description is used if you didn't write one.
- **Save as template** on a project's page keeps its tasks (due dates as
  days after the project's start). Names are unique per workspace;
  Settings lists them, and the owner can delete them.

## Install it like an app

- ClientFlow has a web app manifest (`src/app/manifest.ts`) and icons
  (`public/icons`, rendered from `src/app/icon.svg`), so phones and
  computers offer to install it; it opens on Today.
- A small service worker (`public/sw.js`, production only) shows a friendly
  offline page when a page can't load. It **never stores pages or data**:
  they're private and change all the time.
- With the connection gone, the app says so at the top; page changes and
  saves wait and go through when it's back (Next's experimental
  `useOffline`).

## Today and the week in review

- **`/today`** (in the menu): unfinished tasks due today or late (tick them
  off right there), the next 7 days' tasks, the leads to follow up, and the
  time logged today and this week. From Friday to Sunday it invites a look
  back at the week.
- **`/review`**: a week (Monday to Sunday, in the workspace's time zone)
  with the tasks finished, what **slipped** (due that week before today and
  still not done), projects completed, time per project, and leads
  contacted, won (with their value) and added, each compared with the week
  before. Previous / next week; `?week=` takes any day of a week, and a
  future or odd one shows this week.

## Time and client health

- Each project has a **Time** card: a timer (start it there; while it runs,
  a bar with its clock and a Stop button sits at the top of every page),
  time added by hand ("1:30", "1h 30m", "90m" or "1.5" hours, on a day that
  has happened, optionally on one of the project's tasks, with a note), and
  the entries. Starting a timer stops and saves the one already running.
  One person has at most one running timer (the database enforces it too);
  a timer forgotten for days is saved as 24 hours, and says so.
- **Real hourly rate:** the project's fee over the hours logged. Rates are
  shown in whole units ("MAD 300/h").
- **Client health**, on the clients list and each client's page: Good,
  Watch, At risk or Not enough data, always with its reasons. It compares
  what the client pays per hour (fees of their projects that have both a
  fee and logged time, over those hours) with the workspace's average, and
  counts their overdue projects and tasks. Below 85% of the average or 1
  overdue item: Watch; below 60% or 3 overdue: At risk (`src/lib/health.ts`).
- You delete your own entries; the owner can delete anyone's.

## Sharing with a client

- On a project's page, **Share with client** makes a link to a status page
  (`/status/<secret>`): the project's name, client, status, progress, dates
  and, if the owner allows, its tasks (titles, due dates, done or not). The
  client needs no account. The fee, the description and notes never show:
  the page reads only those fields (`getSharedProject`).
- The secret is 32 random bytes (43 characters), unique in the database.
  **New link** replaces it (the old link stops working); **Stop sharing**
  turns it off. Only the owner can do either; both are in the activity log.
- The page sends `Referrer-Policy: no-referrer` (the link doesn't leak to
  sites it links to) and `noindex`. A wrong, old or switched-off link gets
  the same friendly "This link doesn't work" page.
- The secret is stored as is, not hashed, so the owner can copy the link
  again later (like a shared document link). Anyone who sees the database
  could open the status pages, which hold nothing private.

## Tasks

- `/tasks`: add a task in one line (title, and if wanted a project, due
  date and priority), tick it off with its checkbox (mouse or keyboard;
  shown at once, undone if saving fails).
- Filters: status (open by default), priority, project, and due: overdue,
  today, the next 7 days or no date, all counted from today in the
  workspace's time zone. Sorted by due date, then priority.
- A task can belong to a project of the same workspace only. Done tasks
  remember when they were completed.
- Project pages list their tasks (with their own quick add) and show
  progress, "3 of 5 tasks done"; the projects list shows it too.

## Dashboard

- The overview shows four numbers, each opening the matching list: active
  clients, open leads, open projects (and how many are on hold), pending
  tasks (and how many are overdue).
- "Follow up": leads whose follow-up is today or late, and the leads gone
  cold, each opening the lead's "Log a contact" form.
- "Coming up": unfinished projects and tasks that are overdue or due in
  the next 14 days. The leads pipeline per stage, with the win rate (won
  out of won and lost) and the leads converted this month. Tasks completed
  per week over the last 8 weeks (weeks start on Monday, in the
  workspace's time zone). The latest changes.
- A new workspace sees a "Getting started" checklist until it has a
  client, a lead, a project and a task.
- `/activity`: every change in the workspace, newest first, filtered by
  type, 25 per page. An entry links to its record while it still exists.

## Using it on any screen

- Lists fold their filters behind a "Filters" button on phones and tablets
  (it shows how many are set), so the list comes first. The task quick add
  folds its extras behind "More options" the same way.
- Detail pages show where you are ("Clients › Atlas Café › Edit"). The
  list crumb takes you back to the list as you left it, with the same
  search, filters and page. The browser tab shows the record's name.
- Leaving a form with unsaved changes asks first.
- If a page fails to load (often a brief database hiccup), it says so and
  offers "Try again", without losing the navigation.
- Pages slide in gently; with "reduce motion" turned on, nothing moves.

## Design

- **A clear sky.** Light mode is a near-white page with a hint of lavender,
  white cards with soft shadows, deep navy text and one periwinkle blue.
  Dark mode is a true matte black: neutral (no blue) near-black colours,
  frosted dark glass, and the night sky photos in greyscale. Buttons are pills; the font is Manrope. The colours are tokens in
  `src/app/globals.css`, and `npm run check:contrast` measures every text
  pair (at least 4.5:1).
- **Inside the app** every card, list, form and the side bar is frosted
  glass over a still sky that shows clearly behind them (clouds by day,
  stars by night), on phones too. The sky never moves inside the app, so
  the blur is only redrawn while scrolling. By day a veil, brighter at the
  top, keeps page titles readable on the sky; text on the sky and on the
  glass was measured on screenshots (at least 4.7:1).
- **The dashboard**: four cards with a glowing trend line of what was
  added each week (8 weeks) that draws itself in, and numbers that count
  up; the pipeline as a win-rate ring and one bar split by stage; tasks
  completed as gradient pill bars that grow in, this week lit, with the
  weekly average; "Coming up"
  as a table with status badges; the pipeline and the latest changes in a
  column on the right. Cards lift a little on hover, with a soft light
  that follows the mouse (behind the text, so contrast never drops).
- **Search everything** with the bar at the top or **Ctrl+K** / **⌘K**:
  clients, leads, projects and tasks of your workspace (only yours), by
  name. Arrow keys to choose, Enter to open, Escape to close.
- **Visitors** see a landing page at `/` (signed-in people get their
  dashboard there). Its sky is a photo: clouds by day, stars by night,
  drifting slowly, with a few stars twinkling at night. One product
  preview (made-up numbers, labelled) rises in, then stays pinned as you
  scroll and turns into a tilted 3D card (on the right on large screens,
  in place on phones) while "Your whole week, at a glance" slides in. The
  features arrive one by one, zig-zagging in from their own side. "Private
  by design" pops in, and the last call ("Clear skies") slides up over it
  like a card laid on top, as it sinks back. All of it is CSS scroll-driven
  animation (no JavaScript while scrolling); with reduced motion, or in
  browsers without it, everything simply sits in place. Sign-in and
  sign-up sit on the same sky, the form on frosted glass.
- White text over the day sky keeps at least 4.5:1: a blue tint is
  multiplied over the top of the photo, and the contrast was measured on
  the photo itself.
- With "reduce motion" turned on, nothing moves. Phones get smaller photos
  (about 17 KB each; 48–56 KB on large screens).
- Photos from Unsplash (Unsplash License): "Sea of clouds" by
  [Harper van Mourik](https://unsplash.com/photos/sea-of-clouds-during-daytime-IyOOKwXXMUM)
  and "A starry night sky" by
  [Vlad ION](https://unsplash.com/photos/a-starry-night-sky-zzdEX4Nixb0).

## Signing in

- `/sign-up` and `/sign-in` (Better Auth, email and password). Passwords
  are hashed with scrypt; the database never holds them as text.
- A session lasts 7 days and is extended (at most daily) while in use. It
  lives in the `sessions` table: signing out deletes it.
- `src/proxy.ts` sends visitors without a session cookie to `/sign-in`
  (with `?next=` to come back). That is only a quick first check: every
  signed-in page checks the session itself on the server
  (`requireUser()` in `src/server/auth/session.ts`).
- Wrong email or password gets one message, "Email or password is
  incorrect", whichever was wrong.
- In production, five sign-in or sign-up attempts a minute per address,
  then "too many attempts" (counted in the database, since serverless
  functions share no memory).
- Requests that carry the session cookie must come from this site (an
  Origin check against cross-site request forgery).

## Security

- Every page and Server Action finds the workspace from the session on the
  server, and every query is limited to it: another workspace's record
  answers "not found". Only the owner can delete.
- Everything sent to the server is checked again there (Zod): lengths,
  choices, ids, real dates (1900–2200), and no invisible control
  characters. Odd text in the address bar is cleaned rather than crashing.
- After signing in, the app only goes to a path on this site, read the way
  a browser reads it.
- The only pages open without signing in are the landing page, sign-in,
  sign-up and the clients' status pages (see "Sharing with a client").
- Passwords are hashed (scrypt) by Better Auth; sign-in and sign-up are
  rate limited and check the request's origin. Their forms are posted
  (never a GET that would put a password in the address), and their
  buttons wait until the page's JavaScript is running.
- Responses carry a Content Security Policy (nothing loads from other
  sites, no framing, forms post only here), `nosniff`, a referrer policy,
  and, over HTTPS, Strict-Transport-Security.
- No secrets in the code or its history: settings live in `.env.local`,
  which Git ignores, and the server names a missing one without printing
  any value.

## The database

Neon project "ClientFlow" has one branch per use, so tests never touch
real data:

| Branch       | Used by                                    |
| ------------ | ------------------------------------------ |
| `production` | the live site (from Stage 12)              |
| `dev`        | `npm run dev`, `db:migrate`, `db:studio`   |
| `test`       | `npm run test:db` (cleans up after itself) |

| Command               | What it does                                                                  |
| --------------------- | ----------------------------------------------------------------------------- |
| `npm run db:migrate`  | After editing `prisma/schema.prisma`: writes and applies a migration on `dev` |
| `npm run db:studio`   | Opens Prisma Studio to look at the `dev` data                                 |
| `npm run db:deploy`   | Applies migrations without creating any (used for production, see below)      |
| `npm run db:generate` | Regenerates the Prisma client (also runs after `npm install`)                 |

The schema is in `prisma/schema.prisma`, with a comment on each rule.

## Deployment

- **Where:** Vercel (free plan), project `clientflow`, linked to the GitHub
  repository. Every push to `main` builds and goes live at
  https://clientflow-ayoubha19.vercel.app. The functions run in Frankfurt
  (`vercel.json`), next to the database.
- **Database:** Neon's `production` branch (Frankfurt), separate from `dev`
  and `test`.
- **Settings** (Vercel, Production environment, marked sensitive):
  `DATABASE_URL` (Neon's pooled address for `production`, with
  `sslmode=verify-full`), `BETTER_AUTH_SECRET` (its own random value, not
  the development one) and `BETTER_AUTH_URL` (the address above). Never
  set `AUTH_RATE_LIMIT` there: it exists only for the browser tests.
- **Migrations** are applied by hand, before pushing code that needs
  them: run `npm run db:deploy` with `DIRECT_DATABASE_URL` set to the
  `production` branch's direct (non-pooled) address. It only applies
  migrations that aren't there yet.
- **Demo account:** `npm run seed:sample` with `DATABASE_URL`,
  `SAMPLE_USER_EMAIL` and `SAMPLE_USER_PASSWORD` set creates "Sara Bennani
  (sample)" and a workspace full of example data; it does nothing if the
  account exists. On the live site its email and password are kept
  privately, not in the repository.
- **Going back:** if a release breaks something, promote the previous
  deployment in Vercel (Deployments → ⋯ → Promote, or `vercel rollback`),
  then fix and push. A migration isn't undone that way: write a new one.
- **Checked after deploying:** the security headers (including HSTS),
  http → https, sign-up's validation, the sign-in rate limit (the sixth
  try in a minute gets 429), and the pages on phone and desktop.
- Vercel's automatic addresses for each deployment are protected by Vercel
  (only the account owner can open them); the public address is the one
  above. Branch previews have no settings, so only `main` is deployed.

## Checks

| Command                  | What it does                                                    |
| ------------------------ | --------------------------------------------------------------- |
| `npm run check`          | All of the below except the end-to-end tests                    |
| `npm run format:check`   | Prettier formatting                                             |
| `npm run lint`           | ESLint                                                          |
| `npm run typecheck`      | Prisma client and route types, then TypeScript                  |
| `npm test`               | Unit tests (Vitest)                                             |
| `npm run test:db`        | Database tests on Neon's `test` branch                          |
| `npm run check:contrast` | Colour contrast of the theme tokens (WCAG)                      |
| `npm run test:e2e`       | Builds the app, then browser tests (desktop and phone) with axe |
| `npm run build`          | Production build                                                |

The first time, `npx playwright install chromium` downloads the browser
the end-to-end tests use. Next allows one dev server per folder, so if
`npm run dev` is already running, point the browser tests at it:
`E2E_BASE_URL=http://localhost:3001 npm run test:e2e`. The browser tests
make accounts named `e2e-...@example.com` on the dev branch and delete
them at the end (`e2e/global-teardown.ts`).

## Project structure

```
prisma/             schema and migrations
src/
  app/              pages and layouts (the (app) group sits in the shell)
  components/ui/    shadcn components (generated, then adjusted)
  components/auth/  sign-in and sign-up forms
  components/workspace/ onboarding and settings forms
  components/shell/ side bar, phone menu, account menu, page header
  components/theme/ light / dark / system theme
  generated/        the Prisma client (generated, not committed)
  lib/              shared helpers (each with its own *.test.ts)
  server/           server-only code: database, auth, settings
  proxy.ts          sends signed-out visitors to /sign-in
  test/             test helpers (database setup)
e2e/                Playwright tests
scripts/            small tools (contrast check)
```

## Decisions

- **Everything belongs to a workspace.** Clients, leads, projects, tasks
  and activity carry a `workspaceId`; queries will always filter by the
  workspace taken from the signed-in session (Stage 4), never one sent by
  the browser.
- **Deleting:** removing a workspace removes everything in it. Removing a
  client keeps its projects (without a client); removing a project keeps
  its tasks (without a project). Clients are normally archived, not deleted.
- **A lead becomes a client once:** `Lead.convertedClientId` is unique.
- **Ids are UUID v7** (random but time-ordered, so indexes stay compact).
  Calendar dates (start, due) are `DATE` columns: no time, no time zone. A
  workspace has a time zone, which decides what "overdue" means.
- **Lengths are capped in the database too** (names 200, emails 320...),
  not only in forms.
- **The activity log outlives what it describes:** `Activity.entityId` has
  no foreign key and `summary` keeps the name at the time.
- **Database code can't reach the browser:** `src/server/db.ts` imports
  `server-only`, so a Client Component importing it fails the build
  (checked in Stage 2). Settings are checked with Zod, and error messages
  name a bad setting without printing its value.
- **Migrations use a direct connection, the app Neon's pooler** (many
  short-lived serverless functions share a few database connections).
- **Database tests clean up after themselves** instead of wiping the
  branch: Prisma 7 refuses `migrate reset` from an AI agent without the
  user's consent, and each test deleting its own records is safer anyway.
- **Sign-in goes through Better Auth's HTTP endpoints** (the forms call
  them with `authClient`), not Server Actions calling `auth.api`: rate
  limiting and the Origin check only run on the endpoints. The server
  checks the sign-up form with the same Zod schema as the browser
  (`src/lib/validation/auth.ts`, used in a Better Auth hook).
- **Better Auth makes its own tables** (`npx auth generate`); only their
  names were changed to match ours. Its ids are random strings, ours UUIDs.
- **After signing in, `?next=` only accepts paths inside the app**
  (`safeNextPath`), so a link can't bounce someone to another site.
- **Pages read the session inside `<Suspense>`** (Cache Components needs
  it): the frame shows at once, the account menu and greeting stream in.
- **Theme without a flash:** an inline script in `<head>` sets the `dark`
  class before the first paint (`src/lib/theme.ts`), as in Next's guide
  "Preventing flash before hydration". No theme library is needed.
- **Colours are tokens** in `src/app/globals.css`. Every text colour is at
  least 4.5:1 against its background in both themes, and form-field borders
  3:1. `npm run check:contrast` measures them, so run it after changing one.
- **Navigation only lists pages that exist:** each page joins
  `src/components/shell/nav-items.ts` in the stage that builds it.
- **Security headers** on every response (`next.config.ts`); a Content
  Security Policy comes in the security stage.
- **`cn` uses clsx + tailwind-merge.** shadcn now installs a brand-new `cn`
  package (0.5.0, published the same day as Stage 1). It was swapped for
  the two long-standing libraries it replaces, so after
  `npx shadcn add <component>`, change `from "cn"` to `from "@/lib/utils"`
  and remove `cn` from `package.json` if it came back.

## Known limits

- Neon's free plan pauses an idle database, so the first request after a
  quiet spell takes a moment longer while it wakes. Transactions wait up to
  5 seconds for a connection (Prisma's default of 2 was sometimes too short
  under load).
- A "not found" record answers with status 200, not 404: the page streams,
  and the status is sent before the server knows. Nothing of the record is
  shown, and the page carries `noindex`.
- Signing up says when an email already has an account: friendlier, but it
  lets someone check whether an address is registered. Hiding it needs
  email verification, which needs a domain to send mail from (later).
- No password reset yet, for the same reason.
- The warning about unsaved changes doesn't cover the browser's back
  button: a web app can't stop it cleanly.
- `npm audit` reports a "high" advisory in `braces`, used by
  `eslint-config-next` through `fast-glob` (5 entries, one cause). It only
  affects the lint tool on your own machine, not the app (`npm audit
--omit=dev` finds nothing), and no fixed version exists yet; npm's
  suggested "fix" would downgrade ESLint's Next config to version 14.
- The Content Security Policy allows inline scripts: Next.js puts page data
  in them, and the per-request nonce that would avoid it doesn't work with
  prerendered pages. Scripts from other sites are still blocked.
