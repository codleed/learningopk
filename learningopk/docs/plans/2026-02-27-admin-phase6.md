# Admin Phase 6 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver Admin Phase 6 unified audit center with cross-scope filtering, plus scoped audit-read route parity for all admin scopes.

**Architecture:** Implement backend-first under strict TDD. First add failing backend integration coverage for aggregated/scoped audit reads, then implement minimal API/query changes to pass. Next add failing Playwright coverage for `/admin/audit`, then implement minimal frontend API helpers, route, panel/table, and nav item. Finish with full regression verification.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Express, Drizzle ORM, PostgreSQL, Zod, Playwright, Node test runner (`tsx --test`)

---

## Execution Guardrails
- Follow RED -> GREEN -> refactor for every task.
- If any command fails unexpectedly, invoke `superpowers:systematic-debugging` before changing code.
- Commit after each task or clear logical task group.
- Use `superpowers:verification-before-completion` before any completion claim.
- For backend/frontend commands requiring runtime config, set PowerShell env vars in the current shell:
  - `$env:DATABASE_URL='postgres://postgres:password@localhost:5433/learningo'`
  - `$env:REDIS_URL='redis://localhost:6379'`
  - `$env:BETTER_AUTH_SECRET='12345678901234567890123456789012'`
  - `$env:BETTER_AUTH_URL='http://localhost:3001'`
  - `$env:FRONTEND_ORIGIN='http://localhost:3000'`
- Before each Playwright command, run exactly:
  - `pnpm.cmd --filter backend db:clear`

### Task 1: Backend Aggregated Audit API Coverage (TDD)

**Files:**
- Create: `backend/src/tests/integration/admin-phase6.integration.test.ts`
- Reference: `backend/src/tests/integration/admin-phase4.integration.test.ts`
- Reference: `backend/src/tests/integration/admin-phase5.integration.test.ts`

**Step 1: Write failing tests for aggregated audit endpoint**

Add tests covering:

```ts
test("admin aggregated audit logs enforce auth/role and support scope+status+search filters", async () => {
  // 401 unauthenticated
  // 403 non-admin
  // 200 admin default list
  // 200 scope filter: users
  // 200 status filter: success
  // 200 search q over message/action/target/actor
});

test("admin aggregated audit logs paginate deterministically", async () => {
  // request page 1 and page 2 with pageSize 1
  // assert stable ordering and hasMore metadata
});
```

Also include seeding helpers in the test file that insert deterministic `admin_audit_logs` rows across scopes/statuses using SQL.

**Step 2: Run test to verify RED**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase6.integration.test.ts --test-name-pattern aggregated`

Expected: FAIL because `/api/admin/audit-logs` does not exist yet.

**Step 3: Commit red test scaffold**

```bash
git add backend/src/tests/integration/admin-phase6.integration.test.ts
git commit -m "test: add failing admin phase 6 aggregated audit API coverage"
```

### Task 2: Backend Aggregated + Scoped Audit Read Routes (TDD GREEN)

**Files:**
- Modify: `backend/src/routes/admin.ts`
- Modify: `backend/src/tests/integration/admin-phase6.integration.test.ts`

**Step 1: Implement minimal aggregated audit route + query layer**

Implement:
- query schema for:
  - `scope`: `all|content|forum|moderation|notifications|settings|users`
  - `status`: `all|success|failed`
  - `q`: optional string
  - `page`, `pageSize`
- shared listing helper that applies filters and returns:
  - `entries`, `total`, `hasMore`
- route:
  - `GET /api/admin/audit-logs`
  - admin-only guard

Update returned entries to include `scope` for aggregated usage while preserving existing fields.

**Step 2: Add missing scope-specific audit routes**

Implement:
- `GET /api/admin/moderation/audit-logs`
- `GET /api/admin/users/audit-logs`
- `GET /api/admin/notifications/audit-logs`
- `GET /api/admin/settings/audit-logs`

Re-use existing scoped audit reader helper to keep payload shape consistent with content/forum endpoints.

**Step 3: Expand tests with scoped route parity assertions**

Add assertions in `admin-phase6.integration.test.ts`:

```ts
test("admin scoped audit log routes are available for moderation/users/notifications/settings", async () => {
  // 200 for each new route with entries/total/page/pageSize/hasMore
});
```

**Step 4: Run tests to verify GREEN**

Run:
1. `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase6.integration.test.ts --test-name-pattern aggregated`
2. `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase6.integration.test.ts --test-name-pattern scoped`

Expected: PASS for new Phase 6 backend assertions.

**Step 5: Refactor lightly**
- Keep a single audit-row serializer for both aggregated and scoped responses.
- Keep filter predicate building isolated in one helper.

**Step 6: Commit**

```bash
git add backend/src/routes/admin.ts backend/src/tests/integration/admin-phase6.integration.test.ts
git commit -m "feat: add aggregated and scoped admin audit log read APIs"
```

### Task 3: Frontend Audit Center E2E Coverage (TDD RED)

**Files:**
- Create: `frontend/tests/e2e/admin-phase6-audit-center.spec.ts`

**Step 1: Write failing Playwright tests for `/admin/audit`**

Add tests:

```ts
test("admin sidebar includes audit trail route and audit page renders", async ({ page }) => {
  // login as seeded admin
  // navigate via sidebar to /admin/audit
  // assert heading and audit table are visible
});

