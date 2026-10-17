"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActive, NAV_ITEMS } from "./nav-items";

type NavProps = { onNavigate?: () => void };

function NavList({ pathname, onNavigate }: NavProps & { pathname: string | null }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname !== null && isActive(href, pathname);
        return (
          <li key={href}>
            <Link
              href={href}
              onNavigate={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-full px-3.5 text-sm font-medium text-muted-foreground transition-colors outline-none",
                "hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                active &&
                  "bg-sidebar-accent text-foreground shadow-(--shadow-card) ring-1 ring-border",
              )}
            >
              <Icon aria-hidden className={cn("size-4", active && "text-brand")} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function CurrentNavList(props: NavProps) {
  return <NavList {...props} pathname={usePathname()} />;
}

/**
 * The main navigation, used by the side bar and the phone menu. The current
 * page is only known per request, so on pages like /clients/[id] the links
 * render first and the highlight streams in (Next asks for the Suspense).
 */
export function NavLinks(props: NavProps) {
  return (
    <Suspense fallback={<NavList {...props} pathname={null} />}>
      <CurrentNavList {...props} />
    </Suspense>
  );
}
