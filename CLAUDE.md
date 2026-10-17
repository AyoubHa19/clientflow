@AGENTS.md

# ClientFlow: notes for Claude

The hand-over between Claude sessions: read it first, and update it at the
end of every stage.

## The user and how to work with them

- A beginner learning full-stack development; ClientFlow is a portfolio
  project that could become a real product. Explain decisions simply.
- **Reply in Moroccan Darija written in Arabic script** (they write Darija
  in Latin letters). Only if a whole message is in English, answer in
  simple English. Code, files and commits stay in English.
- **Everything must be free** (free tiers or open source). Claude may
  change any tool or feature from the PRD for a better one, and add or drop
  ideas, without asking about each: the PRD explains the goal, not every
  detail. Say what changed and why.
- **One stage at a time** (PRD section 15): propose it, wait for "bda",
  build only that stage, test it, report (PRD section 16), stop and wait.
- **Test everything yourself** in the in-app browser, like a real user:
  320px to 1920px, light and dark, keyboard, screen-reader labels, axe.
  Never hand the user manual test steps.
- Test data is named "(sample)" and kept.
- Claude may download what the project needs (npm packages, Playwright's
  browser). Ask before anything destructive, and never print or commit
  secrets.
- **Never touch Pocketwise** (`Desktop/Pocketwise`, another project).

## Source of truth

- `PRD.md`: the product plan and the stage roadmap (section 14).
- `README.md`: stack, commands, structure and the decisions behind the code.

## Decisions made in Stage 0 (2026-10-16)

- Stack: Next.js 16 + TypeScript 5 strict + Tailwind 4 + shadcn/ui (Radix)
  - Better Auth (email and password, scrypt, sessions in the database) +
    Prisma **7** (npm's "latest" tag pointed at an 8.0 release candidate;
    Better Auth supports ^7) + PostgreSQL on **Neon** (free; no Docker or
    local Postgres on this PC; separate dev, test and production databases) +
    Zod + Vitest + Playwright + Vercel Hobby (free, non-commercial).
- Our own `Workspace` and `WorkspaceMembership` tables (role OWNER/MEMBER),
  not Better Auth's organization plugin. One owner per workspace at first.
- workspaceId always comes from the session, never from the browser; every
  query filters by it; another workspace's record answers "not found".
- Deletion: clients are archived (status ACTIVE / INACTIVE / ARCHIVED);
  deleting a client or project sets `clientId` / `projectId` to null on
  what pointed at it. Deleting a workspace removes everything in it.
- Lead to client: one transaction; `Lead.convertedClientId` is unique.
- Extras: `Workspace.timezone` (for "overdue"), `Task.completedAt`, dates as
  `@db.Date`, offset pagination of 20.
- Added features (each in its stage): leads Kanban (6), activity log (9),
  dark mode (done in 1), Ctrl+K search (10), "Try the demo" account (13).
- Password reset waits until there's a domain for sending email.
- Deployed since Stage 12: every push to `main` goes live (see "Where things stand").

## Where things stand

- **Stage 1, project foundation: done (2026-10-16).** Next.js 16.4.2 with
  Cache Components and Partial Prefetching (the default in the next major),
  shadcn components, colour tokens (`globals.css`, checked by
  `scripts/contrast.mjs`), theme (light/dark/system, no flash), the shell
  (`src/components/shell`: side bar from lg, top bar and slide-in menu
  below), the 404 page, a dev-only `/design` reference page, security
  headers, Prettier, Vitest, Playwright + axe, and Git (branch `main`).
- **GitHub:** private repo `AyoubHa19/clientflow`, branch `main` (origin).
  `gh` isn't installed; Git's credential manager signs in as AyoubHa19.
  The user's browser may be signed in to another GitHub account: a repo
  made there didn't appear under AyoubHa19, so this one was created
  through the API with Git's sign-in.
