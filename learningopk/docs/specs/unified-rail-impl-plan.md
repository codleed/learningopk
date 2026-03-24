# Unified Left Rail Navigation — Implementation Plan

**Document Version:** 1.0  
**Created:** March 21, 2026  
**Status:** Ready for Implementation  
**Based on:** `unified-rail-ui-spec.md` and existing implementation review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Component Architecture](#2-component-architecture)
3. [Type Definitions](#3-type-definitions)
4. [File Changes Required](#4-file-changes-required)
5. [Navigation Item Configuration](#5-navigation-item-configuration)
6. [Role Toggle Implementation](#6-role-toggle-implementation)
7. [CSS/Tailwind Strategy](#7-css-tailwind-strategy)
8. [Viewport Fit Strategy](#8-viewport-fit-strategy)
9. [Collapse Behavior](#9-collapse-behavior)
10. [Implementation Steps (Ordered)](#10-implementation-steps-ordered)
11. [Key Code Snippets](#11-key-code-snippets)
12. [Testing Checklist](#12-testing-checklist)

---

## 1. Executive Summary

### Current State Analysis

| Aspect | Current Implementation | Target State |
|--------|------------------------|--------------|
| **Admin Access** | Hidden submenu behind click | Toggle visible in rail header |
| **Student Nav** | 7 items (5 primary + 2 secondary) | 5 items only (Dashboard, Subjects, AI Tutor, Stats, Forum) |
| **Admin Nav** | Collapsible submenu | Full nav panel with 10 items |
| **Role Switching** | Not available | Admin-only toggle (Admin/Student) |
| **Layout** | Mixed primary/secondary | Unified sections (brand → toggle → nav → utilities → profile) |

### Key Decisions

1. **Refactor over Replace**: Modify `left-rail.tsx` in-place rather than creating new component
2. **Data-Driven Nav**: Extract nav items to configuration file for maintainability
3. **Unified ViewMode State**: Add state to `auth-layout-wrapper.tsx` for role toggle
4. **CSS Variable Extension**: Add new `--rail-*` variables alongside existing `--sidebar-*`

---

## 2. Component Architecture

### New/Modified Components

```
┌─────────────────────────────────────────────────────────────────┐
│  LEFTPANEL (refactored left-rail.tsx)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  LeftRail (main container)                                │  │
│  │  ├── LeftRailHeader (brand + role toggle)                 │  │
│  │  │   ├── BrandZone                                        │  │
│  │  │   └── RoleToggle (admin-only)                          │  │
│  │  │                                                       │  │
│  │  ├── LeftRailNav (scrollable)                            │  │
│  │  │   ├── NavSection (Student OR Admin based on mode)     │  │
│  │  │   └── NavItem (repeating)                             │  │
│  │  │                                                       │  │
│  │  └── LeftRailFooter (pinned)                             │  │
│  │      ├── ThemeToggle                                      │  │
│  │      ├── CollapseToggle                                  │  │
│  │      ├── SignOut                                          │  │
│  │      └── ProfileCard                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Props Interface Updates

```typescript
// EXISTING (left-rail.tsx:27-32)
type LeftRailProps = {
  session: SessionPayload;
  currentPath?: string;
  isCollapsed: boolean;
  onToggle: () => void;
};

// NEW Extended Props
type LeftRailProps = {
  session: SessionPayload;
  currentPath?: string;
  isCollapsed: boolean;
  onToggle: () => void;
  // NEW: Role toggle state
  viewMode: "admin" | "student";
  onViewModeChange: (mode: "admin" | "student") => void;
  // NEW: Only pass if user is admin (for toggle visibility)
  isAdminUser?: boolean;
};
```

### State Management

| State | Location | Type | Notes |
|-------|----------|------|-------|
| `isCollapsed` | `auth-layout-wrapper.tsx` | `boolean` | Already exists, persists to localStorage |
| `viewMode` | `auth-layout-wrapper.tsx` | `"admin" \| "student"` | **NEW** — needs localStorage persistence |
| `isAdminSubmenuOpen` | `left-rail.tsx` | `boolean` | **REMOVE** — replaced by viewMode toggle |

### State Persistence Keys

```typescript
const RAIL_VIEWMODE_STORAGE_KEY = "learningo-rail-viewmode";

// Initialize from localStorage
function getInitialViewMode(isAdminUser: boolean): "admin" | "student" {
  if (!isAdminUser) return "student"; // Force student for non-admins
  if (typeof window === "undefined") return "admin"; // SSR default
  
  const stored = localStorage.getItem(RAIL_VIEWMODE_STORAGE_KEY);
  if (stored === "admin" || stored === "student") return stored;
  return "admin"; // Default admin users to admin view
}
```

---

## 3. Type Definitions

### New Types File: `learningopk/frontend/components/foundation/left-rail-types.ts`

```typescript
import type { Icon } from "@phosphor-icons/react";

// ============================================================
// VIEW MODE
// ============================================================

export type ViewMode = "admin" | "student";

// ============================================================
// NAVIGATION ITEMS
// ============================================================

/**
 * Represents a single navigation item
 */
export type NavItem = {
  /** URL path for the navigation link */
  href: string;
  /** Display label for the navigation item */
  label: string;
  /** Phosphor icon component */
  icon: Icon;
  /** Custom path matchers for active state (e.g., /admin/forum matches /admin/community) */
  matchers?: readonly string[];
};

/**
 * Represents a section of navigation items with an optional label
 */
export type NavSection = {
  /** Section label (visible in expanded state for Admin) */
  label?: string;
  /** Array of navigation items in this section */
  items: readonly NavItem[];
  /** Role-specific styling variant */
  variant: "student" | "admin";
};

// ============================================================
// ROLE TOGGLE
// ============================================================

export type RoleOption = {
  value: ViewMode;
  label: string;
  icon: Icon;
  /** CSS variable suffix for active state colors */
  accentVar: "admin" | "student";
};

// ============================================================
// COMPONENT PROPS
// ============================================================

export type LeftRailProps = {
  session: {
    user: {
      role: "admin" | "student";
      name?: string | null;
    };
  };
  currentPath?: string;
  isCollapsed: boolean;
  onToggle: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

// ============================================================
// ACTIVE STATE MATCHING
// ============================================================

/**
 * Determines if a path matches a target (exact match or prefix match)
 */
export const isPathMatch = (currentPath: string, target: string): boolean =>
  currentPath === target || currentPath.startsWith(`${target}/`);

/**
 * Determines if a nav item is currently active based on current path
 */
export const isNavItemActive = (
  item: NavItem,
  currentPath: string
): boolean => {
  const allPaths = [item.href, ...(item.matchers ?? [])];
  return allPaths.some((path) => isPathMatch(currentPath, path));
};
```

---

## 4. File Changes Required

### Files to CREATE

| File | Purpose | Priority |
|------|---------|----------|
| `learningopk/frontend/components/foundation/left-rail-types.ts` | Type definitions | **1** |
| `learningopk/frontend/components/foundation/nav-config.ts` | Navigation item data | **1** |
| `learningopk/frontend/components/foundation/role-toggle.tsx` | Role toggle component | **2** |

### Files to MODIFY

| File | Changes | Lines | Priority |
|------|---------|-------|----------|
| `learningopk/frontend/app/theme.css` | Add `--rail-*` CSS variables | 100-200 new lines | **1** |
| `learningopk/frontend/components/foundation/left-rail.tsx` | Full refactor | 471 total | **1** |
| `learningopk/frontend/components/foundation/auth-layout-wrapper.tsx` | Add viewMode state | +30 lines | **2** |

### Detailed Line References

#### `theme.css` (Additions after line 357)

**Insert Location**: After the `.sidebar-scroll::-webkit-scrollbar-thumb:hover` block

**New Variables to Add**:
- Lines 358-450: Container, Brand, Student Nav, Admin Nav, Role Toggle, Utility, Profile, Tooltip variables (light mode)
- Lines 451-550: Dark mode equivalents
- Lines 551-600: Animation keyframes

#### `left-rail.tsx` (Refactor Summary)

| Section | Current Lines | New Lines | Changes |
|---------|---------------|-----------|---------|
| Imports | 1-26 | 1-35 | Add types, icons |
| Type definitions | 27-45 | **REMOVE** | Move to types file |
| Helper functions | 47-57 | **KEEP** + add new | Move `isPathPrefix` to types |
| Nav config | 59-146 | **REMOVE** | Move to nav-config.ts |
| Main component | 72-470 | 100-450 | Full refactor |

#### `auth-layout-wrapper.tsx` (Additions)

| Location | Change | Lines |
|----------|--------|-------|
| After line 19 | Add `RAIL_VIEWMODE_STORAGE_KEY` | +1 |
| Line 20-27 | Add `getInitialViewMode` function | +8 |
| Line 38 (state) | Add `viewMode` state | +1 |
| Line 39-48 | Add `handleViewModeChange` | +10 |
| Line 54-59 | Pass viewMode props to LeftRail | +5 |

---

## 5. Navigation Item Configuration

### New File: `learningopk/frontend/components/foundation/nav-config.ts`

```typescript
import {
  House,
  Books,
  Robot,
  ChartPieSlice,
  ChatCircle,
  LayoutDashboard,
  Users,
  BookOpenCheck,
  Flag,
  MessagesSquare,
  BarChart3,
  ScrollText,
  Bell,
  Gear,
  ShieldCheck,
  GraduationCap,
} from "@phosphor-icons/react";
import type { NavItem, NavSection, RoleOption } from "./left-rail-types";

// ============================================================
// STUDENT NAVIGATION (5 items)
// ============================================================

export const studentNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/subjects", label: "Subjects", icon: Books },
  { href: "/ai-tutor", label: "AI Tutor", icon: Robot },
  { href: "/stats", label: "Stats", icon: ChartPieSlice },
  { href: "/forum", label: "Forum", icon: ChatCircle },
] as const satisfies readonly NavItem[];

export const studentNavSection: NavSection = {
  items: studentNavItems,
  variant: "student",
};

// ============================================================
// ADMIN NAVIGATION (10 items across 2 sections)
// ============================================================

const adminCommandItems = [
  { href: "/admin", label: "Command Center", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users, matchers: ["/admin/users/*"] },
  { href: "/admin/content", label: "Content", icon: BookOpenCheck },
  { href: "/admin/moderation", label: "Moderation", icon: Flag },
  { href: "/admin/community", label: "Community", icon: MessagesSquare, matchers: ["/admin/forum"] },
  { href: "/admin/forum", label: "Forum", icon: ChatCircle },
] as const satisfies readonly NavItem[];

const adminOperationsItems = [
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/audit", label: "Audit", icon: ScrollText },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Gear },
] as const satisfies readonly NavItem[];

export const adminNavSections: readonly NavSection[] = [
  {
    label: "COMMAND CENTER",
    items: adminCommandItems,
    variant: "admin",
  },
  {
    label: "OPERATIONS",
    items: adminOperationsItems,
    variant: "admin",
  },
];

// ============================================================
// ROLE TOGGLE OPTIONS
// ============================================================

export const roleOptions: readonly RoleOption[] = [
  {
    value: "admin",
    label: "Admin",
    icon: ShieldCheck,
    accentVar: "admin",
  },
  {
    value: "student",
    label: "Student",
    icon: GraduationCap,
    accentVar: "student",
  },
] as const;

// ============================================================
// UTILITY NAVIGATION
// ============================================================

export const utilityNavItems = [
  { href: "/settings", label: "Settings", icon: Gear },
] as const satisfies readonly NavItem[];
```

### Icon Mapping Summary

| Role | Item | Icon Name | Phosphor Import |
|------|------|-----------|-----------------|
| **Student** | Dashboard | House | `House` |
| | Subjects | Books | `Books` |
| | AI Tutor | Robot | `Robot` |
| | Stats | ChartPieSlice | `ChartPieSlice` |
| | Forum | ChatCircle | `ChatCircle` |
| **Admin** | Command Center | LayoutDashboard | `LayoutDashboard` |
| | Users | Users | `Users` |
| | Content | BookOpenCheck | `BookOpenCheck` |
| | Moderation | Flag | `Flag` |
| | Community | MessagesSquare | `MessagesSquare` |
| | Forum | ChatCircle | `ChatCircle` |
| | Analytics | BarChart3 | `BarChart3` |
| | Audit | ScrollText | `ScrollText` |
| | Notifications | Bell | `Bell` |
| | Settings | Gear | `Gear` |
| **Toggle** | Admin | ShieldCheck | `ShieldCheck` |
| | Student | GraduationCap | `GraduationCap` |

### Active State Matcher Logic

```typescript
// Special case: /admin/forum should highlight "Community" in admin nav
// This is handled by the matchers array in nav-config.ts

// Current implementation in admin-nav-config.ts (lines 38-43):
const pathMatches = (currentPath: string, targetPath: string): boolean =>
  currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);

export function isAdminNavItemActive(currentPath: string, item: AdminNavItem): boolean {
  const targets = [item.href, ...(item.matchers ?? [])];
  return targets.some((target) => pathMatches(currentPath, target));
}

// This logic will be centralized in left-rail-types.ts as isNavItemActive()
```

---

## 6. Role Toggle Implementation

### New Component: `role-toggle.tsx`

```tsx
"use client";

import { cn } from "@/lib/utils";
import type { ViewMode, RoleOption } from "./left-rail-types";
import { roleOptions } from "./nav-config";

interface RoleToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  className?: string;
}

export function RoleToggle({ currentMode, onModeChange, className }: RoleToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Navigation view"
      className={cn(
        "relative flex h-11 items-center rounded-xl",
        "bg-[var(--rail-toggle-container-bg)]",
        "border border-[var(--rail-toggle-container-border)]",
        "p-1 gap-1",
        className
      )}
    >
      {/* Sliding background indicator */}
      <div
        className={cn(
          "absolute inset-y-1 rounded-lg transition-all duration-200",
          "bg-white/80 dark:bg-slate-700/80",
          "shadow-sm backdrop-blur-sm"
        )}
        style={{
          width: "calc(50% - 4px)",
          left: currentMode === "admin" ? "4px" : "calc(50%)",
        }}
      />

      {roleOptions.map((option) => {
        const Icon = option.icon;
        const isActive = currentMode === option.value;

        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onModeChange(option.value)}
            className={cn(
              "relative z-10 flex flex-1 items-center justify-center gap-1.5",
              "h-9 rounded-lg px-3",
              "text-[13px] font-medium transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rail-focus-ring)]",
              isActive
                ? `text-[var(--rail-toggle-${option.accentVar}-active-text)]`
                : "text-[var(--rail-toggle-tab-default-text)] hover:text-[var(--rail-foreground)]"
            )}
          >
            <Icon
              className="h-4 w-4 shrink-0"
              weight={isActive ? "fill" : "regular"}
              aria-hidden
            />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

### Visibility Logic

```tsx
// In left-rail.tsx - Render role toggle ONLY if user is admin
{isAdmin && !isCollapsed && (
  <RoleToggle
    currentMode={viewMode}
    onModeChange={onViewModeChange}
    className="my-2"
  />
)}
```

### State Management Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     auth-layout-wrapper.tsx                     │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │ State:          │    │                                     │ │
│  │ viewMode:       │───▶│  Pass to LeftRail as prop          │ │
│  │ "admin"         │    │                                     │ │
│  └─────────────────┘    └─────────────────────────────────────┘ │
│           │                                                      │
│           │ onViewModeChange(mode)                              │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ Persist to      │                                            │
│  │ localStorage    │                                            │
│  │ (key: "learningo-rail-viewmode")                            │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. CSS/Tailwind Strategy

### Variable Naming Convention

| Prefix | Purpose | Example |
|--------|---------|---------|
| `--sidebar-*` | **EXISTING** - Original sidebar variables | `--sidebar-bg`, `--sidebar-border` |
| `--rail-*` | **NEW** - Unified rail variables (replaces sidebar) | `--rail-bg`, `--rail-border` |

**Note**: We will keep `--sidebar-*` for backward compatibility during transition, but new code will use `--rail-*`. Once refactor is complete, we can deprecate `--sidebar-*` in a future PR.

### New CSS Variables to Add (theme.css)

#### Container & Brand (after line 357)

```css
/* === UNIFIED RAIL: Container === */
--rail-bg: var(--sidebar-bg);
--rail-bg-gradient: var(--sidebar-bg-gradient);
--rail-foreground: var(--sidebar-foreground);
--rail-border: var(--sidebar-border);
--rail-shadow: var(--sidebar-shadow, 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 20px -5px rgba(0, 0, 0, 0.08));

/* === UNIFIED RAIL: Focus Ring === */
--rail-focus-ring: var(--sidebar-ring, #7ac943);

/* === UNIFIED RAIL: Brand Zone === */
--rail-brand-bg: transparent;
--rail-brand-text: var(--sidebar-brand-text);
--rail-brand-text-muted: var(--sidebar-brand-text-muted);
--rail-brand-logo-bg: var(--foreground);
--rail-brand-logo-icon: invert(1);

/* === UNIFIED RAIL: Student Navigation === */
--rail-student-default-bg: transparent;
--rail-student-default-text: #64748b;
--rail-student-default-icon: #94a3b8;
--rail-student-hover-bg: rgba(122, 201, 67, 0.08);
--rail-student-hover-text: #1e293b;
--rail-student-hover-icon: #64748b;
--rail-student-active-bg: linear-gradient(135deg, rgba(122, 201, 67, 0.15) 0%, rgba(122, 201, 67, 0.08) 100%);
--rail-student-active-text: #4a7c22;
--rail-student-active-icon: #7ac943;
--rail-student-active-shadow: 0 0 0 1px rgba(122, 201, 67, 0.3), 0 4px 12px -2px rgba(122, 201, 67, 0.25);
--rail-student-active-glow: 0 0 20px rgba(122, 201, 67, 0.15);

/* === UNIFIED RAIL: Admin Navigation === */
--rail-admin-default-bg: transparent;
--rail-admin-default-text: #a78bfa;
--rail-admin-default-icon: #c4b5fd;
--rail-admin-hover-bg: rgba(139, 92, 246, 0.1);
--rail-admin-hover-text: #7c3aed;
--rail-admin-hover-icon: #a78bfa;
--rail-admin-active-bg: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%);
--rail-admin-active-text: #6d28d9;
--rail-admin-active-icon: #8b5cf6;
--rail-admin-active-shadow: 0 0 0 1px rgba(139, 92, 246, 0.3), 0 4px 12px -2px rgba(139, 92, 246, 0.25);
--rail-admin-active-glow: 0 0 20px rgba(139, 92, 246, 0.15);

/* === UNIFIED RAIL: Role Toggle === */
--rail-toggle-container-bg: rgba(148, 163, 184, 0.08);
--rail-toggle-container-border: rgba(148, 163, 184, 0.15);
--rail-toggle-tab-default-bg: transparent;
--rail-toggle-tab-default-text: #64748b;
--rail-toggle-tab-hover-bg: rgba(148, 163, 184, 0.12);
--rail-toggle-admin-active-bg: rgba(139, 92, 246, 0.15);
--rail-toggle-admin-active-text: #6d28d9;
--rail-toggle-admin-active-icon: #8b5cf6;
--rail-toggle-student-active-bg: rgba(122, 201, 67, 0.15);
--rail-toggle-student-active-text: #4a7c22;
--rail-toggle-student-active-icon: #7ac943;

/* === UNIFIED RAIL: Utility Section === */
--rail-utility-default-text: #94a8b8;
--rail-utility-default-icon: #cbd5e1;
--rail-utility-hover-bg: rgba(148, 163, 184, 0.1);
--rail-utility-hover-text: #64748b;
--rail-utility-hover-icon: #94a3b8;

/* === UNIFIED RAIL: Profile Section === */
--rail-profile-bg: rgba(148, 163, 184, 0.05);
--rail-profile-border: rgba(148, 163, 184, 0.15);
--rail-profile-text: #1e293b;
--rail-profile-text-muted: #64748b;
--rail-profile-avatar-bg: linear-gradient(135deg, rgba(122, 201, 67, 0.15) 0%, rgba(122, 201, 67, 0.08) 100%);
--rail-profile-avatar-text: #4a7c22;

/* === UNIFIED RAIL: Dimensions === */
--rail-width-expanded: 280px;
--rail-width-collapsed: 72px;
--rail-height: 100vh;
--rail-padding-x: 16px;
--rail-padding-top: 20px;
--rail-padding-bottom: 16px;

/* === UNIFIED RAIL: Navigation Items === */
/* Student (larger) */
--rail-nav-student-item-height: 44px;
--rail-nav-student-item-radius: 12px;
--rail-nav-student-item-gap: 12px;
/* Admin (compact) */
--rail-nav-admin-item-height: 32px;
--rail-nav-admin-item-radius: 8px;
--rail-nav-admin-item-gap: 10px;

/* === UNIFIED RAIL: Transitions === */
--rail-transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--rail-transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
--rail-transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);

/* === UNIFIED RAIL: Tooltip === */
--rail-tooltip-offset: 8px;
--rail-tooltip-padding-x: 12px;
--rail-tooltip-padding-y: 6px;
--rail-tooltip-radius: 6px;
--rail-tooltip-delay: 300ms;
```

#### Dark Mode Additions (in `.dark { }` block after line 280)

```css
/* Override light mode values for dark mode */
--rail-brand-text: #f8fafc;
--rail-brand-text-muted: #94a3b8;
--rail-brand-logo-bg: #f8fafc;
--rail-brand-logo-icon: none;

--rail-student-default-text: #94a3b8;
--rail-student-default-icon: #64748b;
--rail-student-hover-bg: rgba(122, 201, 67, 0.12);
--rail-student-hover-text: #e2e8f0;
--rail-student-hover-icon: #94a3b8;
--rail-student-active-bg: linear-gradient(135deg, rgba(122, 201, 67, 0.2) 0%, rgba(122, 201, 67, 0.1) 100%);
--rail-student-active-text: #a3e072;
--rail-student-active-icon: #7ac943;
--rail-student-active-shadow: 0 0 0 1px rgba(122, 201, 67, 0.4), 0 4px 16px -2px rgba(122, 201, 67, 0.35), 0 0 30px rgba(122, 201, 67, 0.2);
--rail-student-active-glow: 0 0 30px rgba(122, 201, 67, 0.25);

--rail-admin-default-text: #a78bfa;
--rail-admin-default-icon: #7c3aed;
--rail-admin-hover-bg: rgba(139, 92, 246, 0.15);
--rail-admin-hover-text: #c4b5fd;
--rail-admin-hover-icon: #a78bfa;
--rail-admin-active-bg: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%);
--rail-admin-active-text: #ddd6fe;
--rail-admin-active-icon: #a78bfa;
--rail-admin-active-shadow: 0 0 0 1px rgba(139, 92, 246, 0.4), 0 4px 16px -2px rgba(139, 92, 246, 0.35), 0 0 30px rgba(139, 92, 246, 0.2);
--rail-admin-active-glow: 0 0 30px rgba(139, 92, 246, 0.25);

--rail-toggle-container-bg: rgba(30, 41, 59, 0.5);
--rail-toggle-container-border: rgba(71, 85, 105, 0.3);
--rail-toggle-tab-default-text: #94a3b8;
--rail-toggle-tab-hover-bg: rgba(148, 163, 184, 0.12);
--rail-toggle-admin-active-bg: rgba(139, 92, 246, 0.2);
--rail-toggle-admin-active-text: #ddd6fe;
--rail-toggle-admin-active-icon: #a78bfa;
--rail-toggle-student-active-bg: rgba(122, 201, 67, 0.2);
--rail-toggle-student-active-text: #a3e072;
--rail-toggle-student-active-icon: #7ac943;

--rail-utility-default-text: #64748b;
--rail-utility-default-icon: #475569;
--rail-utility-hover-bg: rgba(148, 163, 184, 0.12);
--rail-utility-hover-text: #94a3b8;
--rail-utility-hover-icon: #64748b;

--rail-profile-bg: rgba(30, 41, 59, 0.5);
--rail-profile-border: rgba(71, 85, 105, 0.3);
--rail-profile-text: #f1f5f9;
--rail-profile-text-muted: #94a3b8;
--rail-profile-avatar-bg: linear-gradient(135deg, rgba(122, 201, 67, 0.2) 0%, rgba(122, 201, 67, 0.1) 100%);
--rail-profile-avatar-text: #a3e072;

--rail-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 10px 20px -5px rgba(0, 0, 0, 0.4);
```

#### Animation Keyframes (after CSS variables)

```css
/* === UNIFIED RAIL: Animations === */

/* Active glow pulse */
@keyframes rail-glow-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.rail-active-glow::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: var(--rail-student-active-glow);
  border-radius: inherit;
  z-index: -1;
  animation: rail-glow-pulse 2s ease-in-out infinite;
  pointer-events: none;
}

.dark .rail-active-glow::before {
  animation-duration: 3s;
}

/* Role toggle slide */
@keyframes rail-tab-indicator {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .rail-active-glow::before {
    animation: none;
    opacity: 0.8;
  }
  
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Tailwind Class Mapping

| UI Spec Class | Tailwind Equivalent | CSS Variable |
|---------------|---------------------|--------------|
| `bg-[var(--rail-student-active-bg)]` | Use inline style | `--rail-student-active-bg` |
| `text-[var(--rail-student-active-text)]` | Use inline style | `--rail-student-active-text` |
| `h-11` | `h-[44px]` | `--rail-nav-student-item-height` |
| `rounded-xl` | `rounded-[12px]` | `--rail-nav-student-item-radius` |
| `gap-3` | `gap-[12px]` | `--rail-nav-student-item-gap` |
| `transition-all duration-150` | `transition-all` + `duration-150` | `--rail-transition-fast` |

---

## 8. Viewport Fit Strategy

### Height Budget Calculation

**Target**: All elements must fit within `100vh` without scrolling.

#### Student Mode (Expanded)
```
┌─────────────────────────────────────────┐
│ BRAND ZONE                    =  64px   │
│   - Logo container           =  44px   │
│   - Padding                  =  20px   │
├─────────────────────────────────────────┤
│ NAV SECTION                   = 220px   │
│   - 5 items × 44px           = 220px    │
├─────────────────────────────────────────┤
│ UTILITY SECTION               = 168px   │
│   - Theme Toggle     (44px)   =  44px   │
│   - Collapse        (40px)   =  40px   │
│   - Sign Out        (40px)   =  40px   │
│   - Profile         (64px)   =  64px   │
│   - Padding overlap (-20px)  = -20px   │
├─────────────────────────────────────────┤
│ PADDING (top + bottom)        =  36px   │
│   - Top padding       (20px) =  20px   │
│   - Bottom padding    (16px)=  16px   │
└─────────────────────────────────────────┘
TOTAL                             488px ✓
```
**Buffer**: 232px remaining (works for 720px+ viewports)

#### Admin Mode (Expanded)
```
┌─────────────────────────────────────────┐
│ BRAND ZONE                    =  64px   │
│ ROLE TOGGLE                   =  60px   │
│   - Toggle height     (44px) =  44px   │
│   - Margins          (16px) =  16px   │
├─────────────────────────────────────────┤
│ NAV SECTION                   = 300px   │
│   - COMMAND CENTER            = 200px   │
│     - Section label   (16px) =  16px   │
│     - 6 items × 32px (192px) = 192px   │
│   - Divider           (1px) =   1px    │
│   - OPERATIONS         (96px) =  96px  │
│     - Section label   (16px) =  16px   │
│     - 4 items × 32px (128px) = 128px   │
│   - Dividers          (4px)  =   4px   │
├─────────────────────────────────────────┤
│ UTILITY SECTION               = 168px   │
├─────────────────────────────────────────┤
│ PADDING                       =  36px   │
└─────────────────────────────────────────┘
TOTAL                             628px ✓
```
**Buffer**: 92px remaining (works for 720px+ viewports)

#### Collapsed Mode (Both Roles)
```
┌─────────────────────────────────────────┐
│ BRAND ZONE (centered)         =  64px   │
│   - Logo only, no text        =  44px   │
│   - Vertical padding         =  20px   │
├─────────────────────────────────────────┤
│ ROLE TOGGLE (HIDDEN)          =   0px   │
├─────────────────────────────────────────┤
│ NAV SECTION                   = 220px   │
│   - Compact layout            = 220px   │
├─────────────────────────────────────────┤
│ UTILITY SECTION               = 160px   │
│   - Theme Toggle     (44px)   =  44px   │
│   - Collapse        (44px)   =  44px   │
│   - Sign Out        (44px)   =  44px   │
│   - Profile         (48px)   =  48px   │
├─────────────────────────────────────────┤
│ PADDING                       =  36px   │
└─────────────────────────────────────────┘
TOTAL                             480px ✓
```

### Flexbox Layout Implementation

```tsx
// In left-rail.tsx - Main container structure
<aside
  className={cn(
    "fixed inset-y-0 left-0 z-40 flex flex-col",
    "border-r border-[var(--rail-border)] bg-[var(--rail-bg)]",
    "transition-[width] duration-350 ease-in-out",
    isCollapsed ? "w-[72px]" : "w-[280px]"
  )}
>
  {/* Scrollable content area - takes remaining space */}
  <div className="flex-1 overflow-y-auto overflow-x-hidden px-[var(--rail-padding-x)] py-[var(--rail-padding-top)]">
    {/* Brand Zone - fixed height */}
    <div className="shrink-0">
      {/* Brand content */}
    </div>

    {/* Role Toggle - fixed height (admin only) */}
    {isAdmin && !isCollapsed && (
      <div className="shrink-0">
        {/* Role toggle */}
      </div>
    )}

    {/* Navigation - flex-grow to fill available space */}
    <nav className="mt-4 flex-1">
      {/* Nav items rendered here */}
    </nav>
  </div>

  {/* Pinned Footer - always visible at bottom */}
  <div className="shrink-0 px-[var(--rail-padding-x)] py-4">
    {/* Utility items + Profile */}
  </div>
</aside>
```

### Overflow Prevention

```css
/* Prevent any internal scrolling of the rail itself */
.left-rail {
  overflow: hidden;
  height: 100vh;
  height: 100dvh; /* Dynamic viewport for mobile browsers */
}

/* Allow scrolling ONLY within nav section if content exceeds */
.left-rail-nav {
  flex: 1;
  min-height: 0; /* Critical for flex overflow */
  overflow-y: auto;
  overflow-x: hidden;
}
```

---

## 9. Collapse Behavior

### Collapse State Changes

| Element | Expanded (280px) | Collapsed (72px) |
|---------|-----------------|------------------|
| Brand Logo | 44×44px centered | 44×44px centered |
| Brand Text | Visible | Hidden |
| Role Toggle | Visible | **Hidden** |
| Nav Labels | Visible | Hidden |
| Nav Icons | 20×20px | 20×20px |
| Section Labels | Visible | Hidden (sr-only) |
| Dividers | Full width | 32px centered |
| Profile Avatar | 40×40px + text | 40×40px only |
| Profile Text | Visible | Hidden |
| Tooltips | None | On hover (300ms delay) |

### Tooltip Implementation

```tsx
// Tooltip wrapper component
interface NavItemWithTooltipProps {
  item: NavItem;
  isCollapsed: boolean;
  isActive: boolean;
  children: React.ReactNode;
}

function NavItemWithTooltip({ 
  item, 
  isCollapsed, 
  isActive, 
  children 
}: NavItemWithTooltipProps) {
  return (
    <div className="group relative">
      {children}
      
      {/* Tooltip - only visible when collapsed */}
      {isCollapsed && (
        <div
          className={cn(
            "pointer-events-none absolute left-full top-1/2 z-50",
            "-translate-y-1/2 translate-x-2",
            "rounded-md bg-[var(--foreground)] px-3 py-1.5",
            "text-sm font-medium text-[var(--background)]",
            "opacity-0 transition-opacity duration-150",
            "whitespace-nowrap shadow-lg",
            "before:absolute before:-left-2 before:top-1/2 before:-translate-y-1/2",
            "before:border-4 before:border-transparent before:border-r-[var(--foreground)]",
            "group-hover:opacity-100"
          )}
          style={{ transitionDelay: "300ms" }}
        >
          {item.label}
        </div>
      )}
    </div>
  );
}
```

### Tooltip Styling Details

```css
/* Tooltip positioning math:
 * Rail width: 72px (collapsed)
 * Item width: 44px (centered in rail)
 * Tooltip gap: 8px (--rail-tooltip-offset)
 * 
 * Position calculation:
 * left: 100% + 8px = right edge of rail + gap
 * top: 50% - translateY(50%)
 */

/* Arrow */
.tooltip::before {
  content: '';
  position: absolute;
  right: 100%; /* Align to left edge of tooltip */
  top: 50%;
  transform: translateY(-50%);
  border: 6px solid transparent;
  border-right-color: var(--foreground);
}
```

### State Persistence

```typescript
// In auth-layout-wrapper.tsx

const RAIL_STORAGE_KEY = "learningo-sidebar-collapsed";
const RAIL_VIEWMODE_STORAGE_KEY = "learningo-rail-viewmode";

function getInitialCollapsedState(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(RAIL_STORAGE_KEY);
  return stored === "true";
}

function getInitialViewMode(isAdminUser: boolean): "admin" | "student" {
  if (!isAdminUser) return "student";
  if (typeof window === "undefined") return "admin";
  
  const stored = localStorage.getItem(RAIL_VIEWMODE_STORAGE_KEY);
  if (stored === "admin" || stored === "student") return stored;
  return "admin";
}

export function AuthLayoutWrapper({ session, ... }) {
  const isAdminUser = session.user.role === "admin";
  
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsedState);
  const [viewMode, setViewMode] = useState(() => getInitialViewMode(isAdminUser));

  const handleToggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem(RAIL_STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  const handleViewModeChange = useCallback((mode: "admin" | "student") => {
    setViewMode(mode);
    localStorage.setItem(RAIL_VIEWMODE_STORAGE_KEY, mode);
  }, []);

  // ... render LeftRail with both states
}
```

---

## 10. Implementation Steps (Ordered)

### Phase 1: Foundation (Day 1)

#### Step 1.1: Create Type Definitions
**File**: `learningopk/frontend/components/foundation/left-rail-types.ts`

```typescript
// Create this file with all type definitions
// Include: ViewMode, NavItem, NavSection, RoleOption, LeftRailProps, isPathMatch, isNavItemActive
```

#### Step 1.2: Create Navigation Config
**File**: `learningopk/frontend/components/foundation/nav-config.ts`

```typescript
// Create this file with all nav item data
// Include: studentNavItems, studentNavSection, adminNavSections, roleOptions, utilityNavItems
```

#### Step 1.3: Add CSS Variables
**File**: `learningopk/frontend/app/theme.css`

```css
/* Add all --rail-* variables after existing --sidebar-* variables */
/* Include light mode, dark mode, and animation keyframes */
```

**Testing**: Verify theme changes don't break existing components.

---

### Phase 2: Components (Day 2)

#### Step 2.1: Create Role Toggle Component
**File**: `learningopk/frontend/components/foundation/role-toggle.tsx`

```tsx
// Implement RoleToggle with sliding indicator animation
// Test keyboard navigation (arrow keys between tabs)
```

#### Step 2.2: Refactor LeftRail Component
**File**: `learningopk/frontend/components/foundation/left-rail.tsx`

**Sub-step 2.2.1: Update Imports**
- Add new icon imports (GraduationCap)
- Import types from left-rail-types.ts
- Import nav config from nav-config.ts
- Import RoleToggle

**Sub-step 2.2.2: Update Props Interface**
```typescript
type LeftRailProps = {
  session: SessionPayload;
  currentPath?: string;
  isCollapsed: boolean;
  onToggle: () => void;
  viewMode: "admin" | "student";
  onViewModeChange: (mode: "admin" | "student") => void;
};
```

**Sub-step 2.2.3: Remove Old Code**
- Delete inline type definitions (RailLink, SubmenuItem)
- Delete inline nav item arrays (primaryLinks, secondaryLinks, adminSubmenuItems)
- Delete renderAdminSubmenu function
- Delete isPathPrefix and getInitials (move to types)

**Sub-step 2.2.4: Implement New Structure**
```tsx
export function LeftRail({ session, viewMode, onViewModeChange, ... }) {
  const isAdmin = session.user.role === "admin";
  const isAdminUser = isAdmin && viewMode === "admin";
  
  // Use nav config based on viewMode
  const currentNavSections = viewMode === "admin" 
    ? adminNavSections 
    : [studentNavSection];
  
  // ... render new structure
}
```

**Sub-step 2.2.5: Implement NavItem Component**
- Create reusable NavItem component with tooltip support
- Apply correct CSS classes based on variant (student vs admin)
- Handle active state with proper color variables

**Sub-step 2.2.6: Implement Role Toggle Visibility**
```tsx
{isAdmin && !isCollapsed && (
  <RoleToggle currentMode={viewMode} onModeChange={onViewModeChange} />
)}
```

**Testing**: Verify all nav items render correctly for both roles.

---

### Phase 3: State Management (Day 2-3)

#### Step 3.1: Update Auth Layout Wrapper
**File**: `learningopk/frontend/components/foundation/auth-layout-wrapper.tsx`

**Changes**:
1. Add `RAIL_VIEWMODE_STORAGE_KEY` constant
2. Add `getInitialViewMode` function
3. Add `viewMode` state
4. Add `handleViewModeChange` callback
5. Pass new props to `LeftRail`

**Testing**: 
- Verify viewMode persists across page refreshes
- Verify non-admin users always see student view
- Verify collapse state still works

---

### Phase 4: Polish & Testing (Day 3)

#### Step 4.1: Tooltip Refinement
- Ensure 300ms delay before tooltip appears
- Verify tooltip doesn't overflow viewport
- Test on mobile (collapsed by default)

#### Step 4.2: Animation Polish
- Add rail-active-glow class with pulse animation
- Verify role toggle sliding indicator works smoothly
- Test reduced motion preferences

#### Step 4.3: Accessibility Testing
- Tab through all nav items
- Verify role toggle works with arrow keys
- Test screen reader announcements for role changes
- Verify all interactive elements have focus indicators

#### Step 4.4: Visual QA
- Compare expanded vs collapsed states
- Verify role-specific colors (lime vs purple)
- Check dark mode appearance
- Verify profile avatar displays correctly

---

## 11. Key Code Snippets

### Type Definitions (left-rail-types.ts)

```typescript
import type { Icon } from "@phosphor-icons/react";

// ============================================================
// VIEW MODE
// ============================================================

export type ViewMode = "admin" | "student";

// ============================================================
// NAVIGATION ITEMS
// ============================================================

export type NavItem = {
  href: string;
  label: string;
  icon: Icon;
  matchers?: readonly string[];
};

export type NavSection = {
  label?: string;
  items: readonly NavItem[];
  variant: "student" | "admin";
};

// ============================================================
// ROLE TOGGLE
// ============================================================

export type RoleOption = {
  value: ViewMode;
  label: string;
  icon: Icon;
  accentVar: "admin" | "student";
};

// ============================================================
// COMPONENT PROPS
// ============================================================

export type LeftRailProps = {
  session: {
    user: {
      role: "admin" | "student";
      name?: string | null;
    };
  };
  currentPath?: string;
  isCollapsed: boolean;
  onToggle: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

export const isPathMatch = (currentPath: string, target: string): boolean =>
  currentPath === target || currentPath.startsWith(`${target}/`);

export const isNavItemActive = (item: NavItem, currentPath: string): boolean => {
  const allPaths = [item.href, ...(item.matchers ?? [])];
  return allPaths.some((path) => isPathMatch(currentPath, path));
};

export const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
```

### Navigation Config (nav-config.ts)

```typescript
import {
  House,
  Books,
  Robot,
  ChartPieSlice,
  ChatCircle,
  LayoutDashboard,
  Users,
  BookOpenCheck,
  Flag,
  MessagesSquare,
  BarChart3,
  ScrollText,
  Bell,
  Gear,
  ShieldCheck,
  GraduationCap,
} from "@phosphor-icons/react";
import type { NavItem, NavSection, RoleOption } from "./left-rail-types";

// STUDENT NAVIGATION (5 items)
export const studentNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/subjects", label: "Subjects", icon: Books },
  { href: "/ai-tutor", label: "AI Tutor", icon: Robot },
  { href: "/stats", label: "Stats", icon: ChartPieSlice },
  { href: "/forum", label: "Forum", icon: ChatCircle },
] as const satisfies readonly NavItem[];

export const studentNavSection: NavSection = {
  items: studentNavItems,
  variant: "student",
};

// ADMIN NAVIGATION (10 items)
export const adminNavSections: readonly NavSection[] = [
  {
    label: "COMMAND CENTER",
    items: [
      { href: "/admin", label: "Command Center", icon: LayoutDashboard },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/content", label: "Content", icon: BookOpenCheck },
      { href: "/admin/moderation", label: "Moderation", icon: Flag },
      { href: "/admin/community", label: "Community", icon: MessagesSquare, matchers: ["/admin/forum"] },
      { href: "/admin/forum", label: "Forum", icon: ChatCircle },
    ] as const,
    variant: "admin",
  },
  {
    label: "OPERATIONS",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/audit", label: "Audit", icon: ScrollText },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
      { href: "/admin/settings", label: "Settings", icon: Gear },
    ] as const,
    variant: "admin",
  },
];

// ROLE TOGGLE
export const roleOptions: readonly RoleOption[] = [
  { value: "admin", label: "Admin", icon: ShieldCheck, accentVar: "admin" },
  { value: "student", label: "Student", icon: GraduationCap, accentVar: "student" },
] as const;
```

### Role Toggle Component (role-toggle.tsx)

```tsx
"use client";

import { cn } from "@/lib/utils";
import type { ViewMode, RoleOption } from "./left-rail-types";
import { roleOptions } from "./nav-config";

interface RoleToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  className?: string;
}

export function RoleToggle({ currentMode, onModeChange, className }: RoleToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Navigation view"
      className={cn(
        "relative flex h-11 items-center rounded-xl",
        "bg-[var(--rail-toggle-container-bg)]",
        "border border-[var(--rail-toggle-container-border)]",
        "p-1 gap-1",
        className
      )}
    >
      {/* Sliding indicator */}
      <div
        className={cn(
          "absolute inset-y-1 rounded-lg bg-white/80 shadow-sm",
          "transition-all duration-200 dark:bg-slate-700/80",
          "backdrop-blur-sm"
        )}
        style={{
          width: "calc(50% - 4px)",
          left: currentMode === "admin" ? "4px" : "calc(50%)",
        }}
      />

      {roleOptions.map((option) => {
        const Icon = option.icon;
        const isActive = currentMode === option.value;

        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onModeChange(option.value)}
            className={cn(
              "relative z-10 flex flex-1 items-center justify-center gap-1.5",
              "h-9 rounded-lg px-3",
              "text-[13px] font-medium transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rail-focus-ring)]",
              isActive
                ? `text-[var(--rail-toggle-${option.accentVar}-active-text)]`
                : "text-[var(--rail-toggle-tab-default-text)] hover:text-[var(--rail-foreground)]"
            )}
          >
            <Icon
              className="h-4 w-4 shrink-0"
              weight={isActive ? "fill" : "regular"}
              aria-hidden
            />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

### NavItem Component (within left-rail.tsx)

```tsx
interface NavItemComponentProps {
  item: NavItem;
  variant: "student" | "admin";
  isCollapsed: boolean;
  isActive: boolean;
  currentPath: string;
}

function NavItemComponent({
  item,
  variant,
  isCollapsed,
  isActive,
  currentPath,
}: NavItemComponentProps) {
  const LinkIcon = item.icon;
  const isStudent = variant === "student";

  // CSS variable prefixes
  const prefix = isStudent ? "student" : "admin";

  const baseClasses = cn(
    "group relative flex items-center transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rail-focus-ring)]",
    isStudent
      ? "rounded-xl h-11" // Student: larger
      : "rounded-lg h-8", // Admin: compact
    isCollapsed
      ? "w-11 justify-center mx-auto"
      : "w-full gap-3 px-3",
    isActive
      ? [
          "bg-[var(--rail-nav-active-bg)]",
          "text-[var(--rail-nav-active-text)]",
          "shadow-[var(--rail-nav-active-shadow)]",
          "rail-active-glow",
        ]
      : [
          "text-[var(--rail-nav-default-text)]",
          "hover:bg-[var(--rail-nav-hover-bg)]",
          "hover:text-[var(--rail-nav-hover-text)]",
        ]
  );

  return (
    <div className="relative group">
      <Link
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        title={isCollapsed ? item.label : undefined}
        className={baseClasses}
      >
        <LinkIcon
          className={cn("shrink-0 transition-all duration-150", isStudent ? "h-5 w-5" : "h-[18px] w-[18px]")}
          weight={isActive ? "fill" : "regular"}
          aria-hidden
        />
        {!isCollapsed && (
          <span className={cn(
            "truncate",
            isStudent ? "text-sm font-medium" : "text-[13px] font-medium leading-tight"
          )}>
            {item.label}
          </span>
        )}
      </Link>

      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div
          className={cn(
            "pointer-events-none absolute left-full top-1/2 z-50",
            "-translate-y-1/2 translate-x-2",
            "rounded-md bg-[var(--foreground)] px-3 py-1.5",
            "text-sm font-medium text-[var(--background)]",
            "opacity-0 transition-opacity duration-150",
            "whitespace-nowrap shadow-lg",
            "before:absolute before:-left-2 before:top-1/2 before:-translate-y-1/2",
            "before:border-4 before:border-transparent before:border-r-[var(--foreground)]",
            "group-hover:opacity-100"
          )}
          style={{ transitionDelay: "300ms" }}
        >
          {item.label}
        </div>
      )}
    </div>
  );
}
```

### LeftRail Main Component (left-rail.tsx - Skeleton)

```tsx
"use client";

import {
  CaretDoubleLeft,
  CaretDoubleRight,
  SignOut,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggleCompact } from "@/components/ui/theme-toggle";
import type { LeftRailProps, ViewMode } from "./left-rail-types";
import { 
  studentNavSection, 
  adminNavSections, 
  isNavItemActive, 
  getInitials 
} from "./nav-config";
import { RoleToggle } from "./role-toggle";
import { cn } from "@/lib/utils";

export function LeftRail({
  session,
  currentPath = "/",
  isCollapsed,
  onToggle,
  viewMode,
  onViewModeChange,
}: LeftRailProps) {
  const isAdmin = session.user.role === "admin";
  
  // Determine which nav sections to show based on viewMode
  const navSections = viewMode === "admin" && isAdmin
    ? adminNavSections
    : [studentNavSection];

  const displayName = useMemo(() => {
    const trimmed = session.user.name?.trim();
    return trimmed?.length ? trimmed : "LearningoPK";
  }, [session.user.name]);

  const truncatedName = useMemo(() => {
    return displayName.length > 20 ? displayName.slice(0, 20) + "..." : displayName;
  }, [displayName]);

  const avatarInitials = getInitials(displayName);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col",
        "border-r border-[var(--rail-border)] bg-[var(--rail-bg)]",
        "transition-[width] duration-350 ease-in-out",
        "shadow-[var(--rail-shadow)]",
        isCollapsed ? "w-[72px]" : "w-[280px]"
      )}
      data-testid="left-rail"
      data-collapsed={isCollapsed}
    >
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-[var(--rail-padding-x)] py-[var(--rail-padding-top)]">
        
        {/* Brand Zone */}
        <div className={cn("mb-4 shrink-0 flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
          <Link
            href="/dashboard"
            aria-label="LearningoPK Home"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--foreground)] p-2 shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            <Image src="/new_logo.png" alt="Logo" width={28} height={28} className="h-7 w-7 rounded-lg object-cover invert" priority />
          </Link>
          {!isCollapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-base font-semibold text-[var(--rail-brand-text)] tracking-tight">LearningoPK</span>
              <span className="truncate text-xs text-[var(--rail-brand-text-muted)]">Welcome back</span>
            </div>
          )}
        </div>

        {/* Role Toggle (Admin only, visible when expanded) */}
        {isAdmin && !isCollapsed && (
          <RoleToggle currentMode={viewMode} onModeChange={onViewModeChange} className="my-2" />
        )}

        {/* Navigation */}
        <nav aria-label="Main navigation">
          {navSections.map((section, sectionIndex) => (
            <div key={section.label ?? sectionIndex}>
              {/* Section Label (Admin only, hidden when collapsed) */}
              {section.label && !isCollapsed && (
                <div className="mb-1 mt-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--rail-admin-default-text)] opacity-70">
                  {section.label}
                </div>
              )}

              {/* Section Items */}
              <div className="flex w-full flex-col gap-1">
                {section.items.map((item) => (
                  <NavItemComponent
                    key={item.href}
                    item={item}
                    variant={section.variant}
                    isCollapsed={isCollapsed}
                    isActive={isNavItemActive(item, currentPath)}
                    currentPath={currentPath}
                  />
                ))}
              </div>

              {/* Section Divider (between admin sections) */}
              {sectionIndex < navSections.length - 1 && (
                <div className={cn("my-3 h-px bg-[var(--rail-border)] opacity-50", isCollapsed && "mx-auto w-8")} />
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Pinned Footer */}
      <div className="shrink-0 px-[var(--rail-padding-x)] py-4 space-y-1">
        <ThemeToggleCompact isCollapsed={isCollapsed} />

        <button
          type="button"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggle}
          className={cn(
            "group flex h-10 w-full items-center rounded-xl text-[var(--rail-utility-default-text)] transition-all duration-150",
            "hover:bg-[var(--rail-utility-hover-bg)] hover:text-[var(--rail-utility-hover-text)]",
            isCollapsed ? "justify-center" : "gap-3 px-3"
          )}
        >
          {isCollapsed ? (
            <CaretDoubleRight className="h-5 w-5 shrink-0" aria-hidden />
          ) : (
            <>
              <CaretDoubleLeft className="h-5 w-5 shrink-0" aria-hidden />
              <span className="truncate text-sm font-medium">Collapse</span>
            </>
          )}
        </button>

        <LogoutButton
          ariaLabel="Sign out"
          icon={<SignOut className="h-5 w-5 shrink-0 transition-colors duration-150" aria-hidden />}
          hideLabel={isCollapsed}
          className={cn(
            "group flex h-10 w-full items-center rounded-xl border-0 bg-transparent transition-all duration-150",
            isCollapsed
              ? "justify-center text-[var(--rail-utility-default-text)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/8"
              : "gap-3 px-3 text-[var(--rail-utility-default-text)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/8"
          )}
          labelClassName="truncate text-sm font-medium transition-colors duration-150"
        />

        <Link
          href="/settings"
          aria-label={`Profile: ${displayName}`}
          title={isCollapsed ? displayName : undefined}
          className={cn(
            "group flex items-center rounded-2xl border border-[var(--rail-profile-border)] bg-[var(--rail-profile-bg)] p-3 transition-all duration-150",
            "hover:border-[var(--rail-border)] hover:bg-[var(--rail-student-hover-bg)]",
            isCollapsed ? "justify-center p-2" : "gap-3"
          )}
        >
          <div className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-[var(--rail-profile-avatar-bg)]",
            "text-[var(--rail-profile-avatar-text)] text-sm font-bold transition-all duration-150 group-hover:scale-105",
            "h-10 w-10"
          )}>
            {avatarInitials}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--rail-profile-text)]">{truncatedName}</p>
              <p className="truncate text-xs text-[var(--rail-profile-text-muted)]">View Profile</p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
```

### Auth Layout Wrapper Update

```tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";

import { LeftRail } from "@/components/foundation/left-rail";
import type { SessionPayload } from "@/lib/session";
import { cn } from "@/lib/utils";

type AuthLayoutWrapperProps = {
  children: ReactNode;
  session: SessionPayload;
  currentPath?: string;
  className?: string;
};

const RAIL_COLLAPSED_WIDTH = "72px";
const RAIL_EXPANDED_WIDTH = "280px";
const RAIL_COLLAPSED_STORAGE_KEY = "learningo-sidebar-collapsed";
const RAIL_VIEWMODE_STORAGE_KEY = "learningo-rail-viewmode";

function getInitialCollapsedState(): boolean {
  if (typeof window === "undefined") return true;
  if (typeof localStorage === "undefined") return true;
  const stored = localStorage.getItem(RAIL_COLLAPSED_STORAGE_KEY);
  if (stored === null) return true;
  return stored === "true";
}

function getInitialViewMode(isAdminUser: boolean): "admin" | "student" {
  if (!isAdminUser) return "student";
  if (typeof window === "undefined") return "admin";
  const stored = localStorage.getItem(RAIL_VIEWMODE_STORAGE_KEY);
  if (stored === "admin" || stored === "student") return stored;
  return "admin";
}

export function AuthLayoutWrapper({
  children,
  session,
  currentPath,
  className,
}: AuthLayoutWrapperProps) {
  const isAdminUser = session.user.role === "admin";
  
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsedState);
  const [viewMode, setViewMode] = useState(() => getInitialViewMode(isAdminUser));
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleToggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem(RAIL_COLLAPSED_STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  const handleViewModeChange = useCallback((mode: "admin" | "student") => {
    setViewMode(mode);
    localStorage.setItem(RAIL_VIEWMODE_STORAGE_KEY, mode);
  }, []);

  // Enforce student mode for non-admin users
  useEffect(() => {
    if (!isAdminUser && viewMode !== "student") {
      setViewMode("student");
    }
  }, [isAdminUser, viewMode]);

  const sidebarWidth = isHydrated && !isCollapsed ? RAIL_EXPANDED_WIDTH : RAIL_COLLAPSED_WIDTH;

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <LeftRail
        session={session}
        currentPath={currentPath}
        isCollapsed={!isHydrated ? true : isCollapsed}
        onToggle={handleToggle}
        viewMode={isAdminUser ? viewMode : "student"}
        onViewModeChange={handleViewModeChange}
      />
      <main
        id="main-content"
        className={cn(
          "flex-1 min-w-0 transition-[margin] duration-350 ease-in-out",
          className
        )}
        style={{ marginLeft: sidebarWidth }}
      >
        {children}
      </main>
    </div>
  );
}
```

---

## 12. Testing Checklist

### Functional Testing

| Test | Expected Result | Pass/Fail |
|------|-----------------|-----------|
| Admin user sees role toggle | Toggle visible in rail | ☐ |
| Non-admin user doesn't see role toggle | Toggle hidden | ☐ |
| Toggle switches to Student view | 5 nav items shown | ☐ |
| Toggle switches to Admin view | 10 nav items shown | ☐ |
| ViewMode persists after refresh | localStorage value respected | ☐ |
| Non-admin users always see Student view | Even if localStorage says "admin" | ☐ |
| Collapsed state hides role toggle | Toggle not rendered when collapsed | ☐ |
| Collapsed state shows tooltips | 300ms delay before appearing | ☐ |
| Active state on nav items | Correct highlight with glow | ☐ |
| /admin/forum highlights Community | Matchers work correctly | ☐ |

### Visual Testing

| Test | Expected Result | Pass/Fail |
|------|-----------------|-----------|
| Student mode uses lime green accent | Active items glow lime | ☐ |
| Admin mode uses purple accent | Active items glow purple | ☐ |
| Dark mode colors correct | All CSS vars update | ☐ |
| Collapsed rail is 72px | Matches spec | ☐ |
| Expanded rail is 280px | Matches spec | ☐ |
| Profile avatar displays initials | 2-letter initials, uppercase | ☐ |
| Profile text truncates at 20 chars | "John Doe Smith..." at 20+ | ☐ |

### Accessibility Testing

| Test | Expected Result | Pass/Fail |
|------|-----------------|-----------|
| Tab key navigates all items | Logical focus order | ☐ |
| Enter/Space activates links | Navigation works | ☐ |
| Arrow keys switch role tabs | Toggle keyboard accessible | ☐ |
| Screen reader announces role | "Switched to Admin view" | ☐ |
| aria-current on active item | "page" value set | ☐ |
| Focus visible indicators | Ring appears on focus | ☐ |
| Reduced motion preference | No animations | ☐ |

### Performance Testing

| Test | Expected Result | Pass/Fail |
|------|-----------------|-----------|
| No layout shift on collapse | Smooth 350ms transition | ☐ |
| No FOUC on page load | localStorage values applied | ☐ |
| No scrolling in rail | All items fit in 100vh | ☐ |

---

## Appendix: File Manifest

### Created Files

```
learningopk/frontend/components/foundation/
├── left-rail-types.ts    (NEW - Type definitions)
├── nav-config.ts         (NEW - Navigation data)
├── role-toggle.tsx       (NEW - Role toggle component)
└── left-rail.tsx         (MODIFIED - Main refactor)
```

### Modified Files

```
learningopk/frontend/
├── app/
│   └── theme.css          (ADD - --rail-* variables)
└── components/
    └── foundation/
        └── auth-layout-wrapper.tsx  (ADD - viewMode state)
```

---

**Implementation Plan Created**: March 21, 2026  
**Estimated Implementation Time**: 3 days  
**Dependencies**: Phosphor Icons (already installed), existing session/sidebar infrastructure
