# LearningoPK Design System

> A dual-token architecture built on Tailwind CSS v4 + shadcn/ui, with custom design-system tokens for application code and shadcn semantic tokens for `ui/` primitives.

---

## Overview

LearningoPK runs two complementary token systems:

| System | Source file | Used by | Tailwind prefix |
|--------|-----------|---------|-----------------|
| **Design-system tokens** | `src/design-system/tokens.css` | All application components | `bg-bg-*`, `text-text-*`, `border-border-*`, `text-accent-*` |
| **shadcn bridge tokens** | `app/theme.css` | `@/components/ui/*` only | `bg-card`, `text-foreground`, `bg-primary`, etc. |

The bridge in `app/globals.css` maps both systems into `@theme inline` so Tailwind v4 can resolve either set of utilities.

### Token usage rules

1. In `@/components/ui/` — use **shadcn tokens** (`text-foreground`, `bg-card`, `bg-primary`, etc.)
2. In all other components — use **design-system tokens** (`text-text-primary`, `bg-bg-surface`, `text-accent-primary`, etc.)
3. **Never mix** both systems in the same file.
4. **Never use hardcoded hex colors** — always reference tokens.

---

## Color System

### Design-system tokens (primary system)

#### Backgrounds

| Token | Dark | Light |
|-------|------|-------|
| `--bg-base` | `#0D0F17` | `#F8FAFC` |
| `--bg-surface` | `#151825` | `#FFFFFF` |
| `--bg-elevated` | `#1E2235` | `#F1F5F9` |
| `--bg-subtle` | `#252A3D` | `#E8EDF5` |

#### Accent colors

| Token | Dark | Light |
|-------|------|-------|
| `--accent-primary` | `#6366F1` | `#4F52E8` |
| `--accent-primary-hover` | `#7C7FF5` | `#6366F1` |
| `--accent-primary-light` | `rgba(99,102,241,0.15)` | `rgba(79,82,232,0.1)` |
| `--accent-primary-fg` | `#FFFFFF` | `#FFFFFF` |
| `--accent-success` | `#22C55E` | `#16A34A` |
| `--accent-success-light` | `rgba(34,197,94,0.15)` | `rgba(22,163,74,0.1)` |
| `--accent-warning` | `#F59E0B` | `#D97706` |
| `--accent-warning-light` | `rgba(245,158,11,0.15)` | `rgba(217,119,6,0.1)` |
| `--accent-danger` | `#EF4444` | `#DC2626` |
| `--accent-danger-light` | `rgba(239,68,68,0.15)` | `rgba(220,38,38,0.1)` |
| `--accent-info` | `#38BDF8` | `#0284C7` |
| `--accent-info-light` | `rgba(56,189,248,0.15)` | `rgba(2,132,199,0.1)` |

#### Text

| Token | Dark | Light |
|-------|------|-------|
| `--text-primary` | `#F1F5F9` | `#0F172A` |
| `--text-secondary` | `#94A3B8` | `#475569` |
| `--text-muted` | `#64748B` | `#94A3B8` |
| `--text-inverse` | `#0D0F17` | `#F8FAFC` |

> **Accessibility note:** `--text-muted` was updated from `#4B5472` to `#64748B` (dark) to meet WCAG AA contrast requirements against `--bg-surface`.

#### Borders

| Token | Dark | Light |
|-------|------|-------|
| `--border-default` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` |
| `--border-strong` | `rgba(255,255,255,0.16)` | `rgba(0,0,0,0.14)` |

#### Shadows

| Token | Dark | Light |
|-------|------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.3)` | `0 1px 3px rgba(0,0,0,0.06)` |
| `--shadow-card` | `0 4px 24px rgba(0,0,0,0.4)` | `0 2px 12px rgba(0,0,0,0.08)` |
| `--shadow-elevated` | `0 8px 40px rgba(0,0,0,0.6)` | `0 8px 32px rgba(0,0,0,0.14)` |

