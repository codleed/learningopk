# LearningoPK UX Audit & Improvement Plan

**Audit Date**: March 21, 2026  
**Auditor**: ArchitectUX Agent  
**Project**: Educational Platform - Next.js + Tailwind CSS + shadcn/ui  
**Scope**: Frontend codebase analysis (C:\Users\Codleed\Desktop\Learningo\learningopk\frontend)

---

## 1. Executive Summary

### Overview

LearningoPK is an educational platform for Pakistani students with features including chapter-based learning, AI tutoring, forum discussions, progress tracking, and quiz systems. The platform has a solid foundation with a well-structured design token system, responsive layouts, and good component organization.

### Key Strengths

- **Design System**: Well-implemented CSS custom properties for theming (`app/theme.css`) with light/dark mode support
- **Component Architecture**: Clean separation between foundation, auth, dashboard, learn, and forum components
- **Motion Design**: Stagger animations and hover effects in `DashboardClient.tsx` provide polished feel
- **Accessibility**: Skip-to-content links, ARIA labels, and semantic HTML present
- **Form Validation**: Comprehensive Zod schema validation across auth forms

### Critical Issues Identified

1. **Navigation Inconsistency**: Mixed sidebar patterns between app-shell and dashboard-chrome layouts
2. **Missing Theme Toggle**: No theme switcher UI despite theme CSS support
3. **Registration Complexity**: 6-field form with cascading dropdowns creates friction
4. **Quiz Timer Visibility**: Timer only shows when running, no persistent display
5. **Forum Filter Complexity**: 6-filter dropdown system may overwhelm users
6. **Error State Design**: Error states use hardcoded red colors, not design tokens
7. **Loading States**: Missing skeleton states for dynamic content areas
8. **Empty States**: Inconsistent empty state implementations

### Impact Assessment

- **High Impact**: Navigation confusion, registration drop-off, missing theme toggle
- **Medium Impact**: Quiz flow UX, forum complexity, error state inconsistency
- **Low Impact**: Minor spacing issues, tooltip additions, micro-copy improvements

---

## 2. Critical Issues (Must-Fix)

### Issue #1: Missing Theme Toggle Component

**Location**: `app/theme.css` (lines 85-146), No toggle component found

**Problem**: The design system supports light/dark themes via CSS custom properties and `color-scheme`, but there is no UI component for users to switch themes. The `themeInitScript` in `app/layout.tsx` only applies system preference, not user choice.

**Affected Files**:

- `app/layout.tsx` - Theme initialization only
- `app/theme.css` - Theme tokens defined but not switchable

**Recommendation**:

```tsx
// components/ui/theme-toggle.tsx
// Create a theme toggle component with Light/Dark/System options
// Place in auth layout header and dashboard sidebar
// Persist choice to localStorage and update CSS variables
```

**Priority**: HIGH

---

### Issue #2: Navigation Structure Inconsistency

**Location**: `components/foundation/app-shell.tsx` vs `components/dashboard/dashboard-chrome-layout.tsx`

**Problem**: The app has two different navigation wrapper patterns:

1. `AppShell` - Used by dashboard and subjects pages with collapsible left rail
2. `DashboardChromeLayout` - Used by forum and AI-tutor with `DashboardSurface` header

This creates inconsistent navigation experiences. Calendar link in left-rail (`/dashboard?rail=calendar`) is a query parameter hack rather than proper route.

**Affected Files**:

- `components/foundation/app-shell.tsx`
- `components/foundation/auth-layout-wrapper.tsx`
- `components/foundation/left-rail.tsx` (line 123)
- `components/dashboard/dashboard-chrome-layout.tsx`

**Recommendation**:

1. Unify navigation under `AppShell` pattern
2. Create proper `/calendar` route instead of query parameter
3. Standardize header component across all authenticated pages

**Priority**: HIGH

---

### Issue #3: Registration Form Complexity

**Location**: `components/auth/register-form.tsx` (337 lines)

**Problem**: The registration form has 7 required fields (name, class, degree, board, email, password, confirmPassword) with cascading dropdown logic. This creates high cognitive load and potential drop-off.