test("admin audit center applies scope/status/search filters and paginates", async ({ page }) => {
  // select scope=users
  // select status=success
  // search for a known audit keyword
  // apply filters and verify rows
  // load more when available
});
```

**Step 2: Run test to verify RED**

Run:
1. `pnpm.cmd --filter backend db:clear`
2. `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase6-audit-center.spec.ts`

Expected: FAIL because `/admin/audit` route and controls do not exist yet.

**Step 3: Commit red e2e coverage**

```bash
git add frontend/tests/e2e/admin-phase6-audit-center.spec.ts
git commit -m "test: add failing admin phase 6 audit center e2e coverage"
```

### Task 4: Frontend Audit Center Implementation (TDD GREEN)

**Files:**
- Modify: `frontend/lib/admin-api.ts`
- Modify: `frontend/components/admin/admin-nav-config.ts`
- Create: `frontend/app/admin/audit/page.tsx`
- Create: `frontend/components/admin/admin-audit-panel.tsx`
- Create: `frontend/components/admin/admin-audit-table.tsx`

**Step 1: Implement API helpers + schemas**

In `frontend/lib/admin-api.ts`:
- extend audit entry schema with `scope`
- add response schema for aggregated endpoint
- add `getAdminAuditLogs({ scope, status, q, page, pageSize, cookieHeader? })`

**Step 2: Implement new admin audit route + UI components**

In route/page:
- server prefetch with `scope=all`, `status=all`, `q=""`, `page=1`, `pageSize=20`
- render `AdminAuditPanel`

In panel/table:
- filters for scope/status/search
- apply/reset-to-page-1 behavior
- load more append behavior
- refresh behavior
- preserve last-known rows on fetch failures
- show message details per row

**Step 3: Add sidebar navigation item**

In `admin-nav-config.ts`:
- add item for `/admin/audit` label `Audit Trail`

**Step 4: Run test to verify GREEN**

Run:
1. `pnpm.cmd --filter backend db:clear`
2. `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase6-audit-center.spec.ts`

Expected: PASS for audit center flows.

**Step 5: Refactor lightly**
- Keep filter-state and fetch-state transitions minimal and deterministic.

**Step 6: Commit**

```bash
git add frontend/lib/admin-api.ts frontend/components/admin/admin-nav-config.ts frontend/app/admin/audit/page.tsx frontend/components/admin/admin-audit-panel.tsx frontend/components/admin/admin-audit-table.tsx
git commit -m "feat: implement admin unified audit center UI"
```

### Task 5: Final Verification and Regression Gate

**Files:**
- Modify only files required to resolve verification failures.

**Step 1: Run Phase 6 backend integration tests**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase6.integration.test.ts`

Expected: PASS.

**Step 2: Run frontend typecheck**

Run: `pnpm.cmd --filter frontend typecheck`

Expected: PASS.

**Step 3: Run frontend lint**

Run: `pnpm.cmd --filter frontend lint`

Expected: PASS.

**Step 4: Run frontend smoke e2e**

Run:
1. `pnpm.cmd --filter backend db:clear`
2. `pnpm.cmd --filter frontend test:e2e:smoke`

Expected: PASS.

**Step 5: Run admin Phase 1 regression**

Run:
1. `pnpm.cmd --filter backend db:clear`
2. `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase1-shell.spec.ts`

Expected: PASS.

**Step 6: Run admin Phase 2 regression**

Run:
1. `pnpm.cmd --filter backend db:clear`
2. `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase2-moderation-users.spec.ts`

Expected: PASS.

**Step 7: Run admin Phase 3 regression**

Run:
1. `pnpm.cmd --filter backend db:clear`
2. `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase3-community-analytics.spec.ts`

Expected: PASS.

**Step 8: Run admin Phase 4 regression**

Run:
1. `pnpm.cmd --filter backend db:clear`
2. `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase4-notifications-settings.spec.ts`

Expected: PASS.

**Step 9: Run admin Phase 5 regression**

Run:
1. `pnpm.cmd --filter backend db:clear`
2. `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase5-users-lifecycle.spec.ts`

Expected: PASS.

**Step 10: Run admin Phase 6 targeted e2e**

Run:
1. `pnpm.cmd --filter backend db:clear`
2. `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase6-audit-center.spec.ts`

Expected: PASS.

**Step 11: Run backend typecheck**

Run: `pnpm.cmd --filter backend typecheck`

Expected: PASS.

**Step 12: Use completion verification skill**
- Invoke `superpowers:verification-before-completion` before any success claim.

**Step 13: Commit verification fixes**

```bash
git add -A
git commit -m "chore: finalize admin phase 6 verification fixes"
```