### shadcn bridge tokens (for `ui/` components)

Defined in `app/theme.css`. These map design-system tokens to shadcn semantic names so that `@/components/ui/*` components work with the standard shadcn API.

| shadcn token | Dark resolves to | Light resolves to |
|-------------|------------------|-------------------|
| `--background` | `--bg-base` | `--bg-base` |
| `--foreground` | `--text-primary` | `--text-primary` |
| `--card` | `--bg-surface` | `--bg-surface` |
| `--card-foreground` | `--text-primary` | `--text-primary` |
| `--popover` | `--bg-elevated` | `--bg-elevated` |
| `--popover-foreground` | `--text-primary` | `--text-primary` |
| `--primary` | `--accent-primary` | `--accent-primary` |
| `--primary-foreground` | `--accent-primary-fg` | `--accent-primary-fg` |
| `--primary-hover` | `--accent-primary-hover` | `--accent-primary-hover` |
| `--secondary` | `--bg-surface` | `--bg-elevated` |
| `--secondary-foreground` | `--text-primary` | `--text-primary` |
| `--muted` | `--bg-subtle` | `--bg-subtle` |
| `--muted-foreground` | `--text-secondary` | `--text-secondary` |
| `--accent` | `--bg-subtle` | `--bg-subtle` |
| `--accent-foreground` | `--text-primary` | `--text-primary` |
| `--destructive` | `--accent-danger` | `--accent-danger` |
| `--destructive-foreground` | `--accent-primary-fg` | `--accent-primary-fg` |
| `--success` | `--accent-success` | `--accent-success` |
| `--success-foreground` | `--text-inverse` | `--accent-primary-fg` |
| `--warning` | `--accent-warning` | `--accent-warning` |
| `--warning-foreground` | `--text-inverse` | `--text-inverse` |
| `--info` | `--accent-info` | `--accent-info` |
| `--info-foreground` | `--text-inverse` | `--accent-primary-fg` |
| `--border` | `--border-default` | `--border-default` |
| `--input` | `--border-strong` | `--border-strong` |
| `--ring` | `--accent-primary` | `--accent-primary` |
| `--radius` | `10px` | `10px` |

### Chart colors

| Token | Dark | Light |
|-------|------|-------|
| `--chart-1` | `#6366F1` | `#4F52E8` |
| `--chart-2` | `#22C55E` | `#16A34A` |
| `--chart-3` | `#F59E0B` | `#D97706` |
| `--chart-4` | `#38BDF8` | `#0284C7` |
| `--chart-5` | `#EF4444` | `#DC2626` |

### Sidebar

| Token | Dark | Light |
|-------|------|-------|
| `--sidebar-bg` | `#0D0F17` | `#FFFFFF` |
| `--sidebar-border` | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.06)` |

### Exercise section accents

Each exercise type has four associated tokens:

| Type | Color name | Dark accent | Light accent |
|------|-----------|-------------|--------------|
| **Long answer** (purple) | `--exercise-long` | `#8B5CF6` | `#7C3AED` |
| **Short answer** (green) | `--exercise-short` | `#22C55E` | `#16A34A` |
| **Fill in blanks** (amber) | `--exercise-blanks` | `#F59E0B` | `#D97706` |
| **Physics** (blue) | `--exercise-physics` | `#38BDF8` | `#0284C7` |

Each type also defines `-light`, `-border`, and `-bg` variants for layered emphasis. Example:

```css
--exercise-long:        #8B5CF6;           /* Solid accent      */
--exercise-long-light:  rgba(139,92,246,0.12);  /* Subtle tint  */
--exercise-long-border: rgba(139,92,246,0.25);  /* Border glow  */
--exercise-long-bg:     rgba(139,92,246,0.06);  /* Header wash  */
```

---

## Typography

Fonts are loaded via `next/font/google` in `app/layout.tsx` and mapped to CSS custom properties.