**Current Flow**:

```
Select Board → Filter Classes → Select Class → Fill Other Fields
```

**Affected Files**:

- `components/auth/register-form.tsx`
- `components/auth/form-field.tsx`

**Recommendation**:

1. Split into multi-step wizard (Profile → Account → Verify)
2. Make degree field optional with placeholder text
3. Use auto-detection for board based on user context
4. Add progress indicator showing completion

**Priority**: HIGH

---

### Issue #4: Quiz Timer Limited Visibility

**Location**: `components/learn/quiz-timer.tsx`, `components/learn/quiz-runner.tsx`

**Problem**: The timer only appears in quiz mode. If users navigate away or lose focus, they may not realize time is expiring. No browser notification or persistent header timer.

**Affected Files**:

- `components/learn/quiz-runner.tsx` (lines 61, 169)
- `components/learn/quiz-timer.tsx`

**Recommendation**:

1. Add timer to chapter study workspace header
2. Implement Web Notifications API for time warnings (5 min, 1 min)
3. Add visual pulse effect when < 1 minute remaining

**Priority**: MEDIUM

---

### Issue #5: Error States Use Hardcoded Colors

**Location**: `components/ui/states.tsx` (lines 43-47)

**Problem**: ErrorState component uses hardcoded red colors (`border-red-200`, `bg-red-50/80`, `text-red-900`) instead of design tokens (`--destructive`).

**Current Code**:

```tsx
className = "rounded-2xl border border-red-200 bg-red-50/80 p-8 text-center";
```

**Should Use**:

```tsx
className = "rounded-2xl border border-destructive/20 bg-destructive/10 p-8 text-center";
```

**Affected Files**:

- `components/ui/states.tsx`
- `app/theme.css` (has `--destructive: #ef4444` defined)

**Priority**: MEDIUM

---

### Issue #6: Missing Loading Skeleton States

**Location**: Multiple page components

**Problem**: While `LoadingSkeleton` component exists in `components/ui/states.tsx`, it's not used in key areas where data is fetched. Dashboard page has hardcoded fallback values and "mock" data calculations.

**Examples**:

- `app/(dashboard)/dashboard/page.tsx` - Lines 530, 581-591 use mock student counts
- `app/(dashboard)/subjects/page.tsx` - Progress ratings calculated from mock data
- `components/forum/forum-thread-feed.tsx` - Likely needs loading state

**Affected Files**:

- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/subjects/page.tsx`
- `components/forum/forum-thread-feed.tsx`

**Recommendation**:

1. Add `LoadingSkeleton` components while data is fetching
2. Remove hardcoded mock values (friendsCount: 274)
3. Show actual data or proper empty states

**Priority**: MEDIUM

---

## 3. Information Architecture Recommendations

### Navigation Structure

**Current Structure**:

```
Left Rail (Collapsible Sidebar)
├── Dashboard
├── Subjects
├── Stats
├── Forum
├── AI Tutor
└── Settings

Secondary:
├── Calendar (query param hack)
└── Admin (conditional)
```

**Recommended Structure**:

```
Top Header Bar
├── Logo + Brand
├── Global Search
├── Notifications
└── User Menu (Avatar + Dropdown)
    ├── Profile
    ├── Settings
    ├── Theme Toggle
    └── Logout

Left Rail (Collapsible - Optional)
├── Dashboard
├── Subjects
├── Stats
├── Forum
└── AI Tutor

