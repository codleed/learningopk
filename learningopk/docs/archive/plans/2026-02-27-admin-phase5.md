# Admin Phase 5 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver Admin Phase 5 user lifecycle management with role mutations, students-only suspension/reactivation, and suspension enforcement across protected backend routes.

**Architecture:** Implement backend-first vertical slices under strict TDD. First add failing backend integration coverage for users lifecycle mutations and suspension enforcement, then implement minimal schema/API/session changes to pass. After backend green, add failing Playwright coverage for `/admin/users` lifecycle actions and implement minimal frontend mutations + UI controls. Finish with full regression verification.

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

### Task 1: Backend Role Mutation API (TDD)

**Files:**
- Create: `backend/src/tests/integration/admin-phase5.integration.test.ts`
- Modify: `backend/src/routes/admin.ts`

**Step 1: Write failing tests for role update API**

```ts
test("admin user role mutation enforces auth/role and applies promote/demote guards", async () => {
  const unauthenticated = await request(app).post(`/api/admin/users/${studentId}/role`).send({ role: "admin" });
  assert.equal(unauthenticated.status, 401);

  const forbidden = await memberAgent.post(`/api/admin/users/${studentId}/role`).send({ role: "admin" });
  assert.equal(forbidden.status, 403);

  const invalid = await adminAgent.post(`/api/admin/users/not-a-real-user/role`).send({ role: "invalid" });
  assert.equal(invalid.status, 400);

  const promoted = await adminAgent.post(`/api/admin/users/${studentId}/role`).send({ role: "admin" });
  assert.equal(promoted.status, 200);
  assert.equal(promoted.body.user.role, "admin");

  const noOp = await adminAgent.post(`/api/admin/users/${studentId}/role`).send({ role: "admin" });
  assert.equal(noOp.status, 409);
});
```

**Step 2: Run test to verify RED**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase5.integration.test.ts --test-name-pattern role`

Expected: FAIL because role mutation endpoint does not exist.

**Step 3: Implement minimal role mutation endpoint**

```ts
adminRouter.post("/users/:id/role", requireSession, async (req, res) => {
  // admin auth, param/body validation, self-guard, no-op guard, update role, audit log
});
```

**Step 4: Run test to verify GREEN**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase5.integration.test.ts --test-name-pattern role`

Expected: PASS for role mutation assertions.

**Step 5: Refactor lightly**
- Extract shared user-target loader/helper for mutation endpoints if needed.

**Step 6: Commit**

```bash
git add backend/src/tests/integration/admin-phase5.integration.test.ts backend/src/routes/admin.ts
git commit -m "feat: add admin user role mutation API"
```

### Task 2: Suspension Data Model + API + Users List Status Filter (TDD)

**Files:**
- Modify: `backend/src/tests/integration/admin-phase5.integration.test.ts`
- Modify: `backend/src/lib/db/schema.ts`
- Create: `backend/drizzle/0006_admin_phase5_user_lifecycle.sql` (or generated equivalent)
- Modify: `backend/drizzle/meta/_journal.json`
- Modify: `backend/drizzle/meta/0006_snapshot.json` (if generated)
- Modify: `backend/seed.ts`
- Modify: `backend/src/routes/admin.ts`

**Step 1: Write failing tests for suspension lifecycle + list status filter + audit scope**

```ts
test("admin users listing supports status filter with suspension metadata", async () => {
  const listing = await adminAgent.get("/api/admin/users").query({ status: "suspended", page: 1, pageSize: 20 });
  assert.equal(listing.status, 200);
  assert.ok(listing.body.entries.every((row: { status: string }) => row.status === "suspended"));
});

test("admin suspension mutation is students-only, requires reason, and supports reactivation", async () => {
  const missingReason = await adminAgent.post(`/api/admin/users/${studentId}/suspension`).send({ action: "suspend", reason: "" });
  assert.equal(missingReason.status, 400);

  const suspended = await adminAgent
    .post(`/api/admin/users/${studentId}/suspension`)
    .send({ action: "suspend", reason: "Repeated policy violations in forum posts." });
  assert.equal(suspended.status, 200);
  assert.equal(suspended.body.user.status, "suspended");

  const nonStudentAttempt = await adminAgent
    .post(`/api/admin/users/${adminTargetId}/suspension`)
    .send({ action: "suspend", reason: "Should fail for non-student role." });
  assert.equal(nonStudentAttempt.status, 409);

  const reactivated = await adminAgent.post(`/api/admin/users/${studentId}/suspension`).send({ action: "reactivate" });
  assert.equal(reactivated.status, 200);
  assert.equal(reactivated.body.user.status, "active");
});
```