| Role | Font family | CSS variable | Tailwind class | Weights loaded |
|------|-----------|-------------|----------------|----------------|
| **Display** (headings) | Syne | `--font-display` | `font-display` | 600, 700, 800 |
| **Body** (prose) | DM Sans | `--font-body` / `--font-sans` | `font-body` / `font-sans` | 400, 500 |
| **Code** (monospace) | JetBrains Mono | `--font-mono` | `font-mono` | 400, 500 |

### Automatic application

- `h1`–`h6` → `font-family: var(--font-display)` with `letter-spacing: -0.02em`
- `body` → `font-family: var(--font-body)`
- `code`, `pre`, `kbd`, `samp` → `font-family: var(--font-mono)`

All fonts use `display: "swap"` for performance.

---

## Spacing

A 4 px base grid. All spacing tokens are shared across themes.

| Token | Value | Pixels |
|-------|-------|--------|
| `--space-0` | `0px` | 0 |
| `--space-1` | `4px` | 4 |
| `--space-2` | `8px` | 8 |
| `--space-3` | `12px` | 12 |
| `--space-4` | `16px` | 16 |
| `--space-5` | `20px` | 20 |
| `--space-6` | `24px` | 24 |
| `--space-8` | `32px` | 32 |
| `--space-10` | `40px` | 40 |
| `--space-12` | `48px` | 48 |
| `--space-16` | `64px` | 64 |
| `--space-20` | `80px` | 80 |

---

## Border Radii

| Token | Value |
|-------|-------|
| `--radius-sm` | `6px` |
| `--radius-md` | `10px` |
| `--radius-lg` | `16px` |
| `--radius-xl` | `24px` |
| `--radius-full` | `9999px` |

---

## Transitions

All transitions use `ease-out` easing.

| Token | Duration |
|-------|----------|
| `--transition-fast` | `150ms ease-out` |
| `--transition-normal` | `250ms ease-out` |
| `--transition-slow` | `400ms ease-out` |

Interactive elements (`a`, `button`, `input`, `select`, `textarea`) automatically apply `--transition-fast` to `color`, `background-color`, `border-color`, and `box-shadow`.

### Custom easing curves

```css
--ease-out-expo:     cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out-expo:  cubic-bezier(0.77, 0, 0.175, 1);
```

---

## Layout Constants

| Token | Value | Purpose |
|-------|-------|---------|
| `--sidebar-width` | `240px` | Expanded sidebar width |
| `--sidebar-collapsed` | `64px` | Collapsed sidebar width |
| `--header-height` | `60px` | Top header bar height |
| `--content-max-width` | `1280px` | Max content area width |
| `--left-rail-width` | `72px` | Default left rail offset (updated dynamically by LeftRail) |

---

## Animations

### Core `@keyframes`

| Name | Description | Duration (class) |
|------|-------------|------------------|
| `slide-up` | Fade in + translate Y 10 px → 0 | `0.3s ease-out` |
| `fade-in` | Opacity 0 → 1 | `0.2s ease-out` |
| `pulse-soft` | Opacity 1 → 0.7 → 1 (loop) | `2s ease-in-out infinite` |
| `streaming-dot` | Scale + opacity pulse for typing indicator | — |
| `message-in` | Fade in + translate Y 12 px → 0 | `200ms ease-out` |
| `spin` | 360° rotation (loop) | `1s linear infinite` |
| `shimmer` | Background-position sweep | `2s linear infinite` |
| `count-up-flash` | Scale 1 → 1.05 → 1 with opacity dip | — |
| `streak-pulse` | Scale 1 → 1.08 → 1 (loop) | `2s ease-in-out infinite` |

### Exercise section `@keyframes`

