# Dashboard Bento Redesign Design

Date: $date

## Goal
Update the dashboard screen to match the provided bento-style reference while preserving all existing functionality and data flow. Keep components lean, avoid bloat, and use Framer Motion for subtle animations with reduced-motion support.

## Architecture
- Keep the dashboard route and data logic in `frontend/app/(dashboard)/dashboard/page.tsx`.
- Maintain `AppShell` and existing left rail; re-layout the main content into a two-column grid.
  - Main column: hero title, category chips, Most popular grid (2x2), featured course strip.
  - Right column: profile card, activity widget, and My courses list.
- On small screens, stack into a single column with main content first.
- Use Framer Motion for page-level stagger, card entrance, and hover lift with `useReducedMotion`.

## Components
- Header row: title + category chips.
- Most popular grid: tinted cards with icon badge, rating, student count, avatars.
- Featured course strip: gradient/tint with rating and avatars.
- Right sidebar:
  - Profile card with avatar/name/stats.
  - Activity widget with simple bar chart and timeframe pill.
  - My courses list cards mirroring the reference.
- Reuse `DashboardSurface` and `DashboardCard`; avoid new component files unless a sub-block is reused twice.

## Data Flow
- No API changes; keep `getDashboardSummary`, `getForumFilters`, `getSubjectOverview`.
- Map existing summary data into the new UI slots:
  - Categories from top subjects or a small static fallback.
  - Most popular from top 4 `orderedSubjects`.
  - Featured course from `featuredSubject`.
  - My courses from remaining subjects or top 2 fallback.
  - Activity widget from `weeklyActivity` and `recentActivity` counts.

## Error Handling
- Preserve `ErrorState` for fetch failures.
- If summary data is absent, show empty-state cards instead of removing sections.
- Links degrade to `/dashboard` if subject data is missing.

## Testing
- No new tests expected if functionality remains unchanged.
- Preserve existing `data-testid` and avoid breaking E2E selectors.

## Out of Scope
- No API or backend changes.
- No global design system refactor.
