import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  Flag,
  GraduationCap,
  LayoutDashboard,
  MessagesSquare,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matchers?: readonly string[];
};

export const adminNavItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/schools", label: "Schools", icon: GraduationCap },
  { href: "/admin/moderation", label: "Flagging & Moderation", icon: Flag },
  { href: "/admin/content", label: "Content Management", icon: BookOpenCheck },
  {
    href: "/admin/community",
    label: "Community Forum",
    icon: MessagesSquare,
    matchers: ["/admin/forum"] as const,
  },
  { href: "/admin/audit", label: "Audit Trail", icon: ScrollText },
  { href: "/admin/analytics", label: "Analytics & Reporting", icon: BarChart3 },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "System Settings", icon: Settings },
] satisfies readonly AdminNavItem[];

const pathMatches = (currentPath: string, targetPath: string): boolean =>
  currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);

export function isAdminNavItemActive(currentPath: string, item: AdminNavItem): boolean {
  const targets = [item.href, ...(item.matchers ?? [])];
  return targets.some((target) => pathMatches(currentPath, target));
}