| Name | Description | Duration |
|------|-------------|----------|
| `exercise-section-in` | Fade + translate Y 8 px → 0 (stagger children) | `280ms ease-out-expo` |
| `exercise-border-glow` | Left-border opacity 0.7 → 1 → 0.7 (loop) | `2s ease-in-out infinite` |
| `exercise-content-enter` | Fade + translate Y 6 px + scale 0.995 → 1 | `250ms ease-out-expo` |
| `blank-highlight` | Background-position shimmer for blank answers | `2.5s linear infinite` |

### Animation utility classes

```css
.animate-slide-up         /* slide-up 0.3s ease-out forwards */
.animate-fade-in          /* fade-in 0.2s ease-out forwards */
.animate-pulse-soft       /* pulse-soft 2s ease-in-out infinite */
.animate-message-in       /* message-in 200ms ease-out forwards */
.animate-spin             /* spin 1s linear infinite */
.animate-shimmer          /* shimmer 2s linear infinite */
.animate-streak-pulse     /* streak-pulse 2s ease-in-out infinite */
.animate-exercise-content-enter  /* exercise-content-enter 250ms ease-out-expo forwards */
```

---

## Utility Classes

### Glassmorphism

| Class | Background | Blur | Border | Radius |
|-------|-----------|------|--------|--------|
| `.glass` | `--bg-surface` | `16px` | `1px solid --border-default` | `--radius-md` |
| `.glass-sm` | `--bg-elevated` | `12px` | `1px solid --border-default` | `--radius-md` |

### Interaction helpers

| Class | Effect |
|-------|--------|
| `.hover-lift` | `translateY(-2px)` + `--shadow-card` on hover |
| `.focus-ring` | `ring-2 ring-accent-primary/40 ring-offset-2` on `:focus-visible` |
| `.transition-smooth` | `all 0.25s cubic-bezier(0.4, 0, 0.2, 1)` |

### Text utilities

| Class | Effect |
|-------|--------|
| `.gradient-text` | Linear gradient from `--accent-primary` to `--accent-info`, clipped to text |
| `.text-balance` | `text-wrap: balance` |

### Scrollbar

| Class | Effect |
|-------|--------|
| `.scrollbar-thin` | 5 px thin scrollbar, track transparent, thumb `--border-default` |

### Exercise section classes

| Class | Purpose |
|-------|---------|
| `.exercise-section-card` | Base card: `--radius-lg` border, `--bg-surface` bg, 3 px left accent bar via `::before` |
| `.exercise-section-stagger` | Stagger-animates children (50 ms increments, up to 8 children, 400 ms fallback for 9+) |
| `.blank-underline-active` | Animated shimmer underline for blank answers using `--exercise-blanks-light` |

The `.exercise-section-card` uses `data-type` attributes to set per-section accent colors:

```html
<div class="exercise-section-card" data-type="long">...</div>
<div class="exercise-section-card" data-type="short">...</div>
<div class="exercise-section-card" data-type="blanks">...</div>
<div class="exercise-section-card" data-type="physics">...</div>
```

Active/focus states add a border glow and outer ring matching the section accent.

---

## Component Architecture

### UI Primitives — `@/components/ui/`

24 shadcn-based components. Import from the barrel export:

```tsx
import { Button, Card, Badge } from "@/components/ui";
```

