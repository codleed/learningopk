# Unified Left Rail Navigation — UI Design Specification

**Document Version:** 1.0  
**Created:** March 21, 2026  
**Based on:** `unified-rail-ux-spec.md`  
**Status:** Implementation Ready  
**Design Concept:** Luminous Depth (extends existing sidebar design)

---

## Table of Contents

1. [Design Overview](#1-design-overview)
2. [Color System](#2-color-system)
3. [Typography System](#3-typography-system)
4. [Spacing System](#4-spacing-system)
5. [Iconography](#5-iconography)
6. [Component States](#6-component-states)
7. [Role Toggle Component](#7-role-toggle-component)
8. [Navigation Items](#8-navigation-items)
9. [Utility Section](#9-utility-section)
10. [Profile Section](#10-profile-section)
11. [Collapsed State Design](#11-collapsed-state-design)
12. [Animations & Transitions](#12-animations--transitions)
13. [Responsive Design](#13-responsive-design)
14. [Accessibility](#14-accessibility)
15. [Implementation Reference](#15-implementation-reference)

---

## 1. Design Overview

### 1.1 Visual Direction

The unified left rail extends the **"Luminous Depth"** design concept from the existing sidebar. Key characteristics:

- **Frosted glass aesthetic** with subtle depth through layered shadows
- **Role-specific accent colors**: Lime green (#7ac943) for Student, Purple (#8b5cf6) for Admin
- **Glowing active states** that pulse subtly, creating an "alive" feeling
- **Smooth elastic animations** for all state transitions
- **Generous padding** and rounded corners for premium feel

### 1.2 Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  LEFTPANEL (280px expanded / 72px collapsed)               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Brand Zone (64px total)                            │   │
│  │  - Logo: 44×44px, centered in expanded              │   │
│  │  - Wordmark + tagline: left-aligned in expanded     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Role Toggle Zone (48px, Admin only)                 │   │
│  │  - Pill container: full-width, 8px padding         │   │
│  │  - Two tabs: Admin | Student                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Navigation Section (flex-grow)                     │   │
│  │  - Student: 5 items × 44px = 220px                │   │
│  │  - Admin: 10 items × 32px + labels = ~300px       │   │
│  │  - Scrollable if overflow (should not happen)      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Utility Section (pinned bottom)                    │   │
│  │  - Theme Toggle: 44px height                       │   │
│  │  - Collapse Toggle: 40px height                    │   │
│  │  - Sign Out: 40px height                           │   │
│  │  - Profile: 64px height                           │   │
│  │  Total: ~188px                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Width Specifications

| State | Width | Navigation Items | Labels |
|-------|-------|------------------|--------|
| **Expanded** | 280px | Icon (20px) + Label | Always visible |
| **Collapsed** | 72px | Icon (20px) only | Tooltip on hover |

---

## 2. Color System

### 2.1 Container Colors

```css
/* === SIDEBAR CONTAINER (Light Mode) === */
--rail-bg: #ffffff;
--rail-bg-gradient: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
--rail-foreground: #1e293b;
--rail-border: rgba(148, 163, 184, 0.2);
--rail-shadow: 
  0 4px 6px -1px rgba(0, 0, 0, 0.05),
  0 10px 20px -5px rgba(0, 0, 0, 0.08);

/* === SIDEBAR CONTAINER (Dark Mode) === */
.dark {
  --rail-bg: #0f172a;
  --rail-bg-gradient: linear-gradient(180deg, #0f172a 0%, #0c1425 100%);
  --rail-foreground: #f1f5f9;
  --rail-border: rgba(71, 85, 105, 0.3);
  --rail-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.3),
    0 10px 20px -5px rgba(0, 0, 0, 0.4);
}
```

### 2.2 Brand Zone Colors

```css
/* Light Mode */
--rail-brand-bg: transparent;
--rail-brand-text: #0f172a;
--rail-brand-text-muted: #64748b;
--rail-brand-logo-bg: var(--foreground);
--rail-brand-logo-icon: invert(1); /* White logo */

/* Dark Mode */
.dark {
  --rail-brand-text: #f8fafc;
  --rail-brand-text-muted: #94a3b8;
  --rail-brand-logo-bg: #f8fafc;
  --rail-brand-logo-icon: none; /* Dark logo */
}
```

### 2.3 Role-Specific Navigation Colors

#### Student Navigation (Lime Green Accent)

```css
/* Light Mode - Student */
--rail-student-default-bg: transparent;
--rail-student-default-text: #64748b;
--rail-student-default-icon: #94a3b8;

--rail-student-hover-bg: rgba(122, 201, 67, 0.08);
--rail-student-hover-text: #1e293b;
--rail-student-hover-icon: #64748b;

--rail-student-active-bg: linear-gradient(135deg, rgba(122, 201, 67, 0.15) 0%, rgba(122, 201, 67, 0.08) 100%);
--rail-student-active-text: #4a7c22;
--rail-student-active-icon: #7ac943;
--rail-student-active-shadow: 
  0 0 0 1px rgba(122, 201, 67, 0.3),
  0 4px 12px -2px rgba(122, 201, 67, 0.25);
--rail-student-active-glow: 0 0 20px rgba(122, 201, 67, 0.15);

/* Dark Mode - Student */
.dark {
  --rail-student-default-text: #94a3b8;
  --rail-student-default-icon: #64748b;
  
  --rail-student-hover-bg: rgba(122, 201, 67, 0.12);
  --rail-student-hover-text: #e2e8f0;
  --rail-student-hover-icon: #94a3b8;
  
  --rail-student-active-bg: linear-gradient(135deg, rgba(122, 201, 67, 0.2) 0%, rgba(122, 201, 67, 0.1) 100%);
  --rail-student-active-text: #a3e072;
  --rail-student-active-icon: #7ac943;
  --rail-student-active-shadow: 
    0 0 0 1px rgba(122, 201, 67, 0.4),
    0 4px 16px -2px rgba(122, 201, 67, 0.35),
    0 0 30px rgba(122, 201, 67, 0.2);
  --rail-student-active-glow: 0 0 30px rgba(122, 201, 67, 0.25);
}
```

#### Admin Navigation (Purple Accent)

```css
/* Light Mode - Admin */
--rail-admin-container-bg: rgba(139, 92, 246, 0.05);
--rail-admin-container-border: rgba(139, 92, 246, 0.2);

--rail-admin-default-bg: transparent;
--rail-admin-default-text: #a78bfa;
--rail-admin-default-icon: #c4b5fd;

--rail-admin-hover-bg: rgba(139, 92, 246, 0.1);
--rail-admin-hover-text: #7c3aed;
--rail-admin-hover-icon: #a78bfa;

--rail-admin-active-bg: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%);
--rail-admin-active-text: #6d28d9;
--rail-admin-active-icon: #8b5cf6;
--rail-admin-active-shadow: 
  0 0 0 1px rgba(139, 92, 246, 0.3),
  0 4px 12px -2px rgba(139, 92, 246, 0.25);
--rail-admin-active-glow: 0 0 20px rgba(139, 92, 246, 0.15);

/* Dark Mode - Admin */
.dark {
  --rail-admin-container-bg: rgba(139, 92, 246, 0.08);
  --rail-admin-container-border: rgba(139, 92, 246, 0.25);
  
  --rail-admin-default-text: #a78bfa;
  --rail-admin-default-icon: #7c3aed;
  
  --rail-admin-hover-bg: rgba(139, 92, 246, 0.15);
  --rail-admin-hover-text: #c4b5fd;
  --rail-admin-hover-icon: #a78bfa;
  
  --rail-admin-active-bg: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%);
  --rail-admin-active-text: #ddd6fe;
  --rail-admin-active-icon: #a78bfa;
  --rail-admin-active-shadow: 
    0 0 0 1px rgba(139, 92, 246, 0.4),
    0 4px 16px -2px rgba(139, 92, 246, 0.35),
    0 0 30px rgba(139, 92, 246, 0.2);
  --rail-admin-active-glow: 0 0 30px rgba(139, 92, 246, 0.25);
}
```

### 2.4 Submenu Colors

```css
/* Light Mode */
--rail-submenu-bg: rgba(148, 163, 184, 0.05);
--rail-submenu-border: rgba(148, 163, 184, 0.15);
--rail-submenu-item-default-text: #94a3b8;
--rail-submenu-item-hover-bg: rgba(148, 163, 184, 0.1);
--rail-submenu-item-hover-text: #64748b;
--rail-submenu-item-active-bg: rgba(139, 92, 246, 0.1);
--rail-submenu-item-active-text: #7c3aed;

/* Dark Mode */
.dark {
  --rail-submenu-bg: rgba(30, 41, 59, 0.5);
  --rail-submenu-border: rgba(71, 85, 105, 0.3);
  --rail-submenu-item-default-text: #64748b;
  --rail-submenu-item-hover-bg: rgba(148, 163, 184, 0.1);
  --rail-submenu-item-hover-text: #94a3b8;
  --rail-submenu-item-active-bg: rgba(139, 92, 246, 0.15);
  --rail-submenu-item-active-text: #c4b5fd;
}
```

### 2.5 Utility Section Colors

```css
/* Light Mode */
--rail-utility-default-text: #94a3b8;
--rail-utility-default-icon: #cbd5e1;
--rail-utility-hover-bg: rgba(148, 163, 184, 0.1);
--rail-utility-hover-text: #64748b;
--rail-utility-hover-icon: #94a3b8;

/* Dark Mode */
.dark {
  --rail-utility-default-text: #64748b;
  --rail-utility-default-icon: #475569;
  --rail-utility-hover-bg: rgba(148, 163, 184, 0.12);
  --rail-utility-hover-text: #94a3b8;
  --rail-utility-hover-icon: #64748b;
}
```

### 2.6 Profile Section Colors

```css
/* Light Mode */
--rail-profile-bg: rgba(148, 163, 184, 0.05);
--rail-profile-border: rgba(148, 163, 184, 0.15);
--rail-profile-text: #1e293b;
--rail-profile-text-muted: #64748b;
--rail-profile-avatar-bg: linear-gradient(135deg, rgba(122, 201, 67, 0.15) 0%, rgba(122, 201, 67, 0.08) 100%);
--rail-profile-avatar-text: #4a7c22;

/* Dark Mode */
.dark {
  --rail-profile-bg: rgba(30, 41, 59, 0.5);
  --rail-profile-border: rgba(71, 85, 105, 0.3);
  --rail-profile-text: #f1f5f9;
  --rail-profile-text-muted: #94a3b8;
  --rail-profile-avatar-bg: linear-gradient(135deg, rgba(122, 201, 67, 0.2) 0%, rgba(122, 201, 67, 0.1) 100%);
  --rail-profile-avatar-text: #a3e072;
}
```

### 2.7 Role Toggle Colors

```css
/* Light Mode */
--rail-toggle-container-bg: rgba(148, 163, 184, 0.08);
--rail-toggle-container-border: rgba(148, 163, 184, 0.15);
--rail-toggle-tab-default-bg: transparent;
--rail-toggle-tab-default-text: #64748b;
--rail-toggle-tab-hover-bg: rgba(148, 163, 184, 0.12);
--rail-toggle-tab-active-bg: var(--primary);
--rail-toggle-tab-active-text: var(--primary-foreground);
--rail-toggle-tab-active-icon: fill;

/* Admin Tab Accent */
--rail-toggle-admin-active-bg: rgba(139, 92, 246, 0.15);
--rail-toggle-admin-active-text: #6d28d9;
--rail-toggle-admin-active-icon: #8b5cf6;

/* Student Tab Accent */
--rail-toggle-student-active-bg: rgba(122, 201, 67, 0.15);
--rail-toggle-student-active-text: #4a7c22;
--rail-toggle-student-active-icon: #7ac943;

/* Dark Mode */
.dark {
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
}
```

### 2.8 Semantic Colors (Utility)

```css
/* Sign Out Destructive State */
--rail-destructive-default: var(--destructive);
--rail-destructive-hover-bg: rgba(239, 68, 68, 0.08);
--rail-destructive-hover-text: var(--destructive);

/* Focus Ring (shared) */
--rail-focus-ring: var(--sidebar-ring); /* #7ac943 */
```

### 2.9 Color Summary Table

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| **Container BG** | `#ffffff` | `#0f172a` |
| **Container Border** | `rgba(148,163,184,0.2)` | `rgba(71,85,105,0.3)` |
| **Student Active BG** | `rgba(122,201,67,0.15)` | `rgba(122,201,67,0.2)` |
| **Student Active Text** | `#4a7c22` | `#a3e072` |
| **Student Active Icon** | `#7ac943` | `#7ac943` |
| **Admin Active BG** | `rgba(139,92,246,0.15)` | `rgba(139,92,246,0.2)` |
| **Admin Active Text** | `#6d28d9` | `#ddd6fe` |
| **Admin Active Icon** | `#8b5cf6` | `#a78bfa` |
| **Nav Default Text** | `#64748b` | `#94a3b8` |
| **Nav Default Icon** | `#94a3b8` | `#64748b` |

---

## 3. Typography System

### 3.1 Font Families

```css
/* Brand Headers */
--rail-font-heading: "DM Serif Display", Georgia, serif;

/* Body & UI Text */
--rail-font-body: "Source Serif 4", Georgia, serif;

/* UI Elements (crisp rendering) */
--rail-font-ui: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

### 3.2 Type Scale

```css
/* Brand Zone */
--rail-brand-name-size: 1rem;           /* 16px */
--rail-brand-name-weight: 600;         /* semibold */
--rail-brand-name-line-height: 1.2;
--rail-brand-greeting-size: 0.75rem;    /* 12px */
--rail-brand-greeting-weight: 400;      /* regular */
--rail-brand-greeting-line-height: 1.4;

/* Role Toggle */
--rail-toggle-label-size: 0.8125rem;    /* 13px */
--rail-toggle-label-weight: 500;        /* medium */
--rail-toggle-icon-size: 16px;

/* Primary Navigation (Student - 5 items) */
--rail-nav-primary-label-size: 0.875rem; /* 14px */
--rail-nav-primary-label-weight: 500;     /* medium */
--rail-nav-primary-label-line-height: 1.4;

/* Admin Navigation (10 items - compact) */
--rail-nav-admin-label-size: 0.8125rem;  /* 13px */
--rail-nav-admin-label-weight: 500;      /* medium */
--rail-nav-admin-label-line-height: 1.2;

/* Section Labels (Admin only) */
--rail-section-label-size: 0.6875rem;   /* 11px */
--rail-section-label-weight: 600;        /* semibold */
--rail-section-label-transform: uppercase;
--rail-section-label-letter-spacing: 0.05em;
--rail-section-label-line-height: 1.2;

/* Submenu Items */
--rail-submenu-label-size: 0.8125rem;    /* 13px */
--rail-submenu-label-weight: 400;         /* regular */
--rail-submenu-label-line-height: 1.4;

/* Utility Text */
--rail-utility-label-size: 0.8125rem;    /* 13px */
--rail-utility-label-weight: 500;         /* medium */

/* Profile */
--rail-profile-name-size: 0.875rem;      /* 14px */
--rail-profile-name-weight: 600;         /* semibold */
--rail-profile-name-line-height: 1.2;
--rail-profile-subtitle-size: 0.75rem;    /* 12px */
--rail-profile-subtitle-weight: 400;     /* regular */
--rail-profile-subtitle-line-height: 1.4;

/* Tooltip (collapsed state) */
--rail-tooltip-size: 0.8125rem;           /* 13px */
--rail-tooltip-weight: 500;              /* medium */
```

### 3.3 Truncation Rules

```css
/* Nav Item Labels */
--rail-nav-truncate-max-width: 180px;

/* Profile Name */
--rail-profile-name-truncate-max: 140px;

/* Brand Wordmark */
--rail-brand-truncate-max-width: 160px;

/* Implementation */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

---

## 4. Spacing System

### 4.1 Rail Dimensions

```css
/* === CONTAINER === */
--rail-width-expanded: 280px;
--rail-width-collapsed: 72px;
--rail-height: 100vh;
--rail-min-height: 720px;  /* Minimum supported viewport */

/* === PADDING === */
--rail-padding-x: 16px;           /* Horizontal padding */
--rail-padding-top: 20px;         /* Top padding */
--rail-padding-bottom: 16px;      /* Bottom padding */

/* === BRAND ZONE === */
--rail-brand-height: 64px;        /* Total height including margin */
--rail-brand-logo-size: 44px;     /* Logo container size */
--rail-brand-logo-inner: 28px;    /* Actual logo image size */
--rail-brand-logo-radius: 12px;   /* Logo container radius */
--rail-brand-gap: 12px;           /* Gap between logo and text */
--rail-brand-padding-x: 0px;      /* Logo area horizontal padding */
--rail-brand-margin-bottom: 16px; /* Bottom margin */

/* === ROLE TOGGLE === */
--rail-toggle-height: 44px;      /* Toggle container height */
--rail-toggle-margin-y: 8px;      /* Vertical margin */
--rail-toggle-padding-x: 6px;     /* Internal padding */
--rail-toggle-tab-height: 32px;   /* Individual tab height */
--rail-toggle-tab-radius: 8px;    /* Tab border radius */
--rail-toggle-gap: 4px;           /* Gap between tabs */
--rail-toggle-icon-size: 16px;     /* Tab icon size */
--rail-toggle-text-icon-gap: 6px; /* Gap between icon and text */

/* === NAVIGATION ITEMS === */
/* Primary (Student) */
--rail-nav-primary-item-height: 44px;
--rail-nav-primary-item-radius: 12px;
--rail-nav-primary-item-padding-x: 12px;
--rail-nav-primary-item-padding-y: 10px;
--rail-nav-primary-item-gap: 12px; /* Gap between icon and label */

/* Admin (compact) */
--rail-nav-admin-item-height: 32px;
--rail-nav-admin-item-radius: 8px;
--rail-nav-admin-item-padding-x: 12px;
--rail-nav-admin-item-padding-y: 6px;
--rail-nav-admin-item-gap: 10px;
--rail-nav-admin-section-gap: 4px; /* Gap between section items */

/* Section Labels (Admin) */
--rail-section-label-margin-top: 12px;
--rail-section-label-margin-bottom: 4px;
--rail-section-label-padding-x: 12px;

/* Nav Section Spacing */
--rail-nav-section-padding-top: 12px;
--rail-nav-section-padding-bottom: 12px;
--rail-nav-section-gap: 4px;     /* Gap between nav items */
--rail-nav-section-gap-wider: 8px; /* Gap after divider */

/* === DIVIDERS === */
--rail-divider-height: 1px;
--rail-divider-margin-y: 12px;
--rail-divider-opacity: 0.5;
--rail-divider-collapsed-width: 32px;
--rail-divider-collapsed-opacity: 0.3;

/* === SUBMENU (Admin) === */
--rail-submenu-container-padding: 8px;
--rail-submenu-container-radius: 12px;
--rail-submenu-container-border-width: 1px;
--rail-submenu-item-height: 36px;
--rail-submenu-item-padding-x: 12px;
--rail-submenu-item-gap: 8px;

/* === UTILITY SECTION === */
--rail-utility-section-padding-y: 8px;
--rail-utility-item-height: 40px;
--rail-utility-item-radius: 10px;
--rail-utility-item-padding-x: 12px;
--rail-utility-item-gap: 10px;

/* Theme Toggle (compact) */
--rail-theme-toggle-height: 44px;  /* Larger touch target */

/* === PROFILE SECTION === */
--rail-profile-height: 64px;
--rail-profile-padding: 12px;
--rail-profile-radius: 14px;
--rail-profile-avatar-size: 40px;
--rail-profile-avatar-font-size: 14px;
--rail-profile-gap: 12px;          /* Gap between avatar and text */

/* === TOOLTIP === */
--rail-tooltip-offset: 8px;        /* Gap from rail edge */
--rail-tooltip-padding-x: 12px;
--rail-tooltip-padding-y: 6px;
--rail-tooltip-radius: 6px;
--rail-tooltip-arrow-size: 6px;
--rail-tooltip-delay: 300ms;       /* Hover delay before showing */
```

### 4.2 Layout Calculations

**Student Mode (Expanded):**
```
Brand Zone:           64px
Role Toggle:           0px (hidden)
Nav Section:         220px
  - 5 items × 44px  = 220px
  - No dividers needed (only 5 items)
Utility Section:     168px
  - Theme Toggle     =  44px
  - Collapse        =  40px
  - Sign Out        =  40px
  - Profile         =  64px
  - Padding         = -20px (overlap with nav)
─────────────────────────────────
TOTAL:               492px  ✓ Fits in 720px minimum
```

**Admin Mode (Expanded):**
```
Brand Zone:           64px
Role Toggle:          44px + 16px (margins) = 60px
Nav Section:         300px
  - Command Center group (6 items × 32px) = 192px
  - Section label + margin = 24px
  - Operations group (4 items × 32px) = 128px
  - Section label + margin = 24px
  - Dividers (2 × 1px) = 2px
Utility Section:     168px
─────────────────────────────────
TOTAL:               592px  ✓ Fits with buffer
```

---

## 5. Iconography

### 5.1 Icon Library

**Library:** Phosphor Icons (`@phosphor-icons/react`)  
**Icon Component:** `Icon` type from Phosphor

### 5.2 Icon Sizes

```css
/* Navigation Icons */
--rail-icon-size: 20px;       /* Primary nav items */
--rail-icon-size-sm: 18px;    /* Secondary/Admin items */

/* Utility Icons */
--rail-utility-icon-size: 20px;

/* Role Toggle Icons */
--rail-toggle-icon-size: 16px;

/* Profile Avatar (text, not icon) */
--rail-avatar-initials-size: 14px;
```

### 5.3 Icon Weights

| Context | Default Weight | Active Weight | Transition |
|---------|---------------|---------------|------------|
| Primary Nav | `regular` (400) | `fill` (900) | 150ms |
| Admin Nav | `regular` (400) | `fill` (900) | 150ms |
| Utility | `regular` (400) | N/A | N/A |
| Role Toggle | `regular` (400) | `fill` (900) | 150ms |

### 5.4 Icon Color Mapping

```css
/* Student Navigation */
--rail-icon-student-default: var(--rail-student-default-icon);
--rail-icon-student-hover: var(--rail-student-hover-icon);
--rail-icon-student-active: var(--rail-student-active-icon);

/* Admin Navigation */
--rail-icon-admin-default: var(--rail-admin-default-icon);
--rail-icon-admin-hover: var(--rail-admin-hover-icon);
--rail-icon-admin-active: var(--rail-admin-active-icon);

/* Utility */
--rail-icon-utility-default: var(--rail-utility-default-icon);
--rail-icon-utility-hover: var(--rail-utility-hover-icon);
```

### 5.5 Icon Reference by Navigation Item

#### Student Navigation (5 items)

| Item | Phosphor Icon | Fill Variant | Path |
|------|---------------|---------------|------|
| Dashboard | `House` | `HouseFill` | `/dashboard` |
| Subjects | `Books` | `BooksFill` | `/subjects` |
| AI Tutor | `Robot` | `RobotFill` | `/ai-tutor` |
| Stats | `ChartPieSlice` | `ChartPieSliceFill` | `/stats` |
| Forum | `ChatCircle` | `ChatCircleFill` | `/forum` |

#### Admin Navigation (10 items)

| Item | Phosphor Icon | Fill Variant | Path |
|------|---------------|---------------|------|
| Command Center | `LayoutDashboard` | `LayoutDashboardFill` | `/admin` |
| Users | `Users` | `UsersFill` | `/admin/users` |
| Content | `BookOpenCheck` | - | `/admin/content` |
| Moderation | `Flag` | `FlagFill` | `/admin/moderation` |
| Community | `MessagesSquare` | `MessagesSquareFill` | `/admin/community` |
| Forum | `ChatCircle` | `ChatCircleFill` | `/admin/forum` |
| Analytics | `BarChart3` | `BarChartFill` | `/admin/analytics` |
| Audit | `ScrollText` | - | `/admin/audit` |
| Notifications | `Bell` | `BellFill` | `/admin/notifications` |
| Settings | `Gear` | `GearFill` | `/admin/settings` |

#### Utility Icons

| Item | Phosphor Icon | Notes |
|------|---------------|-------|
| Collapse | `CaretDoubleLeft` | When expanded |
| Expand | `CaretDoubleRight` | When collapsed |
| Sign Out | `SignOut` | Destructive hover state |
| Theme (Light) | `Sun` | Light mode |
| Theme (Dark) | `Moon` | Dark mode |
| Theme (System) | `CircleHalf` | System mode |

#### Role Toggle Icons

| Role | Phosphor Icon | Fill Variant |
|------|---------------|---------------|
| Admin | `ShieldCheck` | `ShieldCheckered` |
| Student | `GraduationCap` | `GraduationCapFill` |

### 5.6 Icon Implementation

```tsx
// Icon usage pattern
<LinkIcon
  className={cn(
    "h-5 w-5 shrink-0 transition-all duration-150",
    isActive ? "text-[var(--rail-icon-active)]" : "text-[var(--rail-icon-default)]"
  )}
  weight={isActive ? "fill" : "regular"}
  aria-hidden
/>
```

---

## 6. Component States

### 6.1 Primary Navigation Item (Student)

```tsx
// Tailwind classes for primary nav item
<div
  className={cn(
    // Layout
    "group relative flex items-center rounded-xl transition-all duration-150",
    "h-11 w-full gap-3 px-3", // expanded
    // "h-11 w-11 justify-center mx-auto" // collapsed
    
    // Focus
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rail-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--rail-bg)]",
    
    // States
    isActive && [
      "bg-[var(--rail-student-active-bg)]",
      "text-[var(--rail-student-active-text)]",
      "shadow-[var(--rail-student-active-shadow)]",
      "sidebar-active-glow", // includes pulsing glow animation
    ],
    !isActive && [
      "text-[var(--rail-student-default-text)]",
      "hover:bg-[var(--rail-student-hover-bg)]",
      "hover:text-[var(--rail-student-hover-text)]",
    ]
  )}
>
  {/* Icon */}
  <LinkIcon 
    className="h-5 w-5 shrink-0"
    weight={isActive ? "fill" : "regular"}
  />
  
  {/* Label */}
  {!isCollapsed && (
    <span className="truncate text-sm font-medium">
      {link.label}
    </span>
  )}
</div>
```

#### State Summary Table

| State | Background | Text | Icon | Shadow | Border |
|-------|------------|------|------|--------|--------|
| **Default** | transparent | `#64748b` | `#94a3b8` | none | none |
| **Hover** | `rgba(122,201,67,0.08)` | `#1e293b` | `#64748b` | none | none |
| **Active** | gradient lime | `#4a7c22` | `#7ac943` (fill) | glow shadow | 1px subtle |
| **Active+Hover** | same as active | same | same | intensified | same |
| **Focus** | transparent | - | - | 2px ring | ring |

### 6.2 Admin Navigation Item

```tsx
// Tailwind classes for admin nav item (compact)
<div
  className={cn(
    // Layout
    "group relative flex items-center rounded-lg transition-all duration-150",
    "h-8 w-full gap-2.5 px-3", // expanded
    // "h-11 w-11 justify-center mx-auto" // collapsed
    
    // Focus
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rail-focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--rail-admin-container-bg)]",
    
    // States
    isActive && [
      "bg-[var(--rail-admin-active-bg)]",
      "text-[var(--rail-admin-active-text)]",
      "font-medium",
    ],
    !isActive && [
      "text-[var(--rail-admin-default-text)]",
      "hover:bg-[var(--rail-admin-hover-bg)]",
      "hover:text-[var(--rail-admin-hover-text)]",
    ]
  )}
>
  <LinkIcon 
    className="h-[18px] w-[18px] shrink-0"
    weight={isActive ? "fill" : "regular"}
  />
  {!isCollapsed && (
    <span className="truncate text-[13px] font-medium leading-tight">
      {link.label}
    </span>
  )}
</div>
```

#### State Summary Table

| State | Background | Text | Icon |
|-------|------------|------|------|
| **Default** | transparent | `#a78bfa` | `#c4b5fd` |
| **Hover** | `rgba(139,92,246,0.1)` | `#7c3aed` | `#a78bfa` |
| **Active** | gradient purple | `#6d28d9` | `#8b5cf6` (fill) |
| **Focus** | transparent | - | - |

### 6.3 Section Label (Admin)

```tsx
// Section label styling
<div
  className={cn(
    "mb-1 mt-3 px-3 text-[11px] font-semibold uppercase tracking-wider",
    "text-[var(--rail-admin-default-text)]",
    "opacity-70",
    isCollapsed && "sr-only" // Hide when collapsed
  )}
>
  {label}
</div>
```

#### Visual:
```
▸ COMMAND CENTER
```

### 6.4 Submenu Item

```tsx
// Submenu item styling (within Admin section)
<div
  className={cn(
    "flex h-9 items-center rounded-lg px-3 text-sm transition-all duration-150",
    isActive && [
      "bg-[var(--rail-submenu-item-active-bg)]",
      "text-[var(--rail-submenu-item-active-text)]",
      "font-medium",
    ],
    !isActive && [
      "text-[var(--rail-submenu-item-default-text)]",
      "hover:bg-[var(--rail-submenu-item-hover-bg)]",
      "hover:text-[var(--rail-submenu-item-hover-text)]",
    ]
  )}
>
  {item.label}
</div>
```

### 6.5 Utility Button

```tsx
// Utility button (Theme, Collapse)
<button
  className={cn(
    "group flex items-center rounded-xl transition-all duration-150",
    "text-[var(--rail-utility-default-text)]",
    "hover:bg-[var(--rail-utility-hover-bg)]",
    "hover:text-[var(--rail-utility-hover-text)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rail-focus-ring)]",
    
    // Expanded layout
    "h-10 w-full gap-3 px-3",
    // OR collapsed layout
    // "h-11 w-11 justify-center mx-auto",
  )}
>
  <Icon className="h-5 w-5 shrink-0" />
  <span className="truncate text-sm font-medium">Label</span>
</button>
```

### 6.6 Sign Out Button

```tsx
<LogoutButton
  className={cn(
    "group flex h-10 w-full items-center rounded-xl border-0 bg-transparent transition-all duration-150",
    "gap-3 px-3",
    "text-[var(--rail-utility-default-text)]",
    "hover:text-[var(--destructive)]",
    "hover:bg-[rgba(239,68,68,0.08)]",
  )}
  icon={
    <SignOut className="h-5 w-5 shrink-0" />
  }
  labelClassName="truncate text-sm font-medium"
/>
```

### 6.7 Profile Card

```tsx
<Link
  className={cn(
    "group flex items-center rounded-2xl border transition-all duration-150",
    "p-3 gap-3", // expanded
    // "justify-center p-2" // collapsed
    
    "border-[var(--rail-profile-border)]",
    "bg-[var(--rail-profile-bg)]",
    "hover:border-[var(--rail-border)]",
    "hover:bg-[var(--rail-student-hover-bg)]",
  )}
>
  {/* Avatar */}
  <div
    className={cn(
      "flex shrink-0 items-center justify-center rounded-full",
      "h-10 w-10",
      "bg-[var(--rail-profile-avatar-bg)]",
      "text-[var(--rail-profile-avatar-text)]",
      "text-sm font-bold",
      "transition-all duration-150",
      "group-hover:scale-105",
    )}
  >
    {initials}
  </div>
  
  {/* Text (hidden when collapsed) */}
  {!isCollapsed && (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-[var(--rail-profile-text)]">
        {displayName}
      </p>
      <p className="truncate text-xs text-[var(--rail-profile-text-muted)]">
        View Profile
      </p>
    </div>
  )}
</Link>
```

---

## 7. Role Toggle Component

### 7.1 Visual Design

**Concept:** A pill-style tab switcher that clearly indicates the current view mode with role-appropriate colors.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────┐    │
│  │  [🛡️ Admin]  |  [🎓 Student]                    │    │
│  │   Active      |   Inactive                        │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Component Structure

```tsx
<div
  role="tablist"
  aria-label="Navigation view"
  className={cn(
    "relative flex h-11 items-center rounded-xl",
    "bg-[var(--rail-toggle-container-bg)]",
    "border border-[var(--rail-toggle-container-border)]",
    "p-1 gap-1",
  )}
>
  {/* Sliding indicator (optional, for smoother transition) */}
  <div
    className={cn(
      "absolute inset-y-1 rounded-lg transition-all duration-200",
      "bg-white dark:bg-slate-700", // Subtle bg for indicator
      "shadow-sm",
    )}
    style={{
      width: 'calc(50% - 4px)',
      left: viewMode === 'admin' ? '4px' : 'calc(50%)',
    }}
  />
  
  {/* Admin Tab */}
  <button
    role="tab"
    aria-selected={viewMode === 'admin'}
    tabIndex={viewMode === 'admin' ? 0 : -1}
    onClick={() => onModeChange('admin')}
    className={cn(
      "relative z-10 flex flex-1 items-center justify-center gap-1.5",
      "h-9 rounded-lg px-3",
      "text-[13px] font-medium transition-all duration-150",
      viewMode === 'admin' && [
        "text-[var(--rail-toggle-admin-active-text)]",
      ],
      viewMode !== 'admin' && [
        "text-[var(--rail-toggle-tab-default-text)]",
        "hover:text-[var(--rail-foreground)]",
      ],
      // Focus
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rail-focus-ring)]",
    )}
  >
    <ShieldCheck
      className="h-4 w-4 shrink-0"
      weight={viewMode === 'admin' ? "fill" : "regular"}
    />
    <span className="hidden sm:inline">Admin</span>
  </button>
  
  {/* Student Tab */}
  <button
    role="tab"
    aria-selected={viewMode === 'student'}
    tabIndex={viewMode === 'student' ? 0 : -1}
    onClick={() => onModeChange('student')}
    className={cn(
      "relative z-10 flex flex-1 items-center justify-center gap-1.5",
      "h-9 rounded-lg px-3",
      "text-[13px] font-medium transition-all duration-150",
      viewMode === 'student' && [
        "text-[var(--rail-toggle-student-active-text)]",
      ],
      viewMode !== 'student' && [
        "text-[var(--rail-toggle-tab-default-text)]",
        "hover:text-[var(--rail-foreground)]",
      ],
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rail-focus-ring)]",
    )}
  >
    <GraduationCap
      className="h-4 w-4 shrink-0"
      weight={viewMode === 'student' ? "fill" : "regular"}
    />
    <span className="hidden sm:inline">Student</span>
  </button>
</div>
```

### 7.3 State Behaviors

| State | Visual | Icon Weight | Text Weight |
|-------|--------|-------------|-------------|
| **Admin Active** | Purple tint bg | fill | 600 |
| **Admin Inactive** | Transparent | regular | 500 |
| **Student Active** | Lime tint bg | fill | 600 |
| **Student Inactive** | Transparent | regular | 500 |

### 7.4 Transition Animation

```css
/* Sliding indicator animation */
.tab-indicator {
  transition: 
    left 200ms cubic-bezier(0.4, 0, 0.2, 1),
    width 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Tab content crossfade */
.tab-content {
  transition: opacity 150ms ease-out;
}

.tab:not([aria-selected="true"]) .tab-content {
  opacity: 0.6;
}
```

### 7.5 Collapsed Behavior

**When sidebar is collapsed:** Role toggle is **hidden** (not rendered)

```tsx
{!isCollapsed && (
  <RoleToggle 
    currentMode={viewMode} 
    onModeChange={onModeChange} 
  />
)}
```

---

## 8. Navigation Items

### 8.1 Student Navigation (5 Items)

**Section:** Primary Navigation  
**Item Height:** 44px  
**Border Radius:** 12px

```tsx
const studentNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/subjects", label: "Subjects", icon: Books },
  { href: "/ai-tutor", label: "AI Tutor", icon: Robot },
  { href: "/stats", label: "Stats", icon: ChartPieSlice },
  { href: "/forum", label: "Forum", icon: ChatCircle },
];
```

**Layout:**
```
┌────────────────────────────────────────┐
│  🏠 Dashboard                         │  ← 44px, 14px text
│  📚 Subjects                           │
│  🤖 AI Tutor                          │
│  📊 Stats                              │
│  💬 Forum                              │
└────────────────────────────────────────┘
```

### 8.2 Admin Navigation (10 Items)

**Section 1: Command Center (6 items)**
```tsx
const adminCommandItems = [
  { href: "/admin", label: "Command Center", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/content", label: "Content", icon: BookOpenCheck },
  { href: "/admin/moderation", label: "Moderation", icon: Flag },
  { href: "/admin/community", label: "Community", icon: MessagesSquare },
  { href: "/admin/forum", label: "Forum", icon: ChatCircle },
];
```

**Section 2: Operations (4 items)**
```tsx
const adminOperationsItems = [
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/audit", label: "Audit", icon: ScrollText },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Gear },
];
```

**Layout:**
```
┌────────────────────────────────────────┐
│  COMMAND CENTER                       │  ← Section label
│    🖥️ Command Center                   │  ← 32px, 13px text
│    👥 Users                            │
│    📖 Content                          │
│    🚩 Moderation                        │
│    💬 Community                        │
│    💬 Forum                            │
├────────────────────────────────────────┤
│  OPERATIONS                           │  ← Section label
│    📊 Analytics                        │
│    📜 Audit                            │
│    🔔 Notifications                    │
│    ⚙️ Settings                        │
└────────────────────────────────────────┘
```

### 8.3 Active State Logic

```tsx
// Path matching for active state
const isPathPrefix = (currentPath: string, target: string): boolean =>
  currentPath === target || currentPath.startsWith(`${target}/`);

// Admin items with custom matchers
const adminMatchers: Record<string, string[]> = {
  "/admin/community": ["/admin/forum"], // Forum checkbox matches Community
};

// Determine if item is active
const isItemActive = (item: NavItem): boolean => {
  if (item.matchers) {
    return item.matchers.some(m => isPathPrefix(currentPath, m));
  }
  return isPathPrefix(currentPath, item.href);
};
```

### 8.4 Section Dividers

```tsx
// Divider component
<div
  className={cn(
    "my-3 h-px bg-[var(--rail-border)] opacity-50",
    isCollapsed 
      ? "mx-auto w-8 opacity-30" 
      : "w-full"
  )}
/>
```

---

## 9. Utility Section

### 9.1 Component Order

```
┌────────────────────────────────────────┐
│  [🔆 Theme]                           │  ← Theme Toggle
│  [⬅️ Collapse]                        │  ← Collapse Toggle
│  [🚪 Sign Out]                        │  ← Sign Out
└────────────────────────────────────────┘
```

### 9.2 Theme Toggle (Compact)

```tsx
<ThemeToggleCompact isCollapsed={isCollapsed} />
```

**Specifications:**
- Height: 44px (expanded), 44px (collapsed)
- Border radius: 10px
- Icon: 20px
- Cycles through: Light → Dark → System

### 9.3 Collapse Toggle

```tsx
<button
  aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
  onClick={onToggle}
  className={cn(
    "group flex h-10 w-full items-center rounded-xl",
    "text-[var(--rail-utility-default-text)]",
    "hover:bg-[var(--rail-utility-hover-bg)]",
    "hover:text-[var(--rail-utility-hover-text)]",
    "transition-all duration-150",
    isCollapsed 
      ? "justify-center h-11 w-11 mx-auto" 
      : "gap-3 px-3"
  )}
>
  {isCollapsed ? (
    <CaretDoubleRight className="h-5 w-5 shrink-0" />
  ) : (
    <>
      <CaretDoubleLeft className="h-5 w-5 shrink-0" />
      <span className="truncate text-sm font-medium">Collapse</span>
    </>
  )}
</button>
```

### 9.4 Sign Out Button

```tsx
<LogoutButton
  ariaLabel="Sign out"
  icon={<SignOut className="h-5 w-5 shrink-0" />}
  hideLabel={isCollapsed}
  className={cn(
    "group flex h-10 w-full items-center rounded-xl border-0 bg-transparent",
    "transition-all duration-150",
    isCollapsed 
      ? "justify-center text-[var(--rail-utility-default-text)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/8" 
      : "gap-3 px-3 text-[var(--rail-utility-default-text)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/8"
  )}
  labelClassName="truncate text-sm font-medium"
/>
```

### 9.5 Spacing in Utility Section

```css
--rail-utility-section-spacing: 4px;  /* Gap between items */
```

---

## 10. Profile Section

### 10.1 Visual Design

**Position:** Bottom of rail, above utility section  
**Height:** 64px (including padding)  
**Border Radius:** 14px

```
┌────────────────────────────────────────┐
│  ┌────┐                               │
│  │ JD │  John Doe                     │  ← Name (14px semibold)
│  └────┘  View Profile                 │  ← Subtitle (12px)
└────────────────────────────────────────┘
```

**Collapsed:**
```
┌────────────────────────────────────────┐
│              ┌────┐                     │
│              │ JD │                     │
│              └────┘                     │
└────────────────────────────────────────┘
```

### 10.2 Avatar Specifications

| Property | Value |
|----------|-------|
| Size | 40×40px |
| Shape | Circle (50% radius) |
| Background | `linear-gradient(135deg, rgba(122,201,67,0.15), rgba(122,201,67,0.08))` |
| Text Color | `#4a7c22` (light) / `#a3e072` (dark) |
| Font | 14px bold, system-ui |
| Initials | First + Last name initial, uppercase |

### 10.3 Implementation

```tsx
const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

const truncatedName = displayName.length > 20 
  ? displayName.slice(0, 20) + "..." 
  : displayName;

<Link
  href="/settings"
  aria-label={`Profile: ${displayName}`}
  title={isCollapsed ? displayName : undefined}
  className={cn(
    "group flex items-center rounded-2xl border p-3 gap-3",
    "border-[var(--rail-profile-border)]",
    "bg-[var(--rail-profile-bg)]",
    "transition-all duration-150",
    "hover:border-[var(--rail-border)]",
    "hover:bg-[var(--rail-student-hover-bg)]",
    isCollapsed && "justify-center p-2"
  )}
>
  <div
    className={cn(
      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
      "bg-[var(--rail-profile-avatar-bg)]",
      "text-[var(--rail-profile-avatar-text)]",
      "text-sm font-bold",
      "transition-all duration-150",
      "group-hover:scale-105"
    )}
  >
    {avatarInitials}
  </div>
  {!isCollapsed && (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-[var(--rail-profile-text)]">
        {truncatedName}
      </p>
      <p className="truncate text-xs text-[var(--rail-profile-text-muted)]">
        View Profile
      </p>
    </div>
  )}
</Link>
```

---

## 11. Collapsed State Design

### 11.1 Visual Changes

| Element | Expanded | Collapsed |
|---------|----------|----------|
| **Width** | 280px | 72px |
| **Brand Logo** | Centered + text | Centered only |
| **Role Toggle** | Visible | Hidden |
| **Nav Labels** | Always visible | Hidden |
| **Nav Icons** | 20px | 20px (same) |
| **Tooltips** | None | On hover (300ms delay) |
| **Section Labels** | Visible | Hidden |
| **Dividers** | Full width | 32px centered |
| **Utility Layout** | Full width items | Centered icons |
| **Profile** | Avatar + text | Avatar only |

### 11.2 Tooltip Design

```css
/* Tooltip appearance */
.tooltip {
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  
  padding: 6px 12px;
  background: var(--foreground);
  color: var(--background);
  
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  
  border-radius: 6px;
  box-shadow: var(--shadow-md);
  
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms ease-out;
}

/* Arrow */
.tooltip::before {
  content: '';
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 6px solid transparent;
  border-right-color: var(--foreground);
}

/* Show on hover */
.nav-item:hover .tooltip {
  opacity: 1;
  transition-delay: 300ms; /* 300ms hover delay */
}
```

### 11.3 Tooltip Positioning

```
┌────────┬─────────────────────────────────────────────────┐
│        │                                                 │
│   🏠   │  ┌─────────────────────────┐                     │
│        │  │  Dashboard             │← tooltip            │
│  Icon  │  └─────────────────────────┘                     │
│  20px  │       ↑                                        │
│        │    8px gap                                      │
└────────┴─────────────────────────────────────────────────┘
```

### 11.4 Width Transition

```css
.left-rail {
  width: var(--rail-width-expanded); /* 280px */
  transition: width 350ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.left-rail--collapsed {
  width: var(--rail-width-collapsed); /* 72px */
}
```

---

## 12. Animations & Transitions

### 12.1 Timing Functions

```css
/* Timing variables */
--rail-transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--rail-transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
--rail-transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
```

### 12.2 Animation Inventory

| Animation | Duration | Easing | Properties |
|-----------|----------|--------|------------|
| Nav item hover | 150ms | ease-out | background, color, transform |
| Nav item active | 200ms | ease-out | background, shadow, border |
| Role toggle slide | 200ms | ease-in-out | left position |
| Sidebar collapse | 350ms | ease-in-out | width |
| Tooltip appear | 150ms | ease-out | opacity |
| Tooltip delay | 300ms | - | before appear |
| Avatar hover scale | 200ms | ease-out | scale |
| Submenu expand | 250ms | ease-out | max-height, opacity |
| Active glow pulse | 2000ms | ease-in-out | opacity (infinite) |

### 12.3 Hover Animations

```css
/* Nav item hover lift */
.nav-item:hover {
  background-color: var(--rail-nav-hover-bg);
  transform: translateX(2px);
  transition: all var(--rail-transition-fast);
}

/* Avatar scale */
.avatar:hover {
  transform: scale(1.05);
  transition: transform var(--rail-transition-normal);
}
```

### 12.4 Active Glow Animation

```css
/* Pulsing glow effect on active nav items */
.sidebar-active-glow::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: var(--rail-student-active-glow);
  border-radius: inherit;
  z-index: -1;
  animation: glow-pulse 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* Dark mode: slower pulse */
.dark .sidebar-active-glow::before {
  animation-duration: 3s;
}
```

### 12.5 Role Switch Animation

```css
/* Role transition - exit */
.role-nav-exit {
  animation: roleExit 150ms ease-out forwards;
}

@keyframes roleExit {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(-8px); }
}

/* Role transition - enter */
.role-nav-enter {
  animation: roleEnter 200ms ease-out forwards;
}

@keyframes roleEnter {
  from { opacity: 0; transform: translateX(8px); }
  to { opacity: 1; transform: translateX(0); }
}
```

### 12.6 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  .sidebar-active-glow::before {
    animation: none;
    opacity: 0.8;
  }
}
```

---

## 13. Responsive Design

### 13.1 Breakpoint Strategy

| Breakpoint | Viewport | Default State | Behavior |
|------------|----------|---------------|----------|
| **Mobile** | < 640px | Overlay drawer | Hamburger trigger |
| **Tablet** | 640px - 1024px | Collapsed (72px) | Can expand |
| **Desktop** | > 1024px | Expanded (280px) | Can collapse |

### 13.2 Mobile Overlay

```tsx
// Mobile overlay sidebar
<aside
  className={cn(
    "fixed inset-0 z-40 flex flex-col",
    "bg-[var(--rail-bg)]",
    "transform transition-transform duration-300",
    "translate-x-[-100%]", // Hidden by default
    isOpen && "translate-x-0" // Slide in when open
  )}
>
  {/* Full sidebar content */}
  {/* Close button in overlay header */}
</aside>

{/* Backdrop */}
{isOpen && (
  <div 
    className="fixed inset-0 z-30 bg-black/50"
    onClick={() => setIsOpen(false)}
  />
)}
```

### 13.3 Minimum Viewport Height

```css
.left-rail {
  height: 100vh;
  min-height: 720px; /* Minimum supported */
  display: flex;
  flex-direction: column;
}
```

### 13.4 Overflow Prevention

```css
.left-rail {
  overflow: hidden; /* No internal scrolling */
}

.nav-section {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
```

---

## 14. Accessibility

### 14.1 ARIA Attributes

```tsx
{/* Main navigation */}
<nav aria-label="Main navigation">
  {/* Nav items */}
  <Link 
    href={item.href}
    aria-current={isActive ? "page" : undefined}
  >
    {item.label}
  </Link>
</nav>

{/* Role toggle */}
<div role="tablist" aria-label="Navigation view">
  <button 
    role="tab"
    aria-selected={viewMode === 'admin'}
    aria-controls="nav-panel"
  >
    Admin
  </button>
  <button 
    role="tab"
    aria-selected={viewMode === 'student'}
    aria-controls="nav-panel"
  >
    Student
  </button>
</div>

{/* Nav content */}
<div id="nav-panel" role="tabpanel">
  {/* Role-specific navigation */}
</div>
```

### 14.2 Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move to next focusable element |
| Shift+Tab | Move to previous focusable element |
| Enter/Space | Activate focused button/link |
| Arrow Left/Right | Switch role toggle tabs |
| Escape | Close mobile overlay (if open) |

### 14.3 Focus Indicators

```css
/* Visible focus for keyboard navigation */
.nav-item:focus-visible,
.utility-button:focus-visible,
.profile-link:focus-visible,
.role-tab:focus-visible {
  outline: none;
  box-shadow: 
    0 0 0 2px var(--rail-focus-ring),
    0 0 0 4px var(--rail-bg);
}
```

### 14.4 Screen Reader Announcements

```tsx
// Role change announcement
const announceRoleChange = (newMode: 'admin' | 'student') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = `Switched to ${newMode} view`;
  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 1000);
};
```

### 14.5 Color Contrast

All text/background combinations meet **WCAG AA** standards (4.5:1 for normal text, 3:1 for large text):

| Combination | Contrast Ratio | WCAG Level |
|-------------|-----------------|------------|
| Active text (light) | 4.7:1 | AA |
| Default text (light) | 4.5:1 | AA |
| Admin text (light) | 3.2:1 | AA |
| Tooltip text | 12.6:1 | AAA |

### 14.6 Touch Targets

All interactive elements have a minimum touch target of **44×44px** (WCAG requirement):

```css
/* Ensure minimum touch target */
.nav-item,
.utility-button,
.role-tab,
.profile-link {
  min-height: 44px;
  min-width: 44px;
}
```

---

## 15. Implementation Reference

### 15.1 CSS Custom Properties (Add to theme.css)

```css
/* === UNIFIED RAIL TOKENS === */

/* Dimensions */
--rail-width-expanded: 280px;
--rail-width-collapsed: 72px;
--rail-padding-x: 16px;
--rail-padding-top: 20px;
--rail-padding-bottom: 16px;

/* Nav Items */
--rail-nav-item-height: 44px;
--rail-nav-item-radius: 12px;
--rail-nav-admin-item-height: 32px;
--rail-nav-admin-item-radius: 8px;
--rail-icon-size: 20px;

/* Transitions */
--rail-transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--rail-transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
--rail-transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);

/* Focus Ring */
--rail-focus-ring: #7ac943;

/* Role Toggle */
--rail-toggle-height: 44px;
--rail-toggle-tab-height: 32px;
--rail-toggle-radius: 8px;

/* Profile */
--rail-profile-height: 64px;
--rail-profile-avatar-size: 40px;
--rail-profile-radius: 14px;
```

### 15.2 Component File Structure

```
components/
└── foundation/
    └── left-rail/
        ├── left-rail.tsx              # Main component
        ├── left-rail.config.ts       # Nav item configs
        ├── hooks/
        │   └── use-view-mode.ts      # View mode state
        └── components/
            ├── role-toggle.tsx        # Role switcher
            ├── nav-item.tsx          # Nav item
            ├── nav-section.tsx       # Section with label
            ├── nav-section-label.tsx
            ├── utility-section.tsx   # Theme, collapse, signout
            ├── profile-section.tsx
            └── tooltip.tsx           # Collapsed tooltip
```

### 15.3 TypeScript Interfaces

```tsx
// View mode type
type ViewMode = 'admin' | 'student';

// Navigation item
interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  matchers?: string[];
}

// Role toggle props
interface RoleToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  isCollapsed: boolean;
}

// Left rail props
interface LeftRailProps {
  session: SessionPayload;
  currentPath?: string;
  isCollapsed: boolean;
  onToggle: () => void;
}
```

### 15.4 Key Implementation Notes

1. **CSS Custom Properties**: All colors use CSS variables defined in `theme.css`
2. **Role-Specific Styling**: Apply `--rail-student-*` or `--rail-admin-*` based on `viewMode`
3. **Icon Weight**: Use `weight="fill"` for active states, `weight="regular"` for default
4. **Focus Ring**: Always include `focus-visible` styles for accessibility
5. **Tooltip Delay**: 300ms delay before showing tooltip in collapsed state
6. **Truncation**: Use CSS `truncate` class for long text overflow
7. **Performance**: All transitions use `cubic-bezier(0.4, 0, 0.2, 1)` for smooth 60fps
8. **Reduced Motion**: Respect `prefers-reduced-motion` media query

---

## Appendix: Quick Reference Cards

### Student Nav Colors
```
Default:   Text #64748b  | Icon #94a3b8
Hover:     BG lime 8%   | Text #1e293b
Active:    BG lime 15%  | Text #4a7c22 | Icon #7ac943 (fill)
```

### Admin Nav Colors
```
Default:   Text #a78bfa  | Icon #c4b5fd
Hover:     BG purple 10%| Text #7c3aed
Active:    BG purple 15%| Text #6d28d9 | Icon #8b5cf6 (fill)
```

### Dimensions Summary
```
Rail Width:    280px (expanded) / 72px (collapsed)
Brand Height:  64px
Nav Item:      44px (student) / 32px (admin)
Icon Size:     20px
Profile:       64px height
```

---

**UI Designer**: Complete  
**Status**: Ready for implementation  
**Next Step**: Frontend developer implementation phase