Footer (Minimal)
└── Calendar Link
```

**Files to Modify**:

- `components/foundation/left-rail.tsx` - Restructure as secondary nav
- Create `components/layout/top-header.tsx` - New header component
- `app/(dashboard)/dashboard/page.tsx` - Update layout wrapper

---

### Page Hierarchy Review

**Dashboard Page** (`app/(dashboard)/dashboard/page.tsx`)

- Too much content density (927 lines)
- Hero section, category chips, popular courses, featured banner all in one view
- Recommend: Progressive disclosure with tabs or collapsible sections

**Subjects Page** (`app/(dashboard)/subjects/page.tsx`)

- Good card-based layout
- Progress bars are accessible (uses ARIA attributes)
- Missing: Quick action to resume last chapter

**Forum Page** (`app/forum/page.tsx`)

- Filter bar + compose mode in same component
- Recommend: Sticky filter bar, floating "New Thread" button

---

### Content Grouping Improvements

| Current                      | Recommended                                   |
| ---------------------------- | --------------------------------------------- |
| Dashboard shows all subjects | Group by: In Progress, Completed, Recommended |
| Forum has single feed        | Add: My Threads, Bookmarked, Following        |
| Stats page separate          | Consider: Dashboard widget for key metrics    |

---

## 4. User Flow Improvements

### Auth Flows

#### Login Flow (Current)

```
Login Page → Form Submit → Success → Dashboard
             ↓
        Error Message (inline)
```

**Issues**:

- Error message shows backend URL hint in dev mode (line 48 of login-form.tsx)
- "Remember me" checkbox has no visual feedback when checked
- No show/hide password toggle

**Improvements**:

1. Remove technical error hints from production
2. Add visible password visibility toggle
3. Add "Last logged in as..." hint for returning users

#### Registration Flow (Current)

```
Registration Page → Select Board → Select Class → Fill Form → Submit → Dashboard
                   ↓
              7 required fields on single page
```

**Improvements**:

1. Step 1: Quick profile (name, board - auto-detected)
2. Step 2: Academic info (class, degree - degree optional)
3. Step 3: Account (email, password, confirm)
4. Step 4: Email verification prompt

#### Password Reset Flow

```
Forgot Password → Enter Email → Success Message → Email Link → Reset Page → Success → Login
```

**Issue**: The flow doesn't indicate expected email delivery time or spam folder instructions.

**Improvement**: Add "Check your spam folder" note, resend option with cooldown timer.

---

### Learning Flow

#### Current Flow

```
Subjects List → Subject Detail → Chapter List → Chapter Detail
                                              ↓
                                    ┌─────────┼─────────┐
                                    ↓         ↓         ↓
                                 Summary  Exercises  Quiz
                                    ↓         ↓         ↓
                                    └─────────┴─────────┘
                                              ↓
                                        AI Tutor Panel
```

**Issues**:

1. No clear "Continue where you left off" entry point
2. Tab navigation resets scroll position
3. No breadcrumb navigation back to subject list

**Improvements**:

1. Add persistent breadcrumb: Subjects > [Subject] > [Chapter]
2. Add "Resume Learning" card on chapter detail
3. Remember last active tab in localStorage
4. Add progress percentage per tab

---

### Forum Flow

#### Thread Creation

```
Forum Feed → "Create Thread" → Thread Form → Submit → Thread Detail
                                    ↓
                          Subject + Chapter tagging (optional)
