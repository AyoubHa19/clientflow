import {
  FolderKanbanIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  SettingsIcon,
  SunIcon,
  TargetIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

// A page joins this list in the stage that builds it, so no link ever leads
// nowhere.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/today", label: "Today", icon: SunIcon },
  { href: "/clients", label: "Clients", icon: UsersIcon },
  { href: "/leads", label: "Leads", icon: TargetIcon },
  { href: "/projects", label: "Projects", icon: FolderKanbanIcon },
  { href: "/tasks", label: "Tasks", icon: ListChecksIcon },
  { href: "/activity", label: "Activity", icon: HistoryIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

/** Whether a nav item is the current page (or a page under it). */
export function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