**Step 2: Run test to verify RED**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase5.integration.test.ts --test-name-pattern suspension`

Expected: FAIL because schema fields/endpoints/filter are missing.

**Step 3: Implement minimal schema + API + filtering**
- Add `user_status` enum and user suspension columns.
- Add migration + seed updates for deterministic suspended fixture.
- Extend `/api/admin/users` query parser and response mapping.
- Add `/api/admin/users/:id/suspension` endpoint with transition guards.
- Extend audit scope to include `users` and persist user lifecycle audit rows.

**Step 4: Run test to verify GREEN**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase5.integration.test.ts --test-name-pattern suspension`

Expected: PASS for suspension/filter assertions.

**Step 5: Refactor lightly**
- Consolidate mutation response shaping and audit helper usage.

**Step 6: Commit**

```bash
git add backend/src/tests/integration/admin-phase5.integration.test.ts backend/src/lib/db/schema.ts backend/drizzle backend/seed.ts backend/src/routes/admin.ts
git commit -m "feat: add student suspension lifecycle for admin users"
```

### Task 3: Suspension Enforcement in Session Middleware (TDD)

**Files:**
- Modify: `backend/src/tests/integration/admin-phase5.integration.test.ts`
- Modify: `backend/src/lib/session.ts`
- Modify: `backend/src/lib/db/schema.ts` (if typing updates needed)

**Step 1: Write failing test for suspended-user protected-route denial**

```ts
test("suspended users are blocked from protected routes", async () => {
  await adminAgent
    .post(`/api/admin/users/${studentId}/suspension`)
    .send({ action: "suspend", reason: "Temporary suspension for policy review." });

  const blocked = await studentAgent.post("/api/progress/events").send({ eventType: "lesson_open", metadata: {} });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, "ACCOUNT_SUSPENDED");
});
```

**Step 2: Run test to verify RED**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase5.integration.test.ts --test-name-pattern suspended`

Expected: FAIL because `requireSession` does not yet enforce user status.

**Step 3: Implement minimal middleware enforcement**

```ts
export const requireSession: RequestHandler = async (req, res, next) => {
  // existing session validation
  // lookup user status
  // if suspended -> 403 { error: "Account suspended", code: "ACCOUNT_SUSPENDED" }
};
```

**Step 4: Run test to verify GREEN**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase5.integration.test.ts --test-name-pattern suspended`

Expected: PASS for suspended-user denial assertions.

**Step 5: Refactor lightly**
- Keep session/db lookup logic minimal and deterministic.

**Step 6: Commit**

```bash
git add backend/src/tests/integration/admin-phase5.integration.test.ts backend/src/lib/session.ts backend/src/lib/db/schema.ts
git commit -m "feat: enforce suspended account access blocks"
```

### Task 4: Frontend Role Mutation UX + E2E (TDD)

**Files:**
- Create: `frontend/tests/e2e/admin-phase5-users-lifecycle.spec.ts`
- Modify: `frontend/lib/admin-api.ts`
- Modify: `frontend/components/admin/admin-users-panel.tsx`
- Modify: `frontend/components/admin/admin-users-table.tsx`
- Modify: `frontend/app/admin/users/page.tsx`

**Step 1: Write failing Playwright test for role mutation flow**

