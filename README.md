# ClientFlow

A calm workspace for freelancers and small agencies: clients, leads,
projects and tasks in one place.

> **Status:** in development, built one stage at a time (see `PRD.md`,
> section 14). Done so far: **Stage 1**, project foundation; **Stage 2**,
> database; **Stage 3**, sign-up, sign-in and sign-out; **Stage 4**,
> workspaces and data isolation; **Stage 5**, clients; **Stage 6**, leads;
> **Stage 7**, projects; **Stage 8**, tasks. The dashboard comes next.

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

- After signing up, `/onboarding` asks for a workspace name and time zone
  (the browser's is picked). The creator is its **owner**. For now each
  person has one workspace; the tables already allow more later.
- `/settings`: the owner renames the workspace or changes its time zone.
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
- Passwords are hashed (scrypt) by Better Auth; sign-in and sign-up are
  rate limited and check the request's origin.
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
| `npm run db:deploy`   | Applies migrations without creating any (production, Stage 12)                |
| `npm run db:generate` | Regenerates the Prisma client (also runs after `npm install`)                 |

The schema is in `prisma/schema.prisma`, with a comment on each rule.

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
