import {
  LayoutDashboardIcon,
  SettingsIcon,
  TargetIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

// A page joins this list in the stage that builds it, so no link ever leads
// nowhere. Coming: Projects (7), Tasks (8).
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/clients", label: "Clients", icon: UsersIcon },
  { href: "/leads", label: "Leads", icon: TargetIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

/** Whether a nav item is the current page (or a page under it). */
export function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
