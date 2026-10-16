# ClientFlow

A calm workspace for freelancers and small agencies: clients, leads,
projects and tasks in one place.

> **Status:** in development, built one stage at a time (see `PRD.md`,
> section 14). Done so far: **Stage 1, project foundation**. There is no
> database or sign-in yet.

## Stack

All free and open source.

| Part              | Choice                                         |
| ----------------- | ---------------------------------------------- |
| Framework         | Next.js 16 (App Router, Cache Components)      |
| Language          | TypeScript, strict                             |
| Styling           | Tailwind CSS 4, colour tokens in `globals.css` |
| Components        | shadcn/ui on Radix (accessible), lucide icons  |
| Tests             | Vitest (unit), Playwright + axe (end-to-end)   |
| Coming (Stage 2+) | PostgreSQL on Neon, Prisma 7, Better Auth, Zod |

## Running it

Needs Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000. In development, `/design` shows the shared
components and colours.

## Checks

| Command                  | What it does                                      |
| ------------------------ | ------------------------------------------------- |
| `npm run check`          | All of the below except the end-to-end tests      |
| `npm run format:check`   | Prettier formatting                               |
| `npm run lint`           | ESLint                                            |
| `npm run typecheck`      | Route types, then TypeScript                      |
| `npm test`               | Unit tests (Vitest)                               |
| `npm run check:contrast` | Colour contrast of the theme tokens (WCAG)        |
| `npm run test:e2e`       | Browser tests on desktop and phone sizes, and axe |
| `npm run build`          | Production build                                  |

The first time, `npx playwright install chromium` downloads the browser
the end-to-end tests use.

## Project structure

```
src/
  app/              pages and layouts (the (app) group sits in the shell)
  components/ui/    shadcn components (generated, then adjusted)
  components/shell/ side bar, phone menu, page header
  components/theme/ light / dark / system theme
  lib/              shared helpers (each with its own *.test.ts)
e2e/                Playwright tests
scripts/            small tools (contrast check)
```

## Decisions

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

- `npm audit` reports a "high" advisory in `braces`, used by
  `eslint-config-next` through `fast-glob`. It only affects the lint tool
  on your own machine, not the app, and no fixed version exists yet; npm's
  suggested "fix" would downgrade ESLint's Next config to version 14.
