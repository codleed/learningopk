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
      role?: "student" | "admin" | "moderator";
    };
  };
  currentPath?: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export interface RoleToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  isExpanded?: boolean;
}

export interface NavItemComponentProps {
  item: NavItem;
  isActive: boolean;
  isExpanded: boolean;
  variant: ViewMode;
  currentPath: string;
}
