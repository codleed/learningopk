# LearningoPK Redesign Plan

> Inspired by [Uxcel](https://uxcel.com) — structured, gamified, bold.

**Goal:** Complete frontend UI redesign with dual dark/light themes, gamified progress UI, card-based layouts, bold typography, and smooth micro-animations.

**Architecture:** Next.js 16 App Router with Tailwind CSS v4 (CSS-first config), CVA + cn() component pattern, next-themes for theme management, Framer Motion for animations, Radix UI for accessible primitives.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Framer Motion, Radix UI, ECharts, @tanstack/react-virtual, next-themes, CVA, Lucide React, KaTeX, react-markdown, CodeMirror

---

## Design Direction

### Aesthetic

Dark-first design inspired by Uxcel's structured, gamified learning platform. Deep navy/slate dark theme with indigo accent. Clean white/slate light theme. Strong visual hierarchy through card elevation, spacing, and typography weight.

### Color Palette

**Dark Theme (default)**

- `--bg-base: #0D0F17` — page background (near-black navy)
- `--bg-surface: #151825` — card backgrounds
- `--bg-elevated: #1E2235` — modals, dropdowns
- `--bg-subtle: #252A3D` — hover states
- `--accent-primary: #6366F1` — indigo main CTA
- `--accent-success: #22C55E` — completion, correct answers
- `--accent-warning: #F59E0B` — streaks, gamification
- `--accent-danger: #EF4444` — errors, wrong answers
- `--accent-info: #38BDF8` — info, links
- `--text-primary: #F1F5F9` — main text
- `--text-secondary: #94A3B8` — secondary text
- `--text-muted: #4B5472` — disabled/muted

**Light Theme**

- `--bg-base: #F8FAFC` — page background
- `--bg-surface: #FFFFFF` — card backgrounds
- `--bg-elevated: #F1F5F9` — modals, dropdowns
- `--bg-subtle: #E8EDF5` — hover states
- `--accent-primary: #4F52E8` — indigo adjusted for light
- Text: slate scale (#0F172A, #475569, #94A3B8)

### Typography

- **Display/Headings:** Syne (600, 700, 800) — angular, distinctive, memorable
- **Body text:** DM Sans (400, 500) — clean, highly readable
- **Monospace:** JetBrains Mono (400, 500) — code, AI chat

### Spacing

4px grid system. All spacing values are multiples of 4px.
Range: 4px (--space-1) to 80px (--space-20).

---

## Dependency Changes

### Remove

```bash
pnpm remove --filter frontend @heroui/react @phosphor-icons/react hummingbird swiper @chenglou/pretext react-force-graph-2d html-to-image react-activity-calendar
```

**Rationale:**

- `@heroui/react` — too opinionated, fights custom design system
- `@phosphor-icons/react` — consolidating on Lucide React only
- `hummingbird`, `swiper`, `@chenglou/pretext`, `react-force-graph-2d`, `html-to-image`, `react-activity-calendar` — unused or replaceable with custom components

### Add

```bash
pnpm add --filter frontend next-themes remark-breaks rehype-highlight react-syntax-highlighter @types/react-syntax-highlighter
```

**Rationale:**

- `next-themes` — SSR-safe theme persistence, prevents flash
- `remark-breaks` — line break support in markdown
- `rehype-highlight` — code syntax highlighting in markdown
- `react-syntax-highlighter` — standalone code block component

### Keep

- Tailwind CSS 4, Framer Motion, Radix UI (`radix-ui`), ECharts, Lucide React
- react-markdown, remark-math, remark-gfm, rehype-katex, rehype-raw
- CodeMirror (for editor), KaTeX, react-katex, Zod
- class-variance-authority, clsx, tailwind-merge
- @tanstack/react-virtual (already installed)
- better-auth (authentication)
- @learningopk/shared (workspace types)

---

## Component Build Order

### Phase 1: Foundation

1. `tokens.css` — design tokens (colors, spacing, typography, shadows)
2. `globals.css` — updated Tailwind v4 config with new tokens
3. `layout.tsx` — root layout with next-themes, new fonts
4. `cn()` utility — already exists in `lib/utils.ts`

### Phase 2: UI Primitives (`components/ui/`)

5. `button.tsx` — CVA, 6 variants, 5 sizes, loading state
6. `card.tsx` — 4 variants, hover effects, gradient border option
7. `badge.tsx` — 6 variants, 3 sizes
8. `input.tsx` — default/ghost, prefix/suffix slots, error state
9. `avatar.tsx` — 5 sizes, online indicator, initials fallback
10. `progress.tsx` — linear + circular, animated fill
11. `skeleton.tsx` — pulse animation, compound variants
12. `tooltip.tsx` — Radix UI based
13. `dialog.tsx` — Radix UI + Framer Motion
14. `sheet.tsx` — slide-in drawer (left/right/bottom)
15. `select.tsx` — Radix UI based
16. `tabs.tsx` — Radix UI, underline/pills/boxed variants
17. `switch.tsx` — Radix UI based
18. `spinner.tsx` — border + dots variants
19. `divider.tsx` — horizontal/vertical with label
20. `empty-state.tsx` — icon + title + description + CTA
21. `alert.tsx` — info/success/warning/danger, dismissible

### Phase 3: Generic Components (`components/common/`)

22. `content-renderer.tsx` — markdown + math + code + GFM
23. `virtual-list.tsx` — @tanstack/react-virtual wrapper
24. `virtual-grid.tsx` — responsive grid virtualization
25. `streaming-text.tsx` — word-by-word AI text streaming
26. `page-header.tsx` — consistent page title + breadcrumbs
27. `stat-card.tsx` — metric display with trend
28. `subject-badge.tsx` — per-subject color + icon
29. `board-badge.tsx` — Federal/Punjab/Sindh badges
30. `progress-ring.tsx` — SVG circular progress
31. `xp-bar.tsx` — gamification XP progress
32. `streak-counter.tsx` — flame icon + day count
33. `code-block.tsx` — standalone syntax-highlighted code

### Phase 4: Layout Components (`components/layout/`)

34. `app-sidebar.tsx` — 240px/64px, collapsible, icon+label nav
35. `app-header.tsx` — 60px sticky, breadcrumb, notifications
36. `app-layout.tsx` — sidebar + header + content wrapper

### Phase 5: Pages (all under `app/`)

37. Landing page (`app/page.tsx`)
38. Dashboard (`app/(dashboard)/dashboard/page.tsx`)
39. Learn page (`app/(learn)/...`)
40. AI Tutor (`app/ai-tutor/page.tsx`)
41. Quiz flow (within learn pages)
42. Mock Exams (within learn pages)
43. Forum (`app/forum/page.tsx`)
44. Stats (`app/(dashboard)/stats/page.tsx`)
45. Auth pages (`app/(auth)/login/page.tsx`, `register/page.tsx`)
46. Settings (`app/(dashboard)/settings/page.tsx`)

---

## Page List

| #   | Page              | File Path                                                  | Route                              |
| --- | ----------------- | ---------------------------------------------------------- | ---------------------------------- |
| 1   | Landing           | `app/page.tsx`                                             | `/`                                |
| 2   | Dashboard         | `app/(dashboard)/dashboard/page.tsx`                       | `/dashboard`                       |
| 3   | Subject Dashboard | `app/(dashboard)/dashboard/[subject]/page.tsx`             | `/dashboard/:subject`              |
| 4   | Subjects List     | `app/(dashboard)/subjects/page.tsx`                        | `/subjects`                        |
| 5   | Subject Detail    | `app/(dashboard)/subjects/[subject]/page.tsx`              | `/subjects/:subject`               |
| 6   | Chapter Detail    | `app/(dashboard)/subjects/[subject]/[chapter]/page.tsx`    | `/subjects/:subject/:chapter`      |
| 7   | Learn (Board)     | `app/(learn)/[board]/[grade]/[subject]/page.tsx`           | `/:board/:grade/:subject`          |
| 8   | Chapter Learn     | `app/(learn)/[board]/[grade]/[subject]/[chapter]/page.tsx` | `/:board/:grade/:subject/:chapter` |
| 9   | Past Papers       | `app/(learn)/past-papers/page.tsx`                         | `/past-papers`                     |
| 10  | AI Tutor          | `app/ai-tutor/page.tsx`                                    | `/ai-tutor`                        |
| 11  | Forum             | `app/forum/page.tsx`                                       | `/forum`                           |
| 12  | Thread Detail     | `app/forum/[threadId]/page.tsx`                            | `/forum/:threadId`                 |
| 13  | Stats             | `app/(dashboard)/stats/page.tsx`                           | `/stats`                           |
| 14  | Calendar          | `app/(dashboard)/calendar/page.tsx`                        | `/calendar`                        |
| 15  | Settings          | `app/(dashboard)/settings/page.tsx`                        | `/settings`                        |
| 16  | Login             | `app/(auth)/login/page.tsx`                                | `/login`                           |
| 17  | Register          | `app/(auth)/register/page.tsx`                             | `/register`                        |

---

## Theme Strategy

### Approach: CSS Custom Properties + next-themes + Tailwind v4

1. **`tokens.css`** defines all design tokens as CSS custom properties on `:root` scoped by `.dark` / `.light` class
2. **`next-themes`** `ThemeProvider` (attribute="class") manages the class on `<html>`, handles SSR flash prevention, and persists preference in localStorage
3. **`globals.css`** uses `@theme inline` to map CSS variables to Tailwind utility classes
4. **Components** use Tailwind classes that reference the mapped variables — never hardcoded colors
5. **`ThemeToggle`** component uses `useTheme()` from next-themes to toggle between light/dark

### CSS Variable Naming Convention

- Backgrounds: `--bg-base`, `--bg-surface`, `--bg-elevated`, `--bg-subtle`
- Accents: `--accent-primary`, `--accent-success`, `--accent-warning`, `--accent-danger`, `--accent-info`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`
- Borders: `--border-default`, `--border-strong`
- Shadows: `--shadow-card`, `--shadow-elevated`

### Tailwind v4 Integration

Map CSS variables in `@theme inline` block:

```css
@theme inline {
  --color-bg-base: var(--bg-base);
  --color-bg-surface: var(--bg-surface);
  --color-accent-primary: var(--accent-primary);
  /* etc. */
}
```

Then use in components: `bg-bg-base`, `text-text-primary`, `border-border-default`

---

## Files to Delete (old design system)

The entire `src/design-system/` directory will be replaced by:

- `src/design-system/tokens.css` (new)
- Rebuilt `src/components/ui/` components
- `next-themes` replacing custom ThemeProvider

Old files to remove:

- `src/design-system/theme/theme.ts`
- `src/design-system/theme/ThemeProvider.tsx`
- `src/design-system/hooks/useTheme.ts`
- `src/design-system/components/Button.tsx`
- `src/design-system/components/Input.tsx`
- `src/design-system/components/Badge.tsx`
- `src/design-system/components/Card.tsx`
- `src/design-system/components/ThemeToggle.tsx`
- `src/design-system/components/Typography.tsx`
