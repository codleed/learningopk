# Admin Phase 7 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade `/admin` from a static overview to a live operational command center with KPI intelligence, alerts, and recent admin activity.

**Architecture:** Implement backend-first under strict TDD by adding a dedicated `GET /api/admin/overview` endpoint with admin auth/role guards, strict query validation, and deterministic aggregation from existing tables. Then replace `/admin` frontend content with a command-center panel that supports 7/30/90-day window filtering, refresh, high-priority alert banner, and deep links. Preserve all existing admin routes and Phase 1-6 behavior.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Express, Drizzle ORM, PostgreSQL, Zod, Playwright, Node test runner (`tsx --test`)

---

## Execution Guardrails
- Follow strict runtime TDD for every behavior change: RED -> GREEN -> refactor.
- Do not write compile-time-only tests.
- If any unexpected command failure occurs, invoke `superpowers:systematic-debugging` before code changes.
- Commit after each task or clear logical task group.
- Use `superpowers:verification-before-completion` before any completion claim.
- Use this exact PowerShell env setup for backend/frontend runtime commands:

```powershell
$env:DATABASE_URL='postgres://postgres:password@localhost:5433/learningo'
$env:REDIS_URL='redis://localhost:6379'
$env:BETTER_AUTH_SECRET='12345678901234567890123456789012'
$env:BETTER_AUTH_URL='http://localhost:3001'
$env:FRONTEND_ORIGIN='http://localhost:3000'
```

- Before each Playwright command, run exactly:

```powershell
pnpm.cmd --filter backend db:clear
```

### Task 1: Backend Command Center Integration Coverage (TDD RED)

**Files:**
- Create: `backend/src/tests/integration/admin-phase7.integration.test.ts`
- Reference: `backend/src/tests/integration/admin-phase6.integration.test.ts`
- Reference: `backend/src/tests/integration/admin-phase5.integration.test.ts`

**Step 1: Write failing runtime tests for `/api/admin/overview`**

Add tests covering:

```ts
test("admin overview enforces auth/role and validates query", async () => {
  // 401 unauthenticated
  // 403 non-admin
  // 400 invalid windowDays
});

test("admin overview returns command center KPIs, alerts, and recent activity", async () => {
  // seed open/resolved moderation flags
  // seed suspended + active users
  // seed failed/success audit rows in and out of 24h window
  // seed notifications across dates
  // assert kpis values and alert rules:
  // openModerationFlags >= 10 OR failedAdminActionsLast24h >= 5 => showHighPriorityBanner true
  // assert recentActivity ordered by occurredAt desc then id desc
});

test("admin overview applies 7/30/90 window to notifications KPI", async () => {
  // compare windowDays=7 vs 30 on seeded notifications
});
```

Use deterministic SQL seed helpers in test file for:
- `moderation_flags`
- `user`
- `admin_audit_logs`
- `admin_notifications`

**Step 2: Run test to verify RED**

Run:

```powershell
pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase7.integration.test.ts
```

Expected: FAIL because `/api/admin/overview` does not exist yet.

**Step 3: Commit failing tests**

```bash
git add backend/src/tests/integration/admin-phase7.integration.test.ts
git commit -m "test: add failing admin phase 7 overview API coverage"
```

### Task 2: Backend Overview API Implementation (TDD GREEN)

**Files:**
- Modify: `backend/src/routes/admin.ts`
- Modify: `backend/src/tests/integration/admin-phase7.integration.test.ts` (only if assertions need tightening)

**Step 1: Add strict query schema and response builder**

Implement `windowDays` query parsing:
- enum/refine to `7|30|90`
- default `30`
- invalid query returns `400` with existing details shape

Implement list/aggregate helper:
- `openModerationFlags` count (`moderation_flags.status = 'open'`)
- `suspendedUsers` count (`user.status = 'suspended'`)
- `failedAdminActionsLast24h` count (`admin_audit_logs.status = 'failed'` and `created_at >= now - 24h`)
- `notificationsSentInWindow` count (`admin_notifications.created_at >= windowStart`)
- `recentActivity` as latest audit events ordered `created_at desc, id desc`, bounded limit
- `alerts.showHighPriorityBanner` and `alerts.reasons`:
  - threshold reason for open flags >= 10
  - threshold reason for failed actions >= 5

**Step 2: Add route**

Add:
- `GET /api/admin/overview`
- `requireSession`
- `requireAdminRole`
- parsed query and JSON response contract

**Step 3: Run tests to verify GREEN**

Run:

```powershell
pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase7.integration.test.ts
```

Expected: PASS.

**Step 4: Refactor lightly**
- Keep metric calculations in a single helper with minimal duplication.
- Keep audit serialization aligned with existing admin audit payload shape.

**Step 5: Commit backend implementation**

```bash
git add backend/src/routes/admin.ts backend/src/tests/integration/admin-phase7.integration.test.ts
git commit -m "feat: add admin command center overview API"
```

### Task 3: Frontend Command Center E2E Coverage (TDD RED)

**Files:**
- Create: `frontend/tests/e2e/admin-phase7-command-center.spec.ts`

**Step 1: Write failing Playwright tests for live `/admin`**

Add tests:

```ts
test("admin command center renders live KPIs and recent activity", async ({ page }) => {
  // login seeded admin
  // open /admin
  // assert KPI cards and recent activity section visible
});

test("admin command center supports window filter and refresh", async ({ page }) => {
  // change window to 7/30/90
  // trigger refresh
  // assert UI remains interactive and data section updates
});

test("admin command center shows high-priority banner and deep links", async ({ page }) => {
  // assert alert banner when seeded threshold exceeded
  // click KPI links and activity row links
  // assert routes navigate to expected admin pages
});
```

