# ClientFlow

A calm workspace for freelancers and small agencies: clients, leads,
projects and tasks in one place.

> **Status:** in development, built one stage at a time (see `PRD.md`,
> section 14). Done so far: **Stage 1**, project foundation; **Stage 2**,
> database; **Stage 3**, sign-up, sign-in and sign-out; **Stage 4**,
> workspaces and data isolation; **Stage 5**, clients; **Stage 6**, leads.
> Projects come next.

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
  quiet spell takes a moment longer while it wakes.
- A project's client must be in the same workspace: the database can't
  check that on its own, so the server will (Stage 7, with a test).
- A "not found" record answers with status 200, not 404: the page streams,
  and the status is sent before the server knows. Nothing of the record is
  shown, and the page carries `noindex`.
- Signing up says when an email already has an account: friendlier, but it
  lets someone check whether an address is registered. Hiding it needs
  email verification, which needs a domain to send mail from (later).
- No password reset yet, for the same reason.
- `npm audit` reports a "high" advisory in `braces`, used by
  `eslint-config-next` through `fast-glob`. It only affects the lint tool
  on your own machine, not the app (`npm audit --omit=dev` finds nothing),
  and no fixed version exists yet; npm's suggested "fix" would downgrade
  ESLint's Next config to version 14.