```

**Issues**:

1. Markdown editor with preview toggle is functional but not intuitive
2. No draft auto-save
3. Chapter selection only available after subject selection

**Improvements**:

1. Add toolbar with bold, italic, code, link buttons
2. Auto-save draft every 30 seconds
3. Show tag suggestions based on user's recent subjects

---

## 5. Component Hierarchy Recommendations

### Component Organization

**Current Structure**:

```
components/
├── ui/           # Base components (button, input, badge, states)
├── foundation/    # Layout primitives (app-shell, left-rail, dashboard-primitives)
├── auth/         # Auth-specific components
├── dashboard/    # Dashboard-specific components
├── learn/        # Learning-specific components
└── forum/        # Forum-specific components
```

**Recommended Structure**:

```
components/
├── ui/           # Design system base (unchanged)
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── badge.tsx
│   ├── states.tsx
│   ├── theme-toggle.tsx  # NEW
│   └── toast.tsx
├── layout/       # Layout components (MOVED from foundation)
│   ├── app-shell.tsx
│   ├── top-header.tsx    # NEW
│   ├── left-rail.tsx
│   └── page-container.tsx # NEW - unified content wrapper
├── navigation/   # Navigation components (NEW)
│   ├── main-nav.tsx
│   ├── breadcrumbs.tsx
│   └── user-menu.tsx
├── form/        # Form components (MOVED from auth)
│   ├── form-field.tsx
│   ├── password-input.tsx
│   └── form-layout.tsx
├── card/         # Card components (NEW - unified pattern)
│   ├── content-card.tsx
│   ├── stat-card.tsx
│   └── thread-card.tsx
├── auth/         # Auth-specific (minimal)
│   ├── auth-layout.tsx
│   └── auth-card.tsx
├── dashboard/    # Dashboard-specific (keep as-is)
├── learn/        # Learning-specific (keep as-is)
└── forum/        # Forum-specific (keep as-is)
```

### Design Token Consolidation

**Issues Found**:

1. Spacing uses inconsistent values (`--space-*` in theme.css but Tailwind classes elsewhere)
2. Shadow values defined but not consistently used
3. Card gradient defined but `.surface-card` class ignores it

**Recommendations**:

1. Use Tailwind's `space-*` classes consistently, remove duplicate `--space-*`
2. Create `.card-glass` utility using `--card-gradient`
3. Add shadow utilities: `shadow-soft`, `shadow-elevated`

---

## 6. Usability Fixes (Prioritized)

### Priority 1: Critical Usability

| #   | Issue                      | Location                          | Fix                                     |
| --- | -------------------------- | --------------------------------- | --------------------------------------- |
| 1   | No theme toggle            | Global                            | Create theme-toggle component in header |
| 2   | High registration drop-off | `register-form.tsx`               | Multi-step wizard                       |
| 3   | Navigation inconsistency   | `app-shell` vs `dashboard-chrome` | Unify navigation patterns               |
| 4   | Quiz timer not visible     | `quiz-runner.tsx`                 | Add persistent timer header             |

### Priority 2: Important Usability

| #   | Issue                      | Location               | Fix                                  |
| --- | -------------------------- | ---------------------- | ------------------------------------ |
| 5   | Hardcoded colors in errors | `states.tsx`           | Use design tokens                    |
| 6   | Missing loading skeletons  | Dashboard, Subjects    | Add LoadingSkeleton components       |
| 7   | Forum filter complexity    | `forum-filter-bar.tsx` | Collapse advanced filters by default |
| 8   | No breadcrumb navigation   | Learn pages            | Add breadcrumbs to chapter views     |
| 9   | Mock data in dashboard     | `dashboard/page.tsx`   | Remove hardcoded values              |
| 10  | Calendar as query param    | `left-rail.tsx:123`    | Create proper route                  |

### Priority 3: Enhanced Usability

| #   | Issue                      | Location                 | Fix                               |
| --- | -------------------------- | ------------------------ | --------------------------------- |
| 11  | No draft auto-save         | Forum thread form        | Add auto-save indicator           |
| 12  | Password visibility toggle | `password-input.tsx`     | Add eye icon button               |
| 13  | "Remember me" no feedback  | `login-form.tsx:105-112` | Add visual checked state          |
| 14  | Progress bars need labels  | Subject cards            | Add aria-labels if missing        |
| 15  | Empty state variations     | Various                  | Standardize empty state messaging |

---

## 7. Accessibility Recommendations

### WCAG 2.1 AA Compliance Review

#### Current Strengths

- Skip-to-content links in `app-shell.tsx` (lines 27-32)
- ARIA labels on icons (`aria-hidden`)
- Form field associations via `htmlFor`
- Keyboard focus states (`focus-visible` in globals.css)
- Color contrast in text (foreground on background)

#### Issues to Address

**1. Color Contrast in Badges**

```tsx
// badge.tsx line 12
variant="info": "bg-blue-100 text-blue-700"
```

Blue on light blue may fail AA contrast. Consider darker blue text.

**2. Focus Indicators**

```css
// globals.css line 86-87
:focus-visible {
  @apply outline-none ring-2 ring-ring ring-offset-2 ring-offset-background;
}
```

Ring uses `--ring` which is lime green. Verify contrast against all backgrounds.

**3. Form Error Announcements**
Error messages exist but not announced to screen readers:

```tsx
// login-form.tsx - Error is in paragraph, should use role="alert"
<p className="text-destructive">{errorMessage}</p>
```

**4. Quiz Timer Announcement**
Timer updates every second but no screen reader announcement. Consider:

- Announce time warnings (5 min, 1 min)
- Use `aria-live="polite"` for timer changes

**5. Animation Motion Sensitivity**
Good: `useReducedMotion()` hook exists. Ensure all animations respect it.

**6. Missing ARIA in Custom Select**

```tsx
// select.tsx - Native select with no ARIA
<select ...>
```

Consider adding `aria-describedby` for selected option context.

**7. Navigation Landmarks**
Left rail uses `<aside>` but main content should use `<main>`. Already implemented.

---

### Accessibility Checklist

| Checkpoint          | Status     | File                  |
| ------------------- | ---------- | --------------------- |
| Skip links          | ✅ Present | `app-shell.tsx`       |
| Semantic HTML       | ✅ Good    | Most files            |
| Form labels         | ✅ Present | `form-field.tsx`      |
| Error announcements | ⚠️ Partial | Add `role="alert"`    |
| Focus indicators    | ✅ Present | `globals.css`         |
| Color contrast      | ⚠️ Review  | Badge variants        |
| Reduced motion      | ✅ Present | `DashboardClient.tsx` |
| Screen reader nav   | ✅ Present | `aria-current="page"` |
| Timer announcements | ❌ Missing | `quiz-timer.tsx`      |
| Live regions        | ⚠️ Partial | Add where needed      |

---

## 8. Implementation Priority Matrix

### Phase 1: Critical Foundation (Week 1)

| Task                              | Impact | Effort | Files                                  |
| --------------------------------- | ------ | ------ | -------------------------------------- |
| Create theme toggle component     | HIGH   | MED    | New: `components/ui/theme-toggle.tsx`  |
| Add theme toggle to layouts       | HIGH   | LOW    | `auth-layout.tsx`, `left-rail.tsx`     |
| Fix error state colors            | MED    | LOW    | `components/ui/states.tsx`             |
| Create unified navigation wrapper | HIGH   | MED    | `components/layout/page-container.tsx` |

### Phase 2: Core UX Improvements (Week 2)

| Task                         | Impact | Effort | Files                                        |
| ---------------------------- | ------ | ------ | -------------------------------------------- |
| Multi-step registration      | HIGH   | HIGH   | `components/auth/register-form.tsx`          |
| Add quiz timer header        | MED    | MED    | `components/learn/quiz-runner.tsx`           |
| Add loading skeletons        | MED    | MED    | Dashboard, Subjects, Forum pages             |
| Create breadcrumbs component | MED    | MED    | New: `components/navigation/breadcrumbs.tsx` |

### Phase 3: Navigation & Flow (Week 3)

| Task                           | Impact | Effort | Files                                   |
| ------------------------------ | ------ | ------ | --------------------------------------- |
| Create calendar route          | MED    | LOW    | `app/(dashboard)/calendar/page.tsx`     |
| Remove mock dashboard data     | MED    | LOW    | `dashboard/page.tsx`                    |
| Simplify forum filters         | MED    | MED    | `components/forum/forum-filter-bar.tsx` |
| Add password visibility toggle | LOW    | LOW    | `components/auth/password-input.tsx`    |

### Phase 4: Polish (Week 4)

| Task                           | Impact | Effort | Files                     |
| ------------------------------ | ------ | ------ | ------------------------- |
| Add ARIA live regions          | MED    | LOW    | Quiz timer, error states  |
| Review badge contrast          | LOW    | LOW    | `components/ui/badge.tsx` |
| Add draft auto-save            | LOW    | MED    | Forum thread form         |
| Create component documentation | MED    | MED    | `docs/` folder            |

---

## 9. File-by-File Recommendations Summary

### Design System Files

| File              | Status | Recommendations                                     |
| ----------------- | ------ | --------------------------------------------------- |
| `app/globals.css` | Good   | Consider adding `.card-glass` utility               |
| `app/theme.css`   | Good   | Remove duplicate `--space-*` vars (Tailwind covers) |
| `app/layout.tsx`  | Good   | Theme init script works, needs toggle               |

### UI Components

| File            | Status | Recommendations                         |
| --------------- | ------ | --------------------------------------- |
| `ui/button.tsx` | Good   | Add `loading` variant                   |
| `ui/input.tsx`  | Good   | Consider adding error state variant     |
| `ui/select.tsx` | OK     | Add chevron icon, improve styling       |
| `ui/badge.tsx`  | OK     | Review blue contrast, add more variants |
| `ui/states.tsx` | OK     | Use design tokens for colors            |
| `ui/toast.tsx`  | Good   | Consider action toasts                  |

### Foundation Components

| File                                  | Status | Recommendations                            |
| ------------------------------------- | ------ | ------------------------------------------ |
| `foundation/app-shell.tsx`            | Good   | Standardize usage across app               |
| `foundation/auth-layout-wrapper.tsx`  | Good   | Consider adding header                     |
| `foundation/left-rail.tsx`            | OK     | Move calendar link, add collapse indicator |
| `foundation/dashboard-primitives.tsx` | Good   | Add more surface variants                  |
| `foundation/tabs.tsx`                 | N/A    | Not reviewed                               |

### Auth Components

| File                            | Status     | Recommendations                       |
| ------------------------------- | ---------- | ------------------------------------- |
| `auth/login-form.tsx`           | OK         | Add password visibility, fix checkbox |
| `auth/register-form.tsx`        | Needs Work | Multi-step wizard                     |
| `auth/forgot-password-form.tsx` | Good       | Add spam folder hint                  |
| `auth/reset-password-form.tsx`  | Good       | Good error handling                   |
| `auth/auth-layout.tsx`          | Good       | Add theme toggle to header            |
| `auth/form-field.tsx`           | Good       | Consider adding helper text slot      |
| `auth/password-input.tsx`       | OK         | Add visibility toggle button          |

### Dashboard Components

| File                                    | Status | Recommendations                 |
| --------------------------------------- | ------ | ------------------------------- |
| `dashboard/DashboardClient.tsx`         | Good   | Animation system solid          |
| `dashboard/dashboard-chrome-layout.tsx` | OK     | Align with app-shell            |
| `dashboard/welcome-card.tsx`            | Good   | Simple and clear                |
| `dashboard/streak-card.tsx`             | Good   | Consider adding flame animation |
| `dashboard/subject-progress-card.tsx`   | N/A    | Not reviewed                    |
| `dashboard/weekly-activity-heatmap.tsx` | N/A    | Not reviewed                    |

### Learn Components

| File                      | Status | Recommendations                             |
| ------------------------- | ------ | ------------------------------------------- |
| `learn/chapter-card.tsx`  | Good   | Add progress indicator                      |
| `learn/exercise-item.tsx` | Good   | Native `<details>` is accessible            |
| `learn/quiz-runner.tsx`   | OK     | Add persistent timer, improve accessibility |
| `learn/quiz-timer.tsx`    | OK     | Add screen reader announcements             |

### Forum Components

| File                          | Status | Recommendations               |
| ----------------------------- | ------ | ----------------------------- |
| `forum/forum-thread-card.tsx` | Good   | Consider adding author avatar |
| `forum/forum-filter-bar.tsx`  | OK     | Collapse by default           |
| `forum/forum-thread-form.tsx` | OK     | Add auto-save, toolbar        |

---

## 10. Conclusion

LearningoPK has a strong technical foundation with well-organized components, good design tokens, and solid accessibility basics. The main areas for improvement are:

1. **User Control**: Add theme toggle and calendar navigation
2. **Form Optimization**: Reduce registration complexity
3. **Visual Consistency**: Use design tokens throughout, unify navigation
4. **Feedback Systems**: Add loading states, improve error communication
5. **Accessibility Polish**: Add live regions, improve contrast

The implementation priority matrix provides a clear roadmap for incremental improvements, starting with high-impact foundation work and progressing to polish items.

---

**End of UX Audit Report**
