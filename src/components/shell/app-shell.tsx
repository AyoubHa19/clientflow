import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CurrentUserMenu } from "./current-user-menu";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

/**
 * The frame around every signed-in page: a side bar from lg up, a top bar
 * with a menu below lg, and the page itself on a white panel.
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
        <Link href="/" aria-label="ClientFlow home" className="w-fit rounded-lg px-2 py-1">
          <Logo />
        </Link>
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

      <div className="flex min-h-dvh min-w-0 flex-col lg:py-2 lg:pr-2">
        <header className="sticky top-0 z-40 grid h-14 grid-cols-[1fr_auto_1fr] items-center border-b bg-background/85 px-2 backdrop-blur lg:hidden">
          <div>
            <MobileNav />
          </div>
          <Link href="/" aria-label="ClientFlow home" className="rounded-lg px-1 py-1">
            <Logo />
          </Link>
          <div className="flex items-center justify-end gap-1">
            <ThemeToggle />
            <CurrentUserMenu />
          </div>
        </header>

        <main
          id="main"
          tabIndex={-1}
          className="flex-1 bg-card outline-none lg:rounded-2xl lg:border lg:shadow-xs"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
