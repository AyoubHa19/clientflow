import { LayoutDashboardIcon, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

// A page joins this list in the stage that builds it, so no link ever leads
// nowhere. Coming: Clients (5), Leads (6), Projects (7), Tasks (8),
// Settings (4).
export const NAV_ITEMS: NavItem[] = [{ href: "/", label: "Overview", icon: LayoutDashboardIcon }];

/** Whether a nav item is the current page (or a page under it). */
export function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
