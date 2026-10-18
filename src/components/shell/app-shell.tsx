import Link from "next/link";
import { FolderKanbanIcon, PlusIcon, TargetIcon, UsersIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { CommandMenu } from "@/components/search/command-menu";
import { CurrentTimer } from "@/components/time/current-timer";
import { OfflineNotice } from "@/components/pwa/offline-notice";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CurrentUserMenu } from "./current-user-menu";
import { CurrentWorkspace } from "./current-workspace";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { Spotlight } from "./spotlight";

const QUICK_ADD = [
  { href: "/clients/new", label: "Client", icon: UsersIcon },
  { href: "/leads/new", label: "Lead", icon: TargetIcon },
  { href: "/projects/new", label: "Project", icon: FolderKanbanIcon },
];

/**
 * The frame around every signed-in page, over a still sky (clouds by day,
 * stars by night) that shows behind every glass card. From lg: a glass
 * side bar and a top bar with the search; below lg, a glass top bar and a
 * menu.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh lg:p-4">
      <div aria-hidden className="app-sky" />
      <Spotlight />
      <a
        href="#main"
        className="sr-only rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>

      <div className="min-h-dvh glass-panel lg:grid lg:min-h-[calc(100dvh-2rem)] lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:rounded-[2rem]">
        <aside className="sticky top-7 m-3 hidden h-[calc(100dvh-3.5rem)] flex-col gap-6 surface px-3 py-5 lg:flex">
          <div className="grid min-w-0 gap-1 px-2">
            <Link href="/" aria-label="ClientFlow home" className="w-fit rounded-lg py-1">
              <Logo />
            </Link>
            <div className="min-w-0 pl-10.5">
              <CurrentWorkspace />
            </div>
          </div>
          <nav aria-label="Main" className="flex-1 overflow-y-auto">
            <NavLinks />
          </nav>
          <div className="surface p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <PlusIcon aria-hidden className="size-3.5 text-brand" />
              Quick add
            </p>
            <ul className="mt-2 grid grid-cols-3 gap-1.5">
              {QUICK_ADD.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[0.7rem] font-medium text-muted-foreground transition outline-none hover:-translate-y-0.5 hover:bg-brand-soft hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <Icon aria-hidden className="size-4" />
                    {label}
                    <span className="sr-only"> (new)</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <CurrentUserMenu showDetails />
            </div>
          </div>
        </aside>

        <div className="flex min-h-dvh min-w-0 flex-col lg:min-h-0">
          <header className="sticky top-0 z-40 grid h-14 grid-cols-[1fr_auto_1fr] items-center border-b border-(--surface-edge) bg-(--surface-fill) px-2 backdrop-blur-xl backdrop-saturate-150 lg:hidden">
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

          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
            <CommandMenu className="lg:max-w-md" />
            <CurrentTimer />
            <OfflineNotice />
            <div className="ml-auto hidden lg:block">
              <ThemeToggle />
            </div>
          </div>

          <main id="main" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
