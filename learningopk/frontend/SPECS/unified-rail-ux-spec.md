# Unified Left Rail Navigation - UX Specification

**Document Version:** 1.0  
**Created:** March 21, 2026  
**Status:** Draft for Review  
**Author:** UX Architecture Team  

---

## Table of Contents

1. [Overview & Design Principles](#1-overview--design-principles)
2. [Role Switching Flow](#2-role-switching-flow)
3. [Navigation Structure & Grouping](#3-navigation-structure--grouping)
4. [Active & Hover States](#4-active--hover-states)
5. [Collapse Behavior](#5-collapse-behavior)
6. [Viewport Fit Strategy](#6-viewport-fit-strategy)
7. [Visual Design System](#7-visual-design-system)
8. [Component States & Behaviors](#8-component-states--behaviors)
9. [Accessibility Requirements](#9-accessibility-requirements)
10. [Edge Cases & Error Handling](#10-edge-cases--error-handling)
11. [Implementation Checklist](#11-implementation-checklist)

---

## 1. Overview & Design Principles

### 1.1 Component Purpose

The unified left rail navigation serves as the primary navigation interface for both **Admin** and **Student** roles in a single, role-aware component. It provides context-appropriate navigation while maintaining visual consistency and optimal usability across all viewport sizes.

### 1.2 Core Design Principles

| Principle | Application |
|-----------|-------------|
| **Role-Aware** | Navigation adapts completely to user role; no hybrid views |
| **Space-Efficient** | All items fit within 100vh; no internal scrolling |
| **Predictable** | Consistent behavior, transitions, and visual feedback |
| **Accessible** | Full keyboard navigation, screen reader support, focus management |
| **Performant** | No layout shift, smooth 60fps transitions |

### 1.3 Layout Architecture

```
┌─────────────────────────────────────────────────────────┐
│  LEFTPANEL (Fixed 72px/280px)                          │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │  Brand Zone (48px)                              │   │
│  │  - Logo + Wordmark (expanded) / Logo (collapsed)│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Role Toggle Zone (admin only, 48px)            │   │
│  │  - [Admin] [Student]                            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Navigation Section (flex-grow, min-width)      │   │
│  │  - Grouped nav items (role-specific)            │   │
│  │  - Icons + labels (expanded)                   │   │
│  │  - Icons only (collapsed)                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Utility Section (pinned bottom, ~160px)        │   │
│  │  - Theme Toggle                                 │   │
│  │  - Collapse Toggle                             │   │
│  │  - Sign Out                                    │   │
│  │  - User Profile                               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 1.4 Width Specifications

| State | Width | Icon Display | Label Display |
|-------|-------|--------------|---------------|
| **Expanded** | 280px | Full size (20px) | Always visible |
| **Collapsed** | 72px | Full size (20px) | Tooltip on hover |

---

## 2. Role Switching Flow

### 2.1 Toggle Visibility Rules

```
┌─────────────────────────────────────────────────────────┐
│  User Role      │  Toggle Visible  │  Default View     │
├─────────────────┼──────────────────┼──────────────────┤
│  admin          │  YES              │  Admin            │
│  student        │  NO               │  Student (fixed) │
│  unknown/error  │  NO               │  Student (safe)   │
└─────────────────┴──────────────────┴──────────────────┘
```

### 2.2 Toggle Component Specifications

**Location:** Immediately below Brand Zone  
**Visibility:** Admin users only  
**Default State:** "Admin" selected (for admin users)

```tsx
// Toggle UI Structure
<div className="role-toggle" role="tablist" aria-label="Navigation view">
  <button 
    role="tab" 
    aria-selected={viewMode === 'admin'}
    className={cn(styles.toggleTab, viewMode === 'admin' && styles.active)}
  >
    <ShieldCheckIcon />
    <span>Admin</span>
  </button>
  <button 
    role="tab"
    aria-selected={viewMode === 'student'}
    className={cn(styles.toggleTab, viewMode === 'student' && styles.active)}
  >
    <GraduationCapIcon />
    <span>Student</span>
  </button>
</div>
```

**Dimensions:**
- Expanded: Full-width pill container, tabs fill evenly
- Collapsed: Hidden (role toggle not visible when collapsed)
- Tab height: 36px
- Tab border-radius: 8px
- Gap between tabs: 4px

### 2.3 State Management

```typescript
type ViewMode = 'admin' | 'student';

interface LeftRailState {
  viewMode: ViewMode;              // Current navigation view
  isCollapsed: boolean;             // Sidebar collapsed state
  persistedViewMode: ViewMode;     // Stored preference (admin only)
}

// State Transitions
- Initial load: Read from session.user.role
  - admin → Set viewMode to 'admin', display persisted or default
  - student → Set viewMode to 'student', no persistence needed

- Toggle click (admin only):
  - 'admin' → 'student': Instant navigation swap
  - 'student' → 'admin': Instant navigation swap

- Page navigation: Preserve viewMode within session
- New session: Reset to role default ('admin' for admin users)
```

### 2.4 Transition Behavior

| Phase | Duration | What Happens |
|-------|----------|--------------|
| **Phase 1: Exit** | 150ms | Current nav fades out (opacity 1→0, translateX 0→-8px) |
| **Phase 2: Swap** | 0ms | Navigation content switches |
| **Phase 3: Enter** | 200ms | New nav fades in (opacity 0→1, translateX 8px→0) |
| **Total** | 350ms | Complete role transition |

```css
/* Role Transition Animation */
.role-transition-enter {
  animation: roleNavExit 150ms ease-out forwards;
}
.role-transition-enter-active {
  animation: roleNavEnter 200ms ease-out forwards;
}

@keyframes roleNavExit {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(-8px); }
}

@keyframes roleNavEnter {
  from { opacity: 0; transform: translateX(8px); }
  to { opacity: 1; transform: translateX(0); }
}
```

### 2.5 URL Behavior During Role Switch

| Scenario | Behavior |
|----------|----------|
| User on `/admin/users` → Toggle to Student | Stay on current page (URL doesn't change) |
| User on `/dashboard` → Toggle to Admin | Stay on `/dashboard` |
| Page refresh | Navigate to role-appropriate default (`/dashboard` for student, `/admin` for admin) |

**Decision:** Navigation view and URL are **independent**. Users can browse student pages while in admin view and vice versa.

---

## 3. Navigation Structure & Grouping

### 3.1 Student Navigation (5 items)

**Group: Primary Navigation**
| Item | Icon | Path | Priority |
|------|------|------|----------|
| Dashboard | House | /dashboard | 1 (highest) |
| Subjects | Books | /subjects | 2 |
| AI Tutor | Robot | /ai-tutor | 3 |
| Stats | ChartPieSlice | /stats | 4 |
| Forum | ChatCircle | /forum | 5 |

**Layout Calculation (Student - Expanded):**
```
Brand Zone:           48px
Role Toggle:          0px (hidden for student)
Nav Section:         280px (flex-grow)
  - 5 items × 44px  = 220px
  - 4 gaps × 8px    =  32px
  - Padding top     =  16px
  - Padding bottom   =  12px
Utility Section:    176px (fixed)
  - Theme Toggle    =  40px
  - Collapse        =  40px
  - Sign Out        =  40px
  - Profile         =  48px
  - Padding         =   8px
─────────────────────────────────
TOTAL:               504px  ✓ Fits in 720px viewport
```

### 3.2 Admin Navigation (10 items)

**Group: Command Center**
| Item | Icon | Path | Active Matcher |
|------|------|------|-----------------|
| Command Center | LayoutDashboard | /admin | /admin |
| Users | Users | /admin/users | - |
| Content | BookOpenCheck | /admin/content | - |
| Moderation | Flag | /admin/moderation | - |
| Community | MessagesSquare | /admin/community, /admin/forum | /admin/forum |
| Forum | ChatCircle | /admin/forum | - |

**Group: Operations**
| Item | Icon | Path |
|------|------|------|
| Analytics | BarChart3 | /admin/analytics |
| Audit | ScrollText | /admin/audit |
| Notifications | Bell | /admin/notifications |
| Settings | Settings | /admin/settings |

**Layout Calculation (Admin - Expanded):**
```
Brand Zone:           48px
Role Toggle:          48px
Nav Section:         256px (flex-grow)
  - 10 items × 36px  = 360px
  - 2 dividers × 1px =   2px
  - Group labels × 2 =  24px (subheadings)
  - Padding top     =  12px
  - Padding bottom  =  12px
─────────────────────────────────
  Subtotal:          400px exceeds 256px allocation!

**CRITICAL ADJUSTMENT:** Reduce item height from 36px to 28px
  - 10 items × 28px  = 280px
  - 2 dividers × 1px =   2px
  - Group labels × 2 =  24px (14px text + 10px margin)
  - Padding top     =  12px
  - Padding bottom  =  12px
  Subtotal:          330px  ✓ Fits with margin

Utility Section:    176px (fixed)
TOTAL:               584px  ✓ Fits in 720px viewport
```

### 3.3 Visual Hierarchy

**Student View (5 items):**
```
┌────────────────────────────────────────┐
│  🏠 Dashboard                         │  ← Primary (44px, bold)
│  📚 Subjects                           │  ← Primary (44px)
│  🤖 AI Tutor                          │  ← Primary (44px)
│  📊 Stats                              │  ← Primary (44px)
│  💬 Forum                              │  ← Primary (44px)
└────────────────────────────────────────┘
```
- Larger touch targets (44px)
- Full-weight text (medium → semibold on hover/active)
- Clear visual separation

**Admin View (10 items):**
```
┌────────────────────────────────────────┐
│  ▸ Command Center                       │  ← Section label (12px, uppercase)
│    🏠 Command Center                    │  ← Item (28px)
│    👥 Users                             │  ← Item (28px)
│    📖 Content                           │  ← Item (28px)
│    🚩 Moderation                        │  ← Item (28px)
│    👥 Community                         │  ← Item (28px)
│    💬 Forum                             │  ← Item (28px)
├────────────────────────────────────────┤
│  ▸ Operations                          │  ← Section label (12px, uppercase)
│    📈 Analytics                         │  ← Item (28px)
│    📜 Audit                             │  ← Item (28px)
│    🔔 Notifications                     │  ← Item (28px)
│    ⚙️ Settings                         │  ← Item (28px)
└────────────────────────────────────────┘
```
- Compact item height (28px) to fit all 10 items
- Section labels for organization
- Subtle dividers between groups
- Smaller text (13px) with truncation for long labels

### 3.4 Collapsed State Navigation

**Both Roles:**
```
Expanded: [Icon 20px] [Label - truncate]
Collapsed: [Icon 20px] + [Tooltip on hover]
```

- Same icon sizes in both states
- Labels hidden in collapsed state
- Tooltip appears after 300ms hover delay
- Tooltip position: Right edge of sidebar, vertically centered on item

---

## 4. Active & Hover States

### 4.1 Active State Determination

```typescript
// Active path matching logic
const isPathPrefix = (currentPath: string, target: string): boolean =>
  currentPath === target || currentPath.startsWith(`${target}/`);

// Item is active if:
// 1. Exact path match: /admin === /admin
// 2. Prefix match: /admin/users starts with /admin
// 3. Matcher paths: /admin/forum matches community item with matcher /admin/forum
```

**Active State Behavior:**
| Condition | Visual Indicator |
|-----------|------------------|
| Exact path match | Full active styling |
| Child path active | Parent shows active styling (subtle) |
| No match | Default state |

### 4.2 State Visual Specifications

**Primary Nav Items (Student, Dashboard-Subjects-etc.):**

| State | Background | Text Color | Icon | Border/Shadow |
|-------|------------|------------|------|---------------|
| Default | transparent | #64748b | #94a3b8 | none |
| Hover | rgba(122,201,67,0.08) | #1e293b | #64748b | none |
| Active | linear-gradient(135deg, rgba(122,201,67,0.15)...) | #4a7c22 | #7ac943 | shadow + glow |
| Active+Hover | same as active | same | same | intensified |

**Admin Nav Items:**

| State | Background | Text Color | Icon |
|-------|------------|------------|------|
| Default | transparent | #a78bfa | #c4b5fd |
| Hover | rgba(139,92,246,0.1) | #7c3aed | #a78bfa |
| Active | linear-gradient(135deg, rgba(139,92,246,0.15)...) | #6d28d9 | #8b5cf6 |

**Section Labels:**

| State | Text Color | Opacity |
|-------|------------|---------|
| Default | #94a3b8 | 0.7 |
| Collapsed | Hidden | - |

### 4.3 Hover Feedback Timing

```
┌─────────────────────────────────────────────────────────┐
│  Mouse Enter → Start 150ms timer                       │
│                ↓                                        │
│  150ms elapsed?                                        │
│    YES → Apply hover styles                            │
│    NO  → Mouse left before 150ms, do nothing           │
│                ↓                                        │
│  Mouse Leave → Start 100ms timer                       │
│                ↓                                        │
│  100ms elapsed?                                        │
│    YES → Remove hover styles                           │
│    NO  → Mouse re-entered within 100ms                │
│          → Cancel leave timer, keep hover              │
└─────────────────────────────────────────────────────────┘
```

**Transition CSS:**
```css
/* Hover transition */
.nav-item {
  transition: 
    background-color 150ms ease-out,
    color 150ms ease-out,
    transform 100ms ease-out;
}

/* Active state transition */
.nav-item.active {
  transition: 
    background-color 200ms ease-in-out,
    box-shadow 200ms ease-in-out;
}
```

### 4.4 Focus States (Keyboard Navigation)

| State | Visual |
|-------|--------|
| Default (focused) | 2px ring in --sidebar-ring color, 2px offset |
| Active + Focused | Active background + ring |
| Hover + Focused | Hover background + ring |

```css
.nav-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--sidebar-ring), 
              0 0 0 4px var(--sidebar-bg);
}
```

---

## 5. Collapse Behavior

### 5.1 Expanded vs Collapsed States

| Aspect | Expanded (280px) | Collapsed (72px) |
|--------|------------------|------------------|
| **Brand** | Logo + Wordmark | Logo only |
| **Role Toggle** | Visible | Hidden |
| **Nav Labels** | Always visible | Hidden |
| **Nav Tooltips** | None | On hover (300ms delay) |
| **Section Labels** | Visible | Hidden |
| **Section Dividers** | Visible | Hidden |
| **Footer Layout** | Horizontal items | Centered icons |
| **Transitions** | 350ms ease-in-out | 350ms ease-in-out |

### 5.2 Collapse Toggle Button

**Position:** Bottom of Utility Section, above Sign Out  
**Behavior:** Toggle sidebar width

```tsx
<button
  aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
  onClick={onToggle}
  className={cn(
    "flex h-10 items-center rounded-xl transition-all duration-150",
    isCollapsed 
      ? "w-11 h-11 justify-center mx-auto" 
      : "w-full gap-3 px-3"
  )}
>
  {isCollapsed ? (
    <CaretDoubleRight className="h-5 w-5" />
  ) : (
    <>
      <CaretDoubleLeft className="h-5 w-5" />
      <span className="text-sm font-medium">Collapse</span>
    </>
  )}
</button>
```

### 5.3 Navigation Behavior When Collapsed

| Element | Expanded Behavior | Collapsed Behavior |
|---------|-------------------|-------------------|
| Nav Item | Icon + Label | Icon only + Tooltip |
| Section Label | "COMMAND CENTER" | Not rendered |
| Section Divider | Full width line | Not rendered |
| Active Indicator | Left border + background | Icon filled + tooltip shows label |
| Grouped Items | Flat list | Flat list (no visual grouping) |

### 5.4 Tooltip Specifications

```tsx
// Tooltip trigger (on nav items when collapsed)
<div 
  title={isCollapsed ? item.label : undefined}  // Native browser tooltip
  aria-describedby={isCollapsed ? `tooltip-${item.href}` : undefined}
>
  <NavItemIcon />
</div>

// Or custom tooltip (for better styling control)
{isCollapsed && (
  <div 
    role="tooltip"
    id={`tooltip-${item.href}`}
    className="tooltip-content"
  >
    {item.label}
  </div>
)}
```

**Tooltip Styling:**
```css
.tooltip-content {
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

.tooltip-content::before {
  content: '';
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  border: 6px solid transparent;
  border-right-color: var(--foreground);
}

.nav-item:hover .tooltip-content {
  opacity: 1;
  transition-delay: 300ms;  /* 300ms hover delay before show */
}
```

### 5.5 Width Transition Animation

```css
.left-rail {
  transition: width 350ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;  /* Prevent content overflow during transition */
}

.left-rail--collapsed {
  width: 72px;
}

.left-rail--expanded {
  width: 280px;
}
```

**Animation Curve:** `cubic-bezier(0.4, 0, 0.2, 1)` (Material Design standard)

---

## 6. Viewport Fit Strategy

### 6.1 Critical Requirement: NO Internal Scrolling

The left rail **MUST NOT** have any internal scrolling. All navigation items must fit within 100vh.

### 6.2 Viewport Height Budget

```
┌─────────────────────────────────────────────────────────┐
│  100vh (Viewport Height)                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Safe Zone: Top (16px) - Device status bars, notches   │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Content Zone: ~932px (assuming 900px viewport)         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Safe Zone: Bottom (52px) - Mobile home indicators    │
│                                                         │
└─────────────────────────────────────────────────────────┘

Design Target: 720px minimum (small laptops)
```

### 6.3 Height Allocation

**Student Mode:**
```
┌────────────────────────────────────────────────────────┐
│  Brand Zone:        48px                              │
│  ────────────────────────────────────────────────────  │
│  Padding:           12px                              │
│  Nav Section:      220px (5 items × 44px)            │
│  ────────────────────────────────────────────────────  │
│  Utility Section: 168px                               │
│    Theme Toggle:   40px                               │
│    Collapse:      40px                               │
│    Sign Out:      40px                               │
│    Profile:       48px                               │
│  ────────────────────────────────────────────────────  │
│  TOTAL:           488px                               │
│  Remaining:      232px buffer ✓                       │
└────────────────────────────────────────────────────────┘
```

**Admin Mode (10 items, compact):**
```
┌────────────────────────────────────────────────────────┐
│  Brand Zone:        48px                              │
│  Role Toggle:       48px                              │
│  Padding:           12px                              │
│  Nav Section:      360px (10 items × 28px + labels)  │
│  ────────────────────────────────────────────────────  │
│  Utility Section:  168px                               │
│  ────────────────────────────────────────────────────  │
│  TOTAL:           636px                               │
│  Remaining:       84px buffer ✓                        │
└────────────────────────────────────────────────────────┘
```

**Admin Mode (Collapsed - Role toggle hidden):**
```
┌────────────────────────────────────────────────────────┐
│  Brand Zone:        48px                              │
│  Role Toggle:        0px (hidden)                    │
│  Padding:           12px                              │
│  Nav Section:      280px (10 items × 28px)           │
│  ────────────────────────────────────────────────────  │
│  Utility Section:  168px                               │
│  ────────────────────────────────────────────────────  │
│  TOTAL:           508px                               │
│  Remaining:      212px buffer ✓                        │
└────────────────────────────────────────────────────────┘
```

### 6.4 Responsive Considerations

**Viewport Breakpoints:**

| Breakpoint | Viewport | Behavior |
|------------|----------|----------|
| Mobile | < 640px | Sidebar becomes overlay drawer |
| Tablet | 640px - 1024px | Collapsed by default |
| Desktop | > 1024px | Expanded by default, can collapse |

**Minimum Height Guarantee:**
```css
.left-rail {
  height: 100vh;
  min-height: 720px;  /* Force minimum height */
  display: flex;
  flex-direction: column;
}

.nav-section {
  flex: 1;
  min-height: 0;  /* Allow flex shrinking if needed */
}
```

### 6.5 Overflow Prevention Strategies

1. **Fixed footer:** Utility section and profile are always pinned to bottom
2. **Flex-grow nav:** Navigation takes remaining space
3. **Minimum heights:** Each section has minimum height requirements
4. **No text overflow:** Labels truncate with ellipsis if needed
5. **Compact admin items:** 28px height for 10 admin items

### 6.6 Edge Case: Very Small Viewports

If viewport < 720px:
- Admin mode: Show warning "Viewport too small for admin navigation"
- Student mode: Reduce item heights to 36px
- Both: Consider hamburger menu fallback for 375px and below

---

## 7. Visual Design System

### 7.1 CSS Custom Properties

**Add to theme.css:**

```css
/* === Role Toggle === */
--role-toggle-bg: rgba(148, 163, 184, 0.1);
--role-toggle-border: rgba(148, 163, 184, 0.2);
--role-toggle-tab-default-bg: transparent;
--role-toggle-tab-default-text: #64748b;
--role-toggle-tab-hover-bg: rgba(148, 163, 184, 0.15);
--role-toggle-tab-active-bg: var(--primary);
--role-toggle-tab-active-text: var(--primary-foreground);

/* === Admin Nav Compact === */
--admin-nav-item-height: 28px;
--admin-nav-item-font-size: 13px;
--admin-section-label-font-size: 11px;
--admin-section-label-transform: uppercase;
--admin-section-label-letter-spacing: 0.05em;
--admin-section-label-margin: 8px 0 4px 12px;

/* === Tooltip (collapsed state) === */
--tooltip-bg: var(--foreground);
--tooltip-text: var(--background);
--tooltip-font-size: 13px;
--tooltip-padding: 6px 12px;
--tooltip-radius: 6px;
--tooltip-shadow: var(--shadow-md);
--tooltip-delay: 300ms;
```

### 7.2 Color Palette per Role

**Student Mode Colors:**
| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Active BG | rgba(122,201,67,0.15) | rgba(122,201,67,0.2) |
| Active Text | #4a7c22 | #a3e072 |
| Active Icon | #7ac943 | #7ac943 |
| Default Text | #64748b | #94a3b8 |
| Hover BG | rgba(122,201,67,0.08) | rgba(122,201,67,0.12) |

**Admin Mode Colors:**
| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Active BG | rgba(139,92,246,0.15) | rgba(139,92,246,0.2) |
| Active Text | #6d28d9 | #ddd6fe |
| Active Icon | #8b5cf6 | #a78bfa |
| Default Text | #a78bfa | #c4b5fd |
| Hover BG | rgba(139,92,246,0.1) | rgba(139,92,246,0.15) |

### 7.3 Typography

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|------------|
| Brand Name | --font-heading | 16px | 600 | 1.2 |
| Brand Tagline | --font-body | 12px | 400 | 1.4 |
| Nav Item (Student) | --font-body | 14px | 500 | 1.4 |
| Nav Item (Admin) | --font-body | 13px | 500 | 1.2 |
| Section Label | --font-body | 11px | 600 | 1.2 |
| Profile Name | --font-body | 14px | 600 | 1.2 |
| Profile Subtitle | --font-body | 12px | 400 | 1.4 |

### 7.4 Spacing Scale

```
--space-1:  4px   (1 unit)
--space-2:  8px   (2 units)
--space-3:  12px  (3 units)
--space-4:  16px  (4 units)
--space-5:  20px  (5 units)
--space-6:  24px  (6 units)
--space-8:  32px  (8 units)
```

### 7.5 Border Radius

| Element | Radius |
|---------|--------|
| Nav Items | 12px |
| Profile Card | 16px |
| Role Toggle | 8px |
| Tooltip | 6px |
| Avatar | 50% (circle) |

---

## 8. Component States & Behaviors

### 8.1 Role Toggle Component

```typescript
interface RoleToggleProps {
  currentMode: 'admin' | 'student';
  onModeChange: (mode: 'admin' | 'student') => void;
  isCollapsed: boolean;
}
```

**States:**

| State | Visual | Behavior |
|-------|--------|----------|
| Admin Selected | Admin tab has primary bg, filled icon | Student tab muted |
| Student Selected | Student tab has primary bg, filled icon | Admin tab muted |
| Hover (Admin Tab) | Slight background tint | Cursor: pointer |
| Hover (Student Tab) | Slight background tint | Cursor: pointer |
| Focus | Ring around focused tab | Keyboard navigable |
| Disabled | N/A | Never disabled |
| Collapsed | Hidden | Not rendered |

### 8.2 Navigation Item Component

```typescript
interface NavItemProps {
  href: string;
  label: string;
  icon: Icon;
  isActive: boolean;
  isCollapsed: boolean;
  variant: 'student' | 'admin';
  onClick?: () => void;
}
```

**States:**

| State | Visual | Behavior |
|-------|--------|----------|
| Default | Muted text/icon | - |
| Hover | Background tint, darker text | 150ms transition |
| Active | Brand bg + glow, primary text | Left border indicator |
| Active + Hover | Intensified glow | - |
| Focus | Ring | Keyboard accessible |
| Disabled | 50% opacity | Non-clickable |
| Collapsed | Icon only + tooltip | Shows tooltip on hover |

### 8.3 Section Label Component

```typescript
interface SectionLabelProps {
  label: string;
  isCollapsed: boolean;
}
```

**States:**

| State | Visual | Behavior |
|-------|--------|----------|
| Default | Uppercase, muted, small | - |
| Hover | N/A | No hover state |
| Focus | N/A | Not focusable |
| Collapsed | Hidden | Not rendered |

### 8.4 Utility Item Component (Theme, Collapse, Sign Out)

```typescript
interface UtilityItemProps {
  icon: Icon;
  label: string;
  isCollapsed: boolean;
  variant: 'default' | 'destructive';
  onClick?: () => void;
  href?: string;
}
```

**States:**

| State | Visual | Behavior |
|-------|--------|----------|
| Default | Muted icon/text | - |
| Hover | Background tint | 150ms transition |
| Focus | Ring | Keyboard accessible |
| Active | N/A | Press effect on click |
| Destructive + Hover | Red tint, red icon | Indicates danger action |

### 8.5 Profile Component

```typescript
interface ProfileProps {
  name: string;
  initials: string;
  subtitle?: string;
  isCollapsed: boolean;
  href: string;
}
```

**States:**

| State | Visual | Behavior |
|-------|--------|----------|
| Default | Avatar + name + subtitle | - |
| Hover | Border tint, subtle bg | Link to profile |
| Focus | Ring | Keyboard accessible |
| Collapsed | Avatar only, centered | Tooltip shows name |

---

## 9. Accessibility Requirements

### 9.1 ARIA Attributes

**Role Toggle:**
```html
<div role="tablist" aria-label="Navigation view">
  <button role="tab" aria-selected="true" aria-controls="nav-content">
    Admin
  </button>
  <button role="tab" aria-selected="false" aria-controls="nav-content">
    Student
  </button>
</div>
<div id="nav-content" role="tabpanel">
  <!-- Navigation content -->
</div>
```

**Navigation:**
```html
<nav aria-label="Main navigation">
  <a href="/dashboard" aria-current="page">Dashboard</a>
  <!-- etc -->
</nav>
```

### 9.2 Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move focus to next focusable element |
| Shift+Tab | Move focus to previous element |
| Enter/Space | Activate focused element (toggle, nav item) |
| Arrow Left/Right | Switch between role toggle tabs |

### 9.3 Screen Reader Announcements

| Event | Announcement |
|-------|--------------|
| Role toggle | "Switched to [Admin/Student] view" |
| Navigation | "Navigated to [Page name]" |
| Collapse | "Sidebar collapsed" |
| Expand | "Sidebar expanded" |

### 9.4 Focus Management

- Focus is trapped within sidebar when collapsed (mobile)
- Focus returns to trigger when modal/drawer closes
- Active nav item receives focus on route change

---

## 10. Edge Cases & Error Handling

### 10.1 Role Toggle Edge Cases

| Scenario | Behavior |
|----------|----------|
| Rapid toggle clicks | Debounce at 300ms, queue final state |
| Toggle during page load | Wait for hydration, then allow toggle |
| Toggle while nav animating | Complete current animation, then switch |
| Browser back/forward | Does not affect role toggle state |
| Page refresh | Reset to role default, not persisted preference |

### 10.2 Navigation Edge Cases

| Scenario | Behavior |
|----------|----------|
| Active page deleted | Navigate to closest valid parent |
| Deep link to inaccessible page | Show 404 within context, or redirect |
| Very long label | Truncate with ellipsis, full text in tooltip |
| Missing icon | Render placeholder circle with label initial |
| Network error on page | Show inline error, don't change nav state |

### 10.3 Collapse Edge Cases

| Scenario | Behavior |
|----------|----------|
| Toggle during animation | Reverse to target state |
| Resize window while collapsed | Maintain collapsed state |
| Keyboard shortcut conflict | Let OS handle system shortcuts |
| Very narrow screen | Auto-collapse at < 640px |

### 10.4 Profile Edge Cases

| Scenario | Behavior |
|----------|----------|
| Missing name | Show "User" as fallback |
| Very long name (>20 chars) | Truncate to 20 chars + "..." |
| Missing avatar | Show initials only |
| Avatar load error | Fallback to initials |

---

## 11. Implementation Checklist

### 11.1 Phase 1: Foundation

- [ ] Create `useRoleToggle` hook for view mode state
- [ ] Create `RoleToggle` component
- [ ] Add CSS custom properties for role toggle
- [ ] Create `NavItem` component with variant prop
- [ ] Create `SectionLabel` component
- [ ] Update `theme.css` with new tokens

### 11.2 Phase 2: Navigation Structure

- [ ] Define student nav items array
- [ ] Define admin nav items with groupings
- [ ] Implement nav grouping in Admin view
- [ ] Update active state detection logic
- [ ] Add role-specific styling

### 11.3 Phase 3: Collapsed State

- [ ] Update collapse logic to hide role toggle
- [ ] Implement tooltip on collapsed nav items
- [ ] Update section labels to hide when collapsed
- [ ] Test tooltip positioning
- [ ] Add tooltip animation

### 11.4 Phase 4: Transitions & Polish

- [ ] Implement role switch animation
- [ ] Update collapse/expand animation
- [ ] Add hover transition timing
- [ ] Test 60fps performance
- [ ] Add focus ring styles

### 11.5 Phase 5: Accessibility

- [ ] Add ARIA attributes to all components
- [ ] Implement keyboard navigation
- [ ] Add screen reader announcements
- [ ] Test with VoiceOver/NVDA
- [ ] Verify WCAG 2.1 AA compliance

### 11.6 Phase 6: Testing

- [ ] Unit tests for state management
- [ ] Integration tests for role switching
- [ ] Visual regression tests
- [ ] Cross-browser testing
- [ ] Mobile viewport testing (320px - 428px)
- [ ] Tablet viewport testing (768px - 1024px)
- [ ] Desktop viewport testing (1280px+)
- [ ] 720px minimum height testing

---

## Appendix A: File Structure

```
components/
├── foundation/
│   └── left-rail/
│       ├── left-rail.tsx           # Main component
│       ├── left-rail.config.ts    # Nav item configs
│       ├── hooks/
│       │   └── use-view-mode.ts   # View mode state hook
│       └── components/
│           ├── role-toggle.tsx    # Role switcher
│           ├── nav-item.tsx       # Individual nav item
│           ├── nav-section.tsx    # Grouped nav section
│           ├── nav-section-label.tsx
│           ├── utility-item.tsx   # Theme, collapse, etc.
│           └── profile-section.tsx
```

## Appendix B: Icon Reference

**Student Navigation:**
| Item | Phosphor Icon |
|------|---------------|
| Dashboard | `House` |
| Subjects | `Books` |
| AI Tutor | `Robot` |
| Stats | `ChartPieSlice` |
| Forum | `ChatCircle` |

**Admin Navigation:**
| Item | Phosphor Icon |
|------|---------------|
| Command Center | `LayoutDashboard` |
| Users | `Users` |
| Content | `BookOpenCheck` |
| Moderation | `Flag` |
| Community | `MessagesSquare` |
| Forum | `ChatCircle` |
| Analytics | `BarChart3` |
| Audit | `ScrollText` |
| Notifications | `Bell` |
| Settings | `Gear` |

**Utility:**
| Item | Phosphor Icon |
|------|---------------|
| Collapse | `CaretDoubleLeft` / `CaretDoubleRight` |
| Expand | `CaretDoubleRight` |
| Sign Out | `SignOut` |
| Theme | `Sun` / `Moon` / `CircleHalf` |

**Role Toggle:**
| Role | Phosphor Icon |
|------|---------------|
| Admin | `ShieldCheck` |
| Student | `GraduationCap` |

---

**End of Specification**
