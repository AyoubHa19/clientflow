import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CurrentUserMenu } from "./current-user-menu";
import { CurrentWorkspace } from "./current-workspace";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

/**
 * The frame around every signed-in page: a side bar from lg up, a top bar
 * with a menu below lg. The page sits straight on the tinted background, so
 * its cards (white by day, dark glass by night) stand out.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 px-3 py-4 lg:flex">
        <div className="grid gap-1 px-2">
          <Link href="/" aria-label="ClientFlow home" className="w-fit rounded-lg py-1">
            <Logo />
          </Link>
          <div className="pl-10.5">
            <CurrentWorkspace />
          </div>
        </div>
        <nav aria-label="Main" className="flex-1">
          <NavLinks />
        </nav>
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <CurrentUserMenu showDetails />
          </div>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="sticky top-0 z-40 grid h-14 grid-cols-[1fr_auto_1fr] items-center border-b bg-background/85 px-2 backdrop-blur lg:hidden">
          <div>
            <MobileNav workspace={<CurrentWorkspace />} />
          </div>
          <Link href="/" aria-label="ClientFlow home" className="rounded-lg px-1 py-1">
            <Logo />
          </Link>
          <div className="flex items-center justify-end gap-1">
            <ThemeToggle />
            <CurrentUserMenu />
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
