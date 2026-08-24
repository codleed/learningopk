# Stats Screen Design

## Context

- The app currently exposes progress data through `GET /api/progress/dashboard` and renders a combined dashboard view at `/dashboard`.
- A dedicated stats route does not exist.
- User request: add a dedicated stats screen with daily streak heatmap, subject-wise progress, and additional performance metrics.

## Goals

- Add a protected dedicated `/stats` page in dashboard shell.
- Show a daily activity heatmap focused on streak visibility.
- Show subject-wise progress with completion and score visibility.
- Add supporting metrics:
  - current + longest streak
  - weekly study trend
  - quiz accuracy trend
  - weak-subject indicators
  - weekly goal tracker

## Non-goals

- No new database tables or schema migrations.
- No complex charting library adoption in this iteration.
- No historical session storage for custom date ranges.

## Architecture

- Frontend:
  - Add `frontend/app/(dashboard)/stats/page.tsx`.
  - Add focused stats components in `frontend/components/stats/*`.
  - Add pure metric helpers in `frontend/lib/stats-metrics.ts`.
  - Update left rail navigation to include a direct `/stats` route.
- Backend:
  - Extend dashboard payload with richer analytics inputs while keeping existing fields:
    - `dailyActivity` (last 90 days)
    - `quizHistory` (recent quiz attempts with percentages)
  - Reuse current progress/quiz sources and derive the extra fields in `progressRouter.get("/dashboard")`.

## Data Flow

1. `/stats` server page verifies session and fetches dashboard summary.
2. Page computes derived metrics from `subjects`, `dailyActivity`, and `quizHistory`.
3. UI renders sections for streak, heatmap, subject progress, trends, weak subjects, and goals.

## Error and Empty States

- API failure: display existing shared error surface.
- No activity: render neutral placeholders and zero-state text.
- No subjects: show subject progress empty-state panel.

## Testing Strategy

- TDD route coverage first:
  - Add Playwright test that verifies authenticated access and key stats sections on `/stats`.
- Add backend unit tests for new streak/activity derivation helpers.
- Verify with:
  - `pnpm --filter backend test:unit`
  - `pnpm --filter frontend exec playwright test tests/e2e/stats-screen.spec.ts`
  - `pnpm --filter frontend typecheck`
  - `pnpm --filter frontend lint`
