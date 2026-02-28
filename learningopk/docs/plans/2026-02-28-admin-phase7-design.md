# Admin Phase 7 Design

## Context
- Admin Phases 1-6 are live on `main` with shell navigation, moderation, users lifecycle, community, analytics, notifications/settings, and unified audit center.
- Current `/admin` command center is static cards and does not reflect operational health in real time.
- Existing backend tables already contain the required operational signals:
  - `moderation_flags`
  - `user`
  - `admin_audit_logs`
  - `admin_notifications`
- Phase 7 objective is to convert `/admin` into an actionable operational dashboard while preserving all prior admin behavior and routes.

## Approach Options

### Option A (Recommended): Dedicated command-center read API + focused dashboard panel
- Add `GET /api/admin/overview` for all command-center metrics and activity.
- Replace static `/admin` cards with a live panel that consumes this API.
- Pros: clean boundary, lowest regression risk to existing pages, best runtime validation and testability.
- Cons: introduces one additional read endpoint.

### Option B: Compose `/admin` from multiple existing endpoints
- Keep backend unchanged and fetch users/moderation/notifications/audit separately from frontend.
- Pros: no new endpoint.
- Cons: fragmented loading, duplicated query logic, inconsistent windows, weaker contract.

### Option C: Extend analytics overview endpoint for command center
- Add command-center fields into `/api/admin/analytics/overview`.
- Pros: fewer endpoints.
- Cons: mixed concerns and higher risk for analytics regressions.

## Approved Direction
- Use **Option A** with backend-first TDD.
- Add one aggregated read endpoint for command center intelligence.
- Keep schema unchanged and mutation workflows unchanged.

## Goals
- Replace static `/admin` overview with live command center data.
- Ship KPI cards for:
  - open moderation flags
  - suspended users
  - failed admin actions in last 24h
  - notifications sent in selected window
- Add recent admin activity stream from latest cross-scope audit events.
- Add high-priority alert banner when threshold is exceeded:
  - `openModerationFlags >= 10` OR `failedAdminActionsLast24h >= 5`
- Add filter window (`7|30|90`) where relevant and refresh action.
- Add links from KPIs and activity rows to relevant admin pages.

## Non-goals
- No schema migrations unless unavoidable (none expected).
- No new admin mutation workflows.
- No redesign outside admin routes.
- No speculative abstractions not needed for Phase 7.

## Data and Computation Model
- KPI source mapping:
  - `openModerationFlags`: count rows in `moderation_flags` where `status = 'open'`
  - `suspendedUsers`: count rows in `user` where `status = 'suspended'`
  - `failedAdminActionsLast24h`: count rows in `admin_audit_logs` where `status = 'failed'` and `created_at >= now() - interval '24 hours'`
  - `notificationsSentInWindow`: count rows in `admin_notifications` where `created_at >= windowStart`
- Activity stream:
  - pull latest rows from `admin_audit_logs`
  - order by `created_at desc, id desc`
  - include bounded result size for predictable payload
- Alert computation:
  - evaluate threshold rules server-side
  - return boolean and machine-readable reasons array for deterministic UI behavior

## Backend API Contract

### GET `/api/admin/overview`
- Auth and role:
  - `401` unauthenticated
  - `403` authenticated non-admin
- Query:
  - `windowDays`: `7|30|90` (default `30`)
- Validation:
  - strict zod query parsing
  - invalid query -> `400` with details payload matching existing admin error shape
- Success response:

```json
{
  "windowDays": 30,
  "kpis": {
    "openModerationFlags": 0,
    "suspendedUsers": 0,
    "failedAdminActionsLast24h": 0,
    "notificationsSentInWindow": 0
  },
  "alerts": {
    "showHighPriorityBanner": false,
    "reasons": []
  },
  "recentActivity": [
    {
      "id": "uuid",
      "scope": "users",
      "action": "Suspend user",
      "target": "ali.hassan@example.com",
      "status": "success",
      "message": "Suspended user for policy violations.",
      "actor": { "id": "user_admin_001", "name": "Admin User" },
      "occurredAt": "2026-02-28T00:00:00.000Z"
    }
  ]
}
```

