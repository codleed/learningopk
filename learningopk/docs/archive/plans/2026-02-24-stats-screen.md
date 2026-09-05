# Stats Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a dedicated `/stats` route with daily heatmap, subject-wise progress, streak and trend insights, weak-subject highlights, and goal tracking.

**Architecture:** Extend the existing dashboard progress payload with additional analytics inputs (`dailyActivity`, `quizHistory`), then render a dedicated server route (`/stats`) using reusable dashboard surfaces plus new stats-specific components. Keep all calculations deterministic in pure helper functions.

**Tech Stack:** Next.js App Router, TypeScript, Express, Drizzle ORM, node:test, Playwright

---

### Task 1: Add failing backend unit tests for analytics helpers

**Files:**

- Create: `backend/src/tests/unit/stats-analytics.unit.test.ts`
- Modify: `backend/src/lib/progress-metrics.ts`

**Step 1: Write the failing test**

- Add tests for:
  - longest streak calculation from unordered date keys
  - last-N-day activity series generation with zero-filled days

**Step 2: Run test to verify it fails**

- Run: `pnpm --filter backend test:unit`
- Expected: FAIL because helper functions are not exported yet.

**Step 3: Write minimal implementation**

- Add helper exports in `progress-metrics.ts`:
  - `calculateLongestStreakDays`
  - `buildDailyActivitySeries`

**Step 4: Run test to verify it passes**

- Run: `pnpm --filter backend test:unit`
- Expected: PASS for new unit tests.

### Task 2: Extend dashboard API payload with stats data

**Files:**

- Modify: `backend/src/routes/progress.ts`
- Modify: `frontend/lib/progress-api.ts`

**Step 1: Write failing consumer expectation**

- Update frontend zod schema to require new fields:
  - `dailyActivity`
  - `quizHistory`

**Step 2: Run typecheck to verify it fails**

- Run: `pnpm --filter frontend typecheck`
- Expected: FAIL because backend response mapping/types do not satisfy new schema usages yet.

**Step 3: Write minimal implementation**

- In backend dashboard route:
  - derive `dailyActivity` for last 90 UTC days from existing daily counts map
  - derive `quizHistory` from recent quiz attempts sorted by completion date
- In frontend API client:
  - parse and expose both new fields in `DashboardSummaryResponse`.

**Step 4: Run verification**

- Run:
  - `pnpm --filter backend test:unit`
  - `pnpm --filter frontend typecheck`
- Expected: PASS.

### Task 3: Add failing E2E for dedicated `/stats` route

**Files:**

- Create: `frontend/tests/e2e/stats-screen.spec.ts`

**Step 1: Write the failing test**

- Register a student, navigate to `/stats`, and assert presence of:
  - page title
  - daily streak heatmap section
  - subject progress section
  - goals section

**Step 2: Run test to verify it fails**

- Run: `pnpm --filter frontend exec playwright test tests/e2e/stats-screen.spec.ts`
- Expected: FAIL because `/stats` route does not exist yet.

### Task 4: Implement `/stats` route and UI sections

**Files:**

- Create: `frontend/app/(dashboard)/stats/page.tsx`
- Create: `frontend/components/stats/daily-streak-heatmap.tsx`
- Create: `frontend/components/stats/subject-progress-overview.tsx`
- Create: `frontend/components/stats/stats-goals.tsx`
- Create: `frontend/components/stats/weekly-trend.tsx`
- Create: `frontend/components/stats/quiz-accuracy-trend.tsx`
- Create: `frontend/lib/stats-metrics.ts`
- Modify: `frontend/components/foundation/left-rail.tsx`
- Modify: `frontend/proxy.ts`

**Step 1: Write minimal implementation**

- Build the dedicated stats page and reusable sections.
- Reuse `AppShell`, `DashboardSection`, and `DashboardCard`.
- Compute derived stats in `stats-metrics.ts`:
  - longest streak
  - weekly trend buckets
  - moving average quiz accuracy
  - weak-subject ranking
  - simple weekly goals progress
- Update left rail to include `/stats` active state and keep dashboard navigation coherent.
- Protect `/stats` in proxy matcher.

**Step 2: Run tests to verify GREEN**

- Run: `pnpm --filter frontend exec playwright test tests/e2e/stats-screen.spec.ts`
- Expected: PASS.

### Task 5: Final verification

**Files:**

- Modify as needed from previous tasks only.

**Step 1: Run full targeted verification**

- Run:
  - `pnpm --filter backend test:unit`
  - `pnpm --filter frontend typecheck`
  - `pnpm --filter frontend lint`
  - `pnpm --filter frontend exec playwright test tests/e2e/stats-screen.spec.ts`

**Step 2: Confirm outputs and summarize**

- Capture pass/fail evidence and report any residual risk if a command cannot run in this environment.
