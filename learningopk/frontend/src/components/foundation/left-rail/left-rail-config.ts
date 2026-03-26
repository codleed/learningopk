import {
  BookOpen,
  ChartPie,
  MessageCircle,
  Bot,
  House,
  LayoutDashboard,
  Users,
  BookOpenCheck,
  Flag,
  MessagesSquare,
  BarChart3,
  ScrollText,
  Bell,
  Settings,
  Database,
} from "lucide-react";

import type { NavItem, NavSection } from "./left-rail-types";

export const isPathPrefix = (currentPath: string, target: string): boolean =>
  currentPath === target || currentPath.startsWith(`${target}/`);

export const isNavItemActive = (currentPath: string, item: NavItem): boolean => {
  if (item.matchers) {
    return item.matchers.some((m) => isPathPrefix(currentPath, m));
  }
  // Exact match for top-level routes whose href is a prefix of siblings
  if (item.exact) {
    return currentPath === item.href;
  }
  return isPathPrefix(currentPath, item.href);
};

export const studentNavItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: House,
  },
  {
    href: "/subjects",
    label: "Subjects",
    icon: BookOpen,
  },
  {
    href: "/ai-tutor",
    label: "AI Tutor",
    icon: Bot,
  },
  {
    href: "/stats",
    label: "Stats",
    icon: ChartPie,
  },
  {
    href: "/forum",
    label: "Forum",
    icon: MessageCircle,
  },
];

export const adminCommandItems: NavItem[] = [
  {
    href: "/admin",
    label: "Command Center",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
  },
  {
    href: "/admin/content",
    label: "Content",
    icon: BookOpenCheck,
  },
  {
    href: "/admin/moderation",
    label: "Moderation",
    icon: Flag,
  },
  {
    href: "/admin/community",
    label: "Community",
    icon: MessagesSquare,
  },
  {
    href: "/admin/forum",
    label: "Forum",
    icon: MessageCircle,
  },
];

export const adminOperationsItems: NavItem[] = [
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    href: "/admin/audit",
    label: "Audit",
    icon: ScrollText,
  },
  {
    href: "/admin/notifications",
    label: "Notifications",
    icon: Bell,
  },
  {
    href: "/admin/backup",
    label: "Backup & Restore",
    icon: Database,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
  },
];

export const adminNavSections: NavSection[] = [
  {
    label: "Command Center",
    items: adminCommandItems,
  },
  {
    label: "Operations",
    items: adminOperationsItems,
  },
];
