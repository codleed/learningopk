# Admin Phase 3 Design

## Context
- Phase 1 shipped the admin shell, route completeness, and shell-level e2e coverage.
- Phase 2 activated `/admin/moderation` and `/admin/users` with backend APIs and Playwright coverage.
- Remaining placeholder routes are:
  - `/admin/community`
  - `/admin/analytics`
  - `/admin/notifications`
  - `/admin/settings`
- Existing admin behaviors on `/admin/content`, `/admin/forum`, `/admin/moderation`, and `/admin/users` must remain stable.

## Approach Options

### Option A: Placeholder polish only
- Keep `/admin/community` and `/admin/analytics` as placeholders with better copy and visuals.
- Pros: fastest, lowest risk.
- Cons: no functional value; delays product goals.

### Option B: Full multi-surface activation
- Implement `/admin/community`, `/admin/analytics`, `/admin/notifications`, and `/admin/settings` in one phase.
- Pros: maximum feature velocity.
- Cons: high scope/risk; likely to destabilize prior admin flows and stretch verification time.

### Option C (Recommended): Focused activation of Community + Analytics
- Replace `/admin/community` and `/admin/analytics` placeholders with production-ready read-first workflows.
- Keep notifications/settings explicitly out of scope for later phases.
- Pros: meaningful progress with bounded risk, consistent with prior phase cadence.
- Cons: leaves two placeholders for future phase.

## Approved Direction
- Approach: **Option C, backend-first vertical slices with strict TDD**
- Activate:
  - `/admin/community`: forum health and moderation context view with actionable links
  - `/admin/analytics`: KPI and subject-level performance dashboard
- Preserve all existing admin capabilities and route behavior.

## Goals
- Deliver `/admin/community` with:
  - paginated community thread health list
  - filters for solved state (`all|solved|unsolved`)
  - filters for pinned state (`all|pinned|unpinned`)
  - filters for moderation state (`all|openFlags|noOpenFlags`)
  - per-row metadata: author, created date, replies, views, pinned/solved, open flag count
  - links to open thread detail (`/forum/:id`) and existing moderation surface (`/admin/forum`)
- Deliver `/admin/analytics` with:
  - selectable time window (`7|30|90` days)
  - KPI summary cards
    - active students
    - quiz attempts
    - average quiz score percent
    - forum threads created
    - open moderation flags
  - subject performance table (subject, grade, board, attempts, avg score, distinct learners)
- Preserve shell behavior and accessibility expectations from Phases 1-2.

## Non-goals
- No notification campaign implementation.
- No system settings mutation tooling.
- No schema migrations unless required by a critical query/performance blocker.
- No destructive community mutations from `/admin/community` (delete/ban/suspend).
- No redesign of student-facing routes.

## Backend API Contracts

### GET `/api/admin/community/threads`
- Query params:
  - `page` (default 1)
  - `pageSize` (default 20, bounded max 100)
  - `solved` (`all|solved|unsolved`, default `all`)
  - `pinned` (`all|pinned|unpinned`, default `all`)
  - `flagState` (`all|openFlags|noOpenFlags`, default `all`)
- Auth:
  - `401` unauthenticated
  - `403` authenticated non-admin
- Success payload:
  - `entries[]`:
    - `threadId`, `title`, `authorName`, `createdAt`
    - `isPinned`, `isSolved`, `replyCount`, `views`
    - `openFlagCount`
  - `total`, `page`, `pageSize`, `hasMore`

### GET `/api/admin/analytics/overview`
- Query params:
  - `windowDays` (`7|30|90`, default `30`)
- Auth:
  - `401` unauthenticated
  - `403` authenticated non-admin
- Success payload:
  - `windowDays`
  - `summary`:
    - `activeStudents`
    - `quizAttempts`
    - `averageQuizScorePercent`
    - `threadsCreated`
    - `openModerationFlags`
  - `subjectPerformance[]`:
    - `subjectId`, `subjectName`, `grade`, `boardName`
    - `attempts`, `averageScorePercent`, `activeStudents`

## Frontend Architecture
- `frontend/lib/admin-api.ts`
  - add Zod schemas + typed helpers for:
    - community thread health fetch
    - analytics overview fetch
- `/admin/community`:
  - server component page prefetches initial thread-health payload
  - renders `AdminCommunityPanel`
- `/admin/analytics`:
  - server component page prefetches initial analytics payload (`windowDays=30`)
  - renders `AdminAnalyticsPanel`
- New client components:
  - community panel + thread health table
  - analytics panel + KPI cards + subject performance table

## UI Behavior

### Community
- Filter controls at top (solved, pinned, moderation state).
- `Apply filters` resets pagination to page 1 and refreshes rows.
- `Load more` appends rows until `hasMore=false`.
- Empty state copy for no matching threads.
- Error toast for failed refresh while preserving last-known rows.

### Analytics
- Window selector (`Last 7`, `Last 30`, `Last 90 days`) triggers refresh.
- Summary cards update atomically with table data.
- Subject table sorted by attempts descending, then subject name.
- Explicit empty state when no analytics records exist for selected window.

## Error and Empty States
- Backend invalid query params return `400` with clear error payload.
- Frontend keeps previous data on transient fetch failures.
- Empty lists render descriptive copy instead of blank tables.

## Testing Strategy (Test-First)
- Backend integration tests:
  - community threads endpoint auth/role/filter/pagination coverage
  - analytics overview endpoint auth/role/window validation/aggregation coverage
- Frontend Playwright tests:
  - community page filtering and pagination behavior
  - analytics window switching and KPI/table rendering behavior
- Regression checks:
  - keep `admin-phase1-shell.spec.ts` green
  - keep `admin-phase2-moderation-users.spec.ts` green
  - keep smoke flow green

## Verification Targets
- `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase3.integration.test.ts`
- `pnpm.cmd --filter frontend typecheck`
- `pnpm.cmd --filter frontend lint`
- `pnpm.cmd --filter frontend test:e2e:smoke`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase1-shell.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase2-moderation-users.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase3-community-analytics.spec.ts`
- `pnpm.cmd --filter backend typecheck`

## Risks and Mitigations
- Risk: Aggregation queries become heavy and slow.
  - Mitigation: constrain windows to `7|30|90`, paginate community list, avoid unnecessary joins.
- Risk: New admin routes break shell/nav expectations.
  - Mitigation: preserve existing route structure and re-run Phase 1 shell regression spec.
- Risk: e2e flakiness from mutable forum/moderation fixture state.
  - Mitigation: assert on deterministic seeded records and stable filter behavior, not total row counts.