| Component | File | Key exports |
|-----------|------|-------------|
| Alert | `alert.tsx` | `Alert` |
| Avatar | `avatar.tsx` | `Avatar`, `AvatarGroup` |
| Badge | `badge.tsx` | `Badge`, `StatusPill`, `badgeVariants` |
| Button | `button.tsx` | `Button`, `buttonVariants` |
| Card | `card.tsx` | `Card`, `CardHeader`, `CardBody`, `CardFooter`, `CardTitle`, `CardDescription`, `CardContent`, `CardActions` |
| Checkbox | `checkbox.tsx` | `Checkbox` |
| Confirm Dialog | `confirm-dialog.tsx` | `ConfirmDialog` |
| Dialog | `dialog.tsx` | `Dialog`, `DialogHeader`, `DialogBody`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogTrigger`, `DialogClose` |
| Divider | `divider.tsx` | `Divider` |
| Empty State | `empty-state.tsx` | `EmptyState` |
| Input | `input.tsx` | `Input` |
| Progress | `progress.tsx` | `LinearProgress`, `CircularProgress` |
| Select | `select.tsx` | `Select`, `NativeSelect`, `RadixSelect`, `SelectItem`, `SelectGroup`, `SelectSeparator` |
| Sheet | `sheet.tsx` | `Sheet`, `SheetHeader`, `SheetBody`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetTrigger`, `SheetClose` |
| Skeleton | `skeleton.tsx` | `Skeleton`, `SkeletonCard`, `SkeletonTable`, `SkeletonList` |
| Spinner | `spinner.tsx` | `Spinner` |
| Switch | `switch.tsx` | `Switch` |
| Tabs | `tabs.tsx` | `Tabs`, `TabList`, `TabTrigger`, `TabContent` |
| Textarea | `textarea.tsx` | `Textarea` |
| Theme Toggle | `theme-toggle.tsx` | `ThemeToggle`, `ThemeToggleCompact` |
| Toast | `toast.tsx` | `ToastProvider`, `useToast` |
| Tooltip | `tooltip.tsx` | `Tooltip`, `TooltipProvider`, `TooltipRoot`, `TooltipTrigger`, `TooltipContent`, `TooltipArrow` |

### State components — `@/components/ui/states`

Composite state feedback patterns exported from `states.tsx`:

| Component | Purpose |
|-----------|---------|
| `ErrorState` | Error display with optional retry action (`onRetry`, `retryLabel`) |
| `LoadingSkeleton` | Loading placeholder with animated rows (variants: `default`, `card`, `list`) |
| `SuccessState` | Success confirmation with icon and optional action |
| `CardSkeleton` | Skeleton grid for card layouts (`count` prop) |
| `PageSkeleton` | Full-page skeleton with header + content rows |
| `ThreadSkeleton` | Skeleton for thread/conversation lists |

### Layout — `@/components/layout/`

| Component | File | Purpose |
|-----------|------|---------|
| `StandardLayout` | `standard-layout.tsx` | Centered content wrapper with responsive padding and `maxWidth` prop (`default` / `wide` / `full`) |
| `PageContainer` | `page-container.tsx` | Combines `PageHeader` + content area with breadcrumbs, actions, and configurable `contentPadding` |

### PageHeader — `@/components/common/page-header`

The canonical page header. Renders display-font heading (Syne), optional breadcrumb trail, subtitle, badge, and right-aligned action slot.

```tsx
import { PageHeader } from "@/components/common/page-header";

<PageHeader
  title="Chapter Overview"
  subtitle="Review your progress"
  breadcrumbs={[
    { label: "Dashboard", href: "/dashboard" },
    { label: "Physics" },
  ]}
  badge={<Badge variant="success">Active</Badge>}
  actions={<Button size="sm">Export</Button>}
/>
```

### Foundation — `@/components/foundation/`

App-level structural components:

| Component | File | Purpose |
|-----------|------|---------|
| `AppShell` | `app-shell.tsx` | Top-level app wrapper |
| `AuthLayoutWrapper` | `auth-layout-wrapper.tsx` | Auth page layout |
| `LeftRail` | `left-rail.tsx` + `left-rail/` | Collapsible sidebar navigation (config in `left-rail-config.ts`, types in `left-rail-types.ts`, role toggle in `role-toggle.tsx`) |
| `DashboardPrimitives` | `dashboard-primitives.tsx` | Shared dashboard layout building blocks |
| `SectionCard` | `section-card.tsx` | Section-level card wrapper |
| `RouteState` | `route-state.tsx` | Route-level loading/error states |
| `ServiceUnavailable` | `service-unavailable.tsx` | Service down fallback UI |
| `Tabs` | `tabs.tsx` | Foundation-level tab navigation |
| `PageHeader` | `page-header.tsx` | Foundation-level page header (prefer `@/components/common/page-header` for new code) |

