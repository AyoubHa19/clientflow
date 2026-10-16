"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActive, NAV_ITEMS } from "./nav-items";

/** The main navigation, used by the side bar and the phone menu. */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href, pathname);
        return (
          <li key={href}>
            <Link
              href={href}
              onNavigate={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors outline-none",
                "hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                active && "bg-sidebar-accent text-foreground shadow-xs ring-1 ring-border",
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
