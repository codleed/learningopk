import type { LucideIcon } from "lucide-react";

export type ViewMode = "admin" | "student";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  matchers?: string[];
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export interface LeftRailProps {
  session: {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role?: "student" | "admin";
    };
  };
  currentPath?: string;
  isCollapsed: boolean;
  onToggle: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export interface RoleToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  isCollapsed: boolean;
}

export interface NavItemComponentProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  variant: ViewMode;
  currentPath: string;
}