**Step 2: Run test to verify RED**

Run exactly:

```powershell
pnpm.cmd --filter backend db:clear
pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase7-command-center.spec.ts
```

Expected: FAIL because Phase 7 command center UI is not implemented.

**Step 3: Commit failing e2e tests**

```bash
git add frontend/tests/e2e/admin-phase7-command-center.spec.ts
git commit -m "test: add failing admin phase 7 command center e2e coverage"
```

### Task 4: Frontend Command Center Implementation (TDD GREEN)

**Files:**
- Modify: `frontend/lib/admin-api.ts`
- Modify: `frontend/app/admin/page.tsx`
- Create: `frontend/components/admin/admin-command-center-panel.tsx`
- Optional create (if split is cleaner):
  - `frontend/components/admin/admin-command-center-kpis.tsx`
  - `frontend/components/admin/admin-command-center-activity.tsx`

**Step 1: Add admin overview API client contract**

In `frontend/lib/admin-api.ts`:
- add zod schema/types for `AdminOverviewResponse`
- add `getAdminOverview({ windowDays, cookieHeader? })`
- use existing `fetchAdminJson` path `/api/admin/overview`

**Step 2: Replace static `/admin` content with live panel**

In `frontend/app/admin/page.tsx`:
- server-side prefetch `windowDays: 30`
- fallback payload on fetch error (empty-safe values)
- render command center panel component

In new panel component(s):
- window selector: 7/30/90
- refresh action
- KPI cards with links:
  - moderation flags -> `/admin/moderation`
  - suspended users -> `/admin/users`
  - failed actions -> `/admin/audit?status=failed`
  - notifications -> `/admin/notifications`
- high-priority alert banner from `alerts.showHighPriorityBanner`
- recent activity stream/table with scope-based links
- preserve previous data and show toast on refresh failure

**Step 3: Run tests to verify GREEN**

Run exactly:

```powershell
pnpm.cmd --filter backend db:clear
pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase7-command-center.spec.ts
```

Expected: PASS.

**Step 4: Refactor lightly**
- Keep scope-to-link mapping deterministic and local.
- Keep window/refresh state transitions simple and predictable.

**Step 5: Commit frontend implementation**

```bash
git add frontend/lib/admin-api.ts frontend/app/admin/page.tsx frontend/components/admin/admin-command-center-panel.tsx frontend/components/admin/admin-command-center-kpis.tsx frontend/components/admin/admin-command-center-activity.tsx
git commit -m "feat: implement admin command center intelligence dashboard"
```

If split files were not created, adjust `git add` paths accordingly.

### Task 5: Full Verification and Regression Gate

**Files:**
- Modify only if required for verification fixes.

**Step 1: Set required env vars in shell**

Run exactly:

```powershell
$env:DATABASE_URL='postgres://postgres:password@localhost:5433/learningo'
$env:REDIS_URL='redis://localhost:6379'
$env:BETTER_AUTH_SECRET='12345678901234567890123456789012'
$env:BETTER_AUTH_URL='http://localhost:3001'
$env:FRONTEND_ORIGIN='http://localhost:3000'
```

**Step 2: Phase 7 backend integration**

Run exactly:

```powershell
pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase7.integration.test.ts
```

**Step 3: Phase 7 frontend e2e**

Run exactly:

```powershell
pnpm.cmd --filter backend db:clear
pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase7-command-center.spec.ts
```

**Step 4: Admin Phase 6 backend regression**

Run exactly:

```powershell
pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase6.integration.test.ts
```

**Step 5: Frontend static checks**

Run exactly:

```powershell
pnpm.cmd --filter frontend typecheck
pnpm.cmd --filter frontend lint
```

**Step 6: Frontend smoke e2e**

Run exactly:

```powershell
pnpm.cmd --filter backend db:clear
pnpm.cmd --filter frontend test:e2e:smoke
```

**Step 7: Admin Phase 1 regression**

Run exactly:

```powershell
pnpm.cmd --filter backend db:clear
pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase1-shell.spec.ts
```

**Step 8: Admin Phase 2 regression**

Run exactly:

```powershell
pnpm.cmd --filter backend db:clear
pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase2-moderation-users.spec.ts
```

**Step 9: Admin Phase 3 regression**

Run exactly:

```powershell
pnpm.cmd --filter backend db:clear
pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase3-community-analytics.spec.ts
```

**Step 10: Admin Phase 4 regression**

Run exactly:

```powershell
pnpm.cmd --filter backend db:clear
pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase4-notifications-settings.spec.ts
```

**Step 11: Admin Phase 5 regression**

Run exactly:

```powershell
pnpm.cmd --filter backend db:clear
pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase5-users-lifecycle.spec.ts
```

**Step 12: Admin Phase 6 regression**

Run exactly:

```powershell
pnpm.cmd --filter backend db:clear
pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase6-audit-center.spec.ts
```

**Step 13: Backend typecheck**

Run exactly:

```powershell
pnpm.cmd --filter backend typecheck
```

**Step 14: Completion verification skill**
- Invoke `superpowers:verification-before-completion` and re-check that all required verification commands were executed successfully.

**Step 15: Commit any verification-only fixes**

```bash
git add -A
git commit -m "chore: finalize admin phase 7 verification fixes"
```

### Task 6: Branch Finalization

**Step 1: Use branch finishing skill**
- Invoke `superpowers:finishing-a-development-branch`.
- Follow its checklist to summarize commits, verification status, and integration options.

**Step 2: Present final integration recommendation**
- Recommend PR or merge path with exact branch/worktree context.