```ts
test("admin users page promotes and demotes a target user", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/users");

  const row = page.getByTestId("admin-user-row").filter({ hasText: "student@example.com" }).first();
  await row.getByRole("button", { name: "Promote to admin" }).click();
  await expect(row).toContainText("admin");

  await row.getByRole("button", { name: "Demote to student" }).click();
  await expect(row).toContainText("student");
});
```

**Step 2: Run test to verify RED**

Run:
1. `pnpm.cmd --filter backend db:clear`
2. `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase5-users-lifecycle.spec.ts --grep role`

Expected: FAIL because role mutation controls/helpers do not exist.

**Step 3: Implement minimal frontend role mutation slice**
- Add role mutation helper in `admin-api.ts`.
- Add role action button and pending state in users table/panel.
- Refresh list after success and show success/error toast.

**Step 4: Run test to verify GREEN**

Run:
1. `pnpm.cmd --filter backend db:clear`
2. `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase5-users-lifecycle.spec.ts --grep role`

Expected: PASS for role mutation flow.

**Step 5: Commit**

```bash
git add frontend/tests/e2e/admin-phase5-users-lifecycle.spec.ts frontend/lib/admin-api.ts frontend/components/admin/admin-users-panel.tsx frontend/components/admin/admin-users-table.tsx frontend/app/admin/users/page.tsx
git commit -m "feat: implement admin user role lifecycle controls"
```

### Task 5: Frontend Suspension UX + E2E (TDD)

**Files:**
- Modify: `frontend/tests/e2e/admin-phase5-users-lifecycle.spec.ts`
- Modify: `frontend/lib/admin-api.ts`
- Modify: `frontend/components/admin/admin-users-panel.tsx`
- Modify: `frontend/components/admin/admin-users-table.tsx`

**Step 1: Write failing Playwright suspension test**

```ts
test("admin users page suspends and reactivates a student with required reason", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/users");

  const row = page.getByTestId("admin-user-row").filter({ hasText: "student@example.com" }).first();
  await row.getByRole("button", { name: "Suspend" }).click();
  await page.getByLabel("Suspension reason").fill("Repeated policy violations requiring temporary suspension.");
  await page.getByRole("button", { name: "Confirm suspension" }).click();
  await expect(row).toContainText("suspended");

  await row.getByRole("button", { name: "Reactivate" }).click();
  await expect(row).toContainText("active");
});
```

**Step 2: Run test to verify RED**

Run:
1. `pnpm.cmd --filter backend db:clear`
2. `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase5-users-lifecycle.spec.ts --grep suspend`

Expected: FAIL because suspension controls and reason flow do not exist.

**Step 3: Implement minimal suspension frontend slice**
- Add suspension mutation helper in `admin-api.ts`.
- Add suspend/reactivate actions and reason input flow.
- Add status metadata rendering.

**Step 4: Run test to verify GREEN**

Run:
1. `pnpm.cmd --filter backend db:clear`
2. `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase5-users-lifecycle.spec.ts --grep suspend`

Expected: PASS for suspension/reactivation flow.

**Step 5: Commit**

```bash
git add frontend/tests/e2e/admin-phase5-users-lifecycle.spec.ts frontend/lib/admin-api.ts frontend/components/admin/admin-users-panel.tsx frontend/components/admin/admin-users-table.tsx
git commit -m "feat: implement admin user suspension lifecycle controls"
```

### Task 6: Final Verification and Regression Gate

**Files:**
- Modify only files required to address verification failures.

**Step 1: Run Phase 5 backend integration tests**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase5.integration.test.ts`

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

**Step 9: Run admin Phase 5 targeted e2e**

Run:
1. `pnpm.cmd --filter backend db:clear`
2. `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase5-users-lifecycle.spec.ts`

Expected: PASS.

**Step 10: Run backend typecheck**

Run: `pnpm.cmd --filter backend typecheck`

Expected: PASS.

**Step 11: Use completion verification skill**
- Invoke `superpowers:verification-before-completion` before any success claim.

**Step 12: Commit verification fixes**

```bash
git add -A
git commit -m "chore: finalize admin phase 5 verification fixes"
```