## Frontend Architecture
- Keep `/admin` route path unchanged.
- Add server prefetch on `/admin` using `getAdminOverview({ windowDays: 30, cookieHeader })` with safe fallback payload.
- Add command center panel component:
  - window selector (`7|30|90`)
  - refresh action
  - KPI grid with deep links:
    - open flags -> `/admin/moderation`
    - suspended users -> `/admin/users`
    - failed admin actions -> `/admin/audit?status=failed`
    - notifications sent -> `/admin/notifications`
  - high-priority banner when `alerts.showHighPriorityBanner` is true
  - recent activity table/list with row links by scope:
    - `content` -> `/admin/content`
    - `forum` -> `/admin/community`
    - `moderation` -> `/admin/moderation`
    - `users` -> `/admin/users`
    - `notifications` -> `/admin/notifications`
    - `settings` -> `/admin/settings`

## UI Behavior
- Initial render shows prefetched snapshot.
- Changing window triggers refresh and updates KPI + alerts + activity.
- Refresh button re-fetches current window state.
- On fetch failure:
  - show error toast
  - preserve last known data
- Empty activity state displays explicit helper text.

## Error Handling and Guardrails
- Reuse existing admin auth and role guards.
- Reuse existing admin request helper and zod schema parsing in frontend.
- Keep query bounds and window enum strict to avoid expensive unbounded reads.
- Keep activity list limit fixed in backend.

## Testing Strategy (Strict Runtime TDD)

### Backend integration
- Add `admin-phase7.integration.test.ts` coverage for:
  - auth/role enforcement (`401/403`)
  - query validation (`400` on invalid window)
  - KPI correctness for seeded rows
  - failed-actions 24h window behavior
  - notifications selected window behavior
  - recent activity ordering and bounded count
  - alert threshold activation/deactivation behavior

### Frontend e2e
- Add `admin-phase7-command-center.spec.ts` coverage for:
  - `/admin` shows live KPI panel and activity stream
  - window switching (`7/30/90`) updates dashboard state
  - refresh action works
  - high-priority banner appears for seeded threshold data
  - KPI and activity links route to intended admin pages

### Regression safety
- Keep prior admin phase e2e specs passing (Phases 1-6).

## Verification Targets
- `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase7.integration.test.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase7-command-center.spec.ts`
- `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase6.integration.test.ts`
- `pnpm.cmd --filter frontend typecheck`
- `pnpm.cmd --filter frontend lint`
- `pnpm.cmd --filter backend typecheck`
- `pnpm.cmd --filter frontend test:e2e:smoke`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase1-shell.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase2-moderation-users.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase3-community-analytics.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase4-notifications-settings.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase5-users-lifecycle.spec.ts`
- `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase6-audit-center.spec.ts`

## Verification Run Rules
- Before each Playwright command, run exactly:
  - `pnpm.cmd --filter backend db:clear`
- Set env vars in PowerShell when running backend/frontend verification:
  - `$env:DATABASE_URL='postgres://postgres:password@localhost:5433/learningo'`
  - `$env:REDIS_URL='redis://localhost:6379'`
  - `$env:BETTER_AUTH_SECRET='12345678901234567890123456789012'`
  - `$env:BETTER_AUTH_URL='http://localhost:3001'`
  - `$env:FRONTEND_ORIGIN='http://localhost:3000'`

## Risks and Mitigations
- Risk: dashboard query cost grows with audit volume.
  - Mitigation: bounded activity result size, filtered aggregates, existing indexes.
- Risk: `/admin` replacement regresses shell expectations.
  - Mitigation: targeted Phase 7 e2e + full Phase 1-6 regressions.
- Risk: inconsistent deep-link behavior from activity rows.
  - Mitigation: deterministic scope-to-route mapping and e2e link assertions.