- **Stage 2, database: done (2026-10-16).** Neon project "ClientFlow"
  (`damp-voice-64696815`, org `org-rough-poetry-30609615`, Frankfurt) with
  branches `production` (default, empty), `dev` and `test`. `neonctl` is
  signed in on this PC (`npx neonctl@8.7.2 ...`); write connection strings
  straight into `.env.local`, never print them (mask with sed when
  checking). Prisma 7.10.1 + `@prisma/adapter-pg`, config in
  `prisma.config.ts` (reads `.env.local` via `@next/env`), schema in
  `prisma/schema.prisma`, first migration `init` applied to dev and test.
  `src/server/db.ts` (server-only singleton), `src/server/env.ts` (Zod).
  13 database tests (`npm run test:db`) on the test branch.
- **Stage 3, authentication: done (2026-10-16).** Better Auth 1.7.10
  (pinned exactly): `src/server/auth/config.ts` (`createAuth`, used by the
  app and the tests), `index.ts` (the app's instance, server-only),
  `session.ts` (`getCurrentUser`, `requireUser`, `redirectIfSignedIn`),
  `src/app/api/auth/[...all]`, `src/proxy.ts` (cookie check only),
  `/sign-in` and `/sign-up` in the `(auth)` group, the account menu
  (`src/components/shell/user-menu.tsx`). Its tables (sessions, accounts,
  verifications, rate_limits) came from `npx auth@1.7.10 generate`
  (migration `auth`). The "(sample)" account is on the dev branch; its
  email and password are in `.env.local` (SAMPLE_USER_*).
- **Stage 4, workspace and authorization: done (2026-10-16).** `/onboarding`
  (name + time zone, the browser's zone guessed), `/settings` (owner-only
  rename and time zone), the workspace name under the logo. Rules in
  `src/server/workspace/service.ts` (plain functions taking `db` and a
  `WorkspaceContext`, tested on the test branch: isolation A/B, roles, two
  requests at once); `context.ts` has `requireWorkspace()` (session +
  membership; no workspace → /onboarding); `actions.ts` the Server
  Actions (read only name and timezone from the form). One workspace per
  person for now (a per-user advisory lock; Stage 5 replaced a
  serializable transaction that failed under load). The sample account
  owns "Bennani Design Studio (sample)" (Africa/Casablanca).
- **Stage 5, clients: done (2026-10-16).** `/clients` (search, status
  filter, sort, 20 a page, all in the URL via `parseClientListParams`),
  `/clients/new`, `/clients/[id]`, `/clients/[id]/edit`; archive/restore,
  delete (owner, confirm dialog). Rules in `src/server/clients/service.ts`
  (every query `{ id, workspaceId }`, activity logged in the same
  transaction), actions in `actions.ts` (redirect with `?notice=` for the
  toast, `NoticeToast`). Shared: `src/server/result.ts`,
  `src/lib/validation/ids.ts`, `src/components/forms/` (FormField,
  SelectField, TextareaField; `styles.ts` for Server Components),
  `src/components/pagination.tsx`, `src/lib/dates.ts`. The sample
  workspace has 7 "(sample)" clients (one archived).
- **Stage 6, leads: done (2026-10-17).** `/leads` board (default) and
  `?view=list`; `/leads/new`, `/leads/[id]`, `/leads/[id]/edit`. The board
  (`src/components/leads/lead-board.tsx`, @dnd-kit/core 6.3.1): drag by the
  grip (mouse, touch, keyboard with announcements), or the "Move …" menu;
  `useOptimistic` + `setLeadStatusAction` (which calls `refresh()`), moves
  saved in order through a promise queue, `aria-busy` while saving, a
  stable `id` on DndContext (hydration). Rules in
  `src/server/leads/service.ts`: `lockLead` (SELECT … FOR UPDATE) for
  changes; `convertLead` once (lock + unique), linking to a same-email
  client (`findMatchingClient`) instead of duplicating; a converted lead
  stays Won. Shared field rules in `src/lib/validation/fields.ts`. The
  sample workspace has 8 "(sample)" leads; Karim Benali was converted (so
  there are 8 clients now).
- **Stage 7, projects: done (2026-10-17).** `/projects` (status and client
  filters, search in project and client names, sort by due date with
  undated last, 20 a page), new/details/edit, status select, delete
  (owner). `src/server/projects/service.ts` checks a project's client is in
  the same workspace (`invalidFields({ clientId })`). Dates: DATE columns
  read in UTC (`toDateOnly`, `formatDateOnly`); "today" with
  `todayIn(workspace.timezone)`; `dueState` → Overdue / Due today / Due in
  N days (`DueBadge`). The client page lists its projects with "New
  project" (`?clientId=`). The sample workspace has 5 "(sample)" projects.
- **Stage 8, tasks: done (2026-10-17).** `/tasks`: quick add
  (`TaskQuickAdd`, also on a project's page with the project fixed),
  checkboxes (`TaskList`, `useOptimistic` + `setTaskDoneAction`), filters
  (status, priority, project, due: overdue/today/7 days/none via
  `dueRange(filter, today)`), search, sort; `/tasks/[id]` is the edit form
  plus delete (owner). Done sets `completedAt` (kept while it stays done).
  Project pages show tasks and a `ProgressBar`; the projects list has a
  Tasks column (`projectProgress`). `DueBadge` now lives in
  `src/components/due-badge.tsx` (finished: boolean). The sample workspace
  has 11 "(sample)" tasks.
- **Stage 9, dashboard and activity: done (2026-10-17).** The overview
  (`src/app/(app)/page.tsx`) reads `getDashboard(db, ctx, today)` and
  `listActivity` (`src/server/dashboard/service.ts`; date helpers in
  `src/lib/dashboard.ts`). Four cards, each a link to the matching list:
  active clients, open leads, open projects (same as the projects list's
  default filter, with "N on hold"), pending tasks (with "N overdue",
  linking to `/tasks?due=overdue`). "Coming up": unfinished projects and
  tasks due in the next 14 days, overdue first. The leads funnel with the
  win rate (won / (won + lost)) and conversions this month. "Tasks
  completed": 8 weeks (Monday starts, by `completedAt` in the workspace's
  time zone), bars from plain divs plus a hidden table. A "Getting
  started" checklist until there's a client, lead, project and task.
  `/activity` (in the nav): every change, type filter (links), 25 per
  page; an entry links to its record only while it still exists. Nothing
  new in the database.
- **Stage 10, UX and responsive polish: done (2026-10-17).**
  - Errors: `src/app/(app)/error.tsx` (inside the shell), `src/app/error.tsx`
    and `global-error.tsx`, all showing `ErrorView` ("Try again" calls
    `retry()`, plus the error's digest). Checked by making /tasks throw on
    purpose, then removing that; there's no browser test for it.
  - Filters: `FilterBar` + `FilterSelect` (`src/components/filter-bar.tsx`).
    Below lg only the search shows, with "Filters (N set)" opening the rest
    (`wideFrom="xl"` on /tasks). The task quick add folds its extras behind
    "More options" the same way (below xl, or lg on a project's page).
  - Forms: `useUnsavedChanges(form, state)` asks before leaving with
    unsaved changes (closing the tab, or a link inside the app). The
    browser's back button isn't covered.
  - Navigation: `Breadcrumbs` on the detail, edit and new pages; the list
    crumb goes back to the list as it was left (`RememberListUrl` on list
    pages, kept in sessionStorage, `src/components/shell/list-memory.tsx`).
    Detail and edit pages put the record's name in the tab title
    (`generateMetadata`).
  - Motion: pages slide up 8px as they open (no fade, so contrast never
    dips); task rows have a hover colour. Everything stops with reduced
    motion (the rule in `globals.css`).
  - Task rows put their badges under the title in a narrow list (a
    container query, `@md`).
- **Stage 11, security and quality review: done (2026-10-17).** Audited
  every service and all 19 Server Actions: each reads the session
  (`requireWorkspace`) and every query is scoped by `workspaceId`; deletes
  are owner-only. Found and fixed (each with tests):
  1. A null character (or other control character) in text crashed the
     request (PostgreSQL refuses it): text rules now refuse them
     (`hasNoControlCharacters`, also for the workspace and sign-up names),
     and searches from the address drop them (`searchParam`).
  2. A date in year 0 crashed a save: dates must be 1900–2200
     (`YEAR_RANGE` in `fields.ts`).
  3. Open redirect after sign-in: `?next=/%09/evil.example` (browsers drop
     the tab, giving `//evil.example`). `safeNextPath` now parses the path
     like a browser and keeps it only if it stays on this site.
  4. `setTaskDone` / `setClientArchived` accepted any value: now only real
     booleans.
     Also: a Content Security Policy and HTTPS-only HSTS (`next.config.ts`;
     'unsafe-inline' scripts because nonces don't work with Cache
     Components), and the shadcn CLI removed (its stylesheet is copied in
     `src/app/shadcn-tailwind.css`; run `npx shadcn@latest add` when needed).
     Tests: `e2e/security.spec.ts`, `src/lib/validation/fields.test.ts`, and
     "unusual input" blocks in the clients and tasks database tests.
     Revisit after 2026-10-29 (too new to install today): React 19.3.1, and
     `@vitest/coverage-v8` for a coverage report (for now, a script listed
     untested exports; the gaps were filled).
- **Stage 12, deployment: done (2026-10-17).** Live at
  https://clientflow-ayoubha19.vercel.app (Vercel project `clientflow`,
  team scope `bnaybir`, linked to GitHub; every push to `main` deploys).
  Functions in `fra1` (`vercel.json`). Neon `production` branch migrated.
  Vercel Production settings (sensitive): `DATABASE_URL`,
  `BETTER_AUTH_SECRET` (its own), `BETTER_AUTH_URL`. Vercel CLI: use
  `npx -y vercel@62.2.0 ... --scope bnaybir` (signed in as `ayoubha19`);
  its update check prints EPIPE noise, ignore it. Demo account on
  production made by `scripts/seed-sample.ts`; its email and password are
  `PRODUCTION_SAMPLE_USER_EMAIL` / `PRODUCTION_SAMPLE_USER_PASSWORD` in
  `.env.local` (never print them). Smoke-tested without signing in
  (Claude may not type passwords on non-local sites): headers + HSTS,
  http → https, sign-up validation (400), rate limit (429 on the 6th
  try), phone layout. The signed-in pages on the live site need the user
  to sign in (in the browser pane) for Claude to look.
  Production commands: the auto-mode classifier blocks them unless the
  user has just said yes in chat; ask first, every time.
- **Design round (2026-10-17, between stages 12 and 13; the user asked for
  it before the screenshots).** From a video the user sent (the "Credix"
  Webflow template): a sky hero with a product preview that rises and
  tilts in 3D on scroll, a lavender-white page with white cards. Done:
  - Tokens in `globals.css` ("a clear sky"; night: very deep blue-black,
    the user wanted dark mode really dark), `--shadow-card`, `surface` and
    `glass` utilities, Manrope font, pill buttons, rounded fields, pill
    nav links; the main panel is gone (cards sit on the tinted page).
  - Landing page `src/app/welcome/page.tsx`; `proxy.ts` rewrites "/" to it
    for visitors without a session cookie (the address stays "/").
    `DashboardPreview` (made-up numbers, labelled) and `Sky`
    (`src/components/marketing/`).
  - Sky photos (user's choice, Unsplash License, credited in README and the
    footer): day "Sea of clouds" (Harper van Mourik), night "A starry night
    sky" (Vlad ION), in `public/sky/` (full and -1200 for phones). They
    drift slowly (60 s / 90 s), stars twinkle at night; `.sky-tint`
    multiplies blue over the day photo so white text keeps ≥ 4.5:1
    (measured from screenshots with ffmpeg on text-free strips: ≥ 5.4:1).
  - Scroll motion: `.hero-copy`, `.rise`, `.tilt-in` (3D only from lg),
    `.fade-up`, all inside `@supports (animation-timeline: view())` and
    `prefers-reduced-motion: no-preference`.
  - Sign-in / sign-up on the sky with the form on glass.
  - To see signed-out pages, use a fresh Playwright browser (the browser
    pane is signed in): a screenshot script did 375/1440, light/dark.
  - Performance: no backdrop-filter over the moving sky (re-blurred every
    frame); the day tint is a `background-blend-mode` layer of the drifting
    element itself. Browser tests run with `reducedMotion: "reduce"`
    (`playwright.config.ts`): with motion on, three headless browsers
    starved the test server and sign-up's transaction (scrypt inside) ran
    past 10 s (P2028, "Failed to create user").
  - Found on the way and fixed: the sign-in and sign-up forms had no
    `method`, so a submit before hydration would have sent a GET form
    (password in the URL). They're `method="post"` now, and their buttons
    wait for hydration (`useHydrated`, `src/lib/use-hydrated.ts`); tested
    in `e2e/security.spec.ts`.
- **Next: Stage 13, portfolio and product readiness** (PRD 14): README,
  screenshots, architecture summary, feature list, setup, demo data
  strategy (the shared demo account could be changed by visitors: decide
  read-only, a reset, or per-visitor demos; Claude proposed a "Try the
  demo" button that makes a private demo workspace per visitor), known
  limits, roadmap.

## Running it

- `npm run dev` in a Terminal tab: always port 3001 (BETTER_AUTH_URL
  matches it). preview_start "clientflow" only works when the session's
  working directory is ClientFlow: from a Pocketwise session it starts
  Pocketwise's server instead. Then open the preview with its URL.
- Production mode locally: `$env:BETTER_AUTH_URL = 'http://localhost:3200';
npx next start -p 3200` after a build (rate limiting is on only there).
- Before every commit: `npm run check` (format, lint, typecheck, unit
  tests, database tests, contrast), `npm run test:e2e`, `npm run build`.
- Next allows one dev server per folder: if `npm run dev` is running, run
  the browser tests against it with `E2E_BASE_URL=http://localhost:3001`.

## Gotchas

- Next 16 differs from older versions: read `node_modules/next/dist/docs/`
  before using an API. `middleware` is now `proxy`. With Cache Components,
  anything reading cookies/session must sit inside `<Suspense>`.
- `LayoutProps` / `PageProps` types are generated: `npm run typecheck`
  runs `next typegen` first.
- After `npx shadcn add`, imports say `from "cn"`: change them to
  `from "@/lib/utils"` and remove the `cn` package (see README).
- Card lists and grids need `grid-cols-[minmax(0,1fr)]` on phones, or long
  text pushes them wider than the screen.
- Better Auth: rate limiting and the Origin (CSRF) check run only in its
  HTTP router, not in `auth.api.*` calls, so sign-in/up must go through
  `/api/auth` (the forms use `authClient`). It skips the Origin check when
  NODE_ENV=test unless `advanced.disableOriginCheck: false` (set).
- Cache Components keeps the previous page in the DOM, hidden (Activity):
  in Playwright, filter locators with `{ visible: true }`. Next's route
  announcer also has role="alert": scope alerts to `main`.
- Radix menus are `modal={false}`: modal ones put aria-hidden on the page
  (axe "aria-hidden-focus"). Buttons showing text (initials) are named by
  sr-only text, not aria-label (axe "label-content-name-mismatch").
- Cookies on localhost are shared by every port (Pocketwise's Clerk
  cookies are there too): never print `document.cookie`.
- Browser tests make `e2e-...@example.com` accounts on the dev branch;
  `e2e/global-teardown.ts` deletes them and their workspaces.
- `npm run test:e2e` builds the app and runs `next start` on 3100 (with
  AUTH_RATE_LIMIT=off, only there), 3 workers: ~3 minutes. On the dev
  server it was twice as slow and flaky. While fixing one spec, run it
  against the dev server: `E2E_BASE_URL=http://localhost:3001 npx
playwright test e2e/x.spec.ts`; the full suite once at the end.
  `/design` is dev-only, so no test uses it.
- `notFound()` inside `<Suspense>` streams: the page shows "Page not
  found" with `noindex`, but the status is 200 (Next can't change it once
  streaming started). Tests check the content, not the status.
- In Playwright, `getByRole("button", { name: "Next" })` also matches
  Next.js's dev-tools button: use `exact: true`.
- Date inputs: `optionalDay` (fields.ts) must check `Number.isNaN(date)`
  before `toISOString()`: "2026-13-01" crashed the server before Stage 8.
- Two forms on one page with the same label (quick add and filters):
  scope Playwright locators to the form (`getByRole("form", { name })`).
- After big edits (new exports), the dev server can keep an old module
  ("x is not a function" while typecheck passes): restart `npm run dev`.
- On this PC, Windows and Node agree Africa/Casablanca is UTC+0 in October
  2026; "today" follows the runtime's time zone data.
- Prisma transactions wait 5 s for a connection and run up to 10 s
  (`transactionOptions` in `src/server/db/client.ts`): the 2 s default
  failed under load on Neon's free plan.
- Neon (or the connection) sometimes drops for a minute: P1001 "Can't
  reach database server" or "Unable to start a transaction in the given
  time". Rerun what failed (`npx playwright test --last-failed`) before
  hunting for a bug, and say so in the report.
- A sr-only element inside an `overflow-x-auto` box escapes it unless the
  box is `relative` (it widened the whole page on /leads).
- In e2e, wait for dnd-kit announcements between key presses (the live
  region is `getByRole("status")`); a press right after another is lost.
- With the pg adapter, a serialization failure surfaces as
  `DriverAdapterError` (TransactionWriteConflict), not P2034.
- Time zone lists differ between Node and browsers: the server renders
  the options (`timeZoneOptions()`) and passes them to the form.
- **The C: drive is almost full** (it hit 0 GB during Stage 2). If npm
  fails with ENOSPC, delete `%LOCALAPPDATA%\npm-cache\_cacache` and
  `_npx` (only downloaded copies) and tell the user; never delete their
  own files.
- Prisma 7: `migrate dev` doesn't regenerate the client (`db:migrate`
  does both). `migrate reset` is refused when an AI agent runs it unless
  the user consents (an env var with their exact words): ask first, and
  never on production. The database tests use `migrate deploy` and delete
  only their own records.
- Vitest runs with NODE_ENV=test, where Next's env loader skips
  `.env.local`; `src/test/test-database.ts` reads it with
  `process.loadEnvFile`.
- On phones some fields are folded away: in browser tests, call
  `openFilters(page)` or `openQuickAddOptions(form)` (`e2e/helpers.ts`)
  before using them. Wait for the streamed form first (they do).
- A record's tab title streams in after the page, and during an in-app
  move the old title is gone for a moment. `expectNoAxeViolations` waits
  for `networkidle` and a title first, or axe reports "document-title".
- Neon URLs use `sslmode=verify-full` (pg warns about `require`).
- The generated Prisma client is in `src/generated/prisma` (ignored by
  Git, Prettier and ESLint); import from `@/generated/prisma/client`.
- Backslashes in Bash heredocs and `node -e` / `python -` scripts can be
  eaten on the way (`\u0000` became a raw null character in a source file
  once). Write anything with backslashes using the Write or Edit tools, or
  in a script file, and scan for raw control characters afterwards.
- Don't install a package version published less than two weeks ago
  (supply-chain safety); check with `npm view <pkg>@<version> time`.
- Python on this PC defaults to cp1252: open files with
  `encoding="utf-8"`, or a failed write leaves the file empty (it emptied
  CLAUDE.md once; restored from Git).