### Common — `@/components/common/`

Shared domain components:

| Component | Purpose |
|-----------|---------|
| `BoardBadge` | Education board indicator |
| `CodeBlock` | Syntax-highlighted code display |
| `ContentRenderer` | Renders mixed content (markdown, LaTeX, etc.) |
| `PageHeader` | **Canonical page header** — use this one |
| `ProgressRing` | Circular progress indicator |
| `StatCard` | Metric display card |
| `StreakCounter` | Learning streak tracker |
| `StreamingText` | Typewriter-style AI text output |
| `SubjectBadge` | Subject category indicator |
| `VirtualGrid` | Virtualized grid layout |
| `VirtualList` | Virtualized list layout |
| `XpBar` | Experience points progress bar |

---

## Accessibility

### Focus states

All interactive elements receive a visible focus ring via the base layer:

```css
:focus-visible {
  outline: none;
  ring: 2px solid accent-primary/40;
  ring-offset: 2px;
  ring-offset-color: var(--bg-base);
}
```

The `.focus-ring` utility class provides the same treatment declaratively.

### Reduced motion

When `prefers-reduced-motion: reduce` is active:

- **All animation utility classes** are disabled (`animation: none !important`)
- **Stagger children** render at `opacity: 1` immediately
- **Exercise card border glow** is disabled
- **Blank underline shimmer** is disabled
- **Hover lift** transform is suppressed
- **KaTeX** animations and transitions are removed

```css
@media (prefers-reduced-motion: reduce) {
  .animate-slide-up,
  .animate-fade-in,
  .animate-pulse-soft,
  .animate-message-in,
  .animate-spin,
  .animate-shimmer,
  .animate-streak-pulse,
  .animate-exercise-content-enter {
    animation: none !important;
  }
  /* … plus stagger, border glow, blank underline, hover-lift, katex */
}
```

### Color contrast

- All text tokens are chosen to meet **WCAG AA** contrast ratios against their expected background surfaces.
- State components (`ErrorState`, `SuccessState`) use accessible color pairings from the accent system.

---

## File Map

```
frontend/
├── app/
│   ├── globals.css          ← Tailwind v4 @theme bridge, animations, utilities
│   ├── theme.css            ← shadcn semantic variable mapping, glassmorphism
│   └── layout.tsx           ← Font loading (Syne, DM Sans, JetBrains Mono), ThemeProvider
├── src/
│   ├── design-system/
│   │   └── tokens.css       ← Source-of-truth design tokens (colors, spacing, radii, etc.)
│   └── components/
│       ├── ui/              ← 24 shadcn-based primitives (use shadcn tokens)
│       │   ├── states.tsx   ← ErrorState, LoadingSkeleton, SuccessState, CardSkeleton, etc.
│       │   └── index.ts     ← Barrel export
│       ├── layout/          ← StandardLayout, PageContainer
│       ├── common/          ← PageHeader (canonical), StatCard, CodeBlock, etc.
│       └── foundation/      ← AppShell, AuthLayoutWrapper, LeftRail, etc.
```

---

## Quick Reference

### Dark mode default

The app defaults to dark mode. `ThemeProvider` from `next-themes` uses `attribute="class"` with `defaultTheme="dark"` and `enableSystem={false}`.

Theme selectors:
- **Dark:** `:root[class~="dark"]` or `:root:not([class~="light"])`
- **Light:** `:root[class~="light"]`

### Card gradient border

A decorative conic gradient token available for special card treatments:

```css
/* Dark */
--card-gradient: conic-gradient(from 180deg at 50% 50%, #6366F1, #38BDF8, #22C55E, #F59E0B, #6366F1);
/* Light */
--card-gradient: conic-gradient(from 180deg at 50% 50%, #4F52E8, #0284C7, #16A34A, #D97706, #4F52E8);
```
