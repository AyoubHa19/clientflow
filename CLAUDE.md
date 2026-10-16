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
- Deploys happen in Stage 12 only (unlike Pocketwise).

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
- **Next: Stage 3, authentication** (Better Auth: sign up, sign in, sign
  out, sessions, protected routes). Its tables come from its own CLI.

## Running it

- `npm run dev` in a Terminal tab (port 3000, or 3001 if Pocketwise is on
  3000). preview_start "clientflow" only works when the session's working
  directory is ClientFlow: from a Pocketwise session it starts Pocketwise's
  server instead. Then open the preview with its URL.
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
- Neon URLs use `sslmode=verify-full` (pg warns about `require`).
- The generated Prisma client is in `src/generated/prisma` (ignored by
  Git, Prettier and ESLint); import from `@/generated/prisma/client`.
