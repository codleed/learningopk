# Admin Phase 3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `/admin/community` and `/admin/analytics` placeholders with working Phase 3 admin workflows while preserving Phase 1 and Phase 2 functionality.

**Architecture:** Implement backend-first vertical slices with strict TDD. First add admin community and analytics APIs with integration tests, then implement frontend server-prefetch pages and client panels with targeted Playwright coverage. Keep notifications/settings placeholders unchanged.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Express, Drizzle ORM, PostgreSQL, Zod, Playwright, Node test runner (`tsx --test`)

---

## Execution Guardrails

- Follow RED -> GREEN -> refactor in every task.
- If any command fails unexpectedly, invoke `superpowers:systematic-debugging` before applying fixes.
- Commit after each task.
- Before reporting completion of a task batch, invoke `superpowers:verification-before-completion`.

### Task 1: Backend Community Threads Health API (TDD)

**Files:**

- Create: `backend/src/tests/integration/admin-phase3.integration.test.ts`
- Modify: `backend/src/routes/admin.ts`

**Step 1: Write the failing community endpoint tests**

```ts
test("admin community threads listing enforces auth/role and supports solved+pinned+flag filters", async () => {
  const unauthenticated = await request(app).get("/api/admin/community/threads");
  assert.equal(unauthenticated.status, 401);

  const forbidden = await memberAgent.get("/api/admin/community/threads");
  assert.equal(forbidden.status, 403);

  const filtered = await adminAgent.get("/api/admin/community/threads").query({
    solved: "unsolved",
    pinned: "unpinned",
    flagState: "openFlags",
    page: 1,
    pageSize: 10,
  });

  assert.equal(filtered.status, 200);
  assert.ok(filtered.body.entries.every((row: { isSolved: boolean }) => row.isSolved === false));
  assert.ok(filtered.body.entries.every((row: { isPinned: boolean }) => row.isPinned === false));
  assert.ok(filtered.body.entries.every((row: { openFlagCount: number }) => row.openFlagCount > 0));
});
```

**Step 2: Run test to verify RED**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase3.integration.test.ts --test-name-pattern community`

Expected: FAIL with missing `/api/admin/community/threads` route and/or payload assertions.

**Step 3: Write minimal backend implementation**

```ts
adminRouter.get("/community/threads", requireSession, async (req, res) => {
  if (!(await requireAdminRole(req as AuthenticatedRequest, res))) return;
  // Parse solved/pinned/flagState/page/pageSize query.
  // Query forum threads with reply counts and open moderation flag counts.
  // Return paginated admin-facing thread health rows.
});
```

**Step 4: Run test to verify GREEN**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase3.integration.test.ts --test-name-pattern community`

Expected: PASS for community auth and filtering coverage.

**Step 5: Commit**

```bash
git add backend/src/tests/integration/admin-phase3.integration.test.ts backend/src/routes/admin.ts
git commit -m "feat: add admin community thread health API"
```

### Task 2: Backend Analytics Overview API (TDD)

**Files:**

- Modify: `backend/src/tests/integration/admin-phase3.integration.test.ts`
- Modify: `backend/src/routes/admin.ts`

**Step 1: Write the failing analytics endpoint tests**

```ts
test("admin analytics overview enforces auth/role and returns windowed KPI aggregates", async () => {
  const unauthenticated = await request(app).get("/api/admin/analytics/overview");
  assert.equal(unauthenticated.status, 401);

  const forbidden = await memberAgent.get("/api/admin/analytics/overview");
  assert.equal(forbidden.status, 403);

  const analytics = await adminAgent.get("/api/admin/analytics/overview").query({ windowDays: 30 });
  assert.equal(analytics.status, 200);
  assert.equal(analytics.body.windowDays, 30);
  assert.equal(typeof analytics.body.summary.activeStudents, "number");
  assert.ok(Array.isArray(analytics.body.subjectPerformance));
});
```

**Step 2: Run test to verify RED**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase3.integration.test.ts --test-name-pattern analytics`

Expected: FAIL with missing `/api/admin/analytics/overview` route.

**Step 3: Write minimal backend implementation**

```ts
adminRouter.get("/analytics/overview", requireSession, async (req, res) => {
  if (!(await requireAdminRole(req as AuthenticatedRequest, res))) return;
  // Parse windowDays (7|30|90).
  // Aggregate active students, attempts, average score, threads, open flags.
  // Aggregate subject-level performance rows for the same window.
  // Return stable summary + table payload.
});
```

**Step 4: Run test to verify GREEN**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase3.integration.test.ts --test-name-pattern analytics`

Expected: PASS for analytics auth and payload assertions.

**Step 5: Commit**

```bash
git add backend/src/tests/integration/admin-phase3.integration.test.ts backend/src/routes/admin.ts
git commit -m "feat: add admin analytics overview API"
```

### Task 3: Frontend Community Page + E2E (TDD)

**Files:**

- Create: `frontend/tests/e2e/admin-phase3-community-analytics.spec.ts`
- Modify: `frontend/lib/admin-api.ts`
- Modify: `frontend/app/admin/community/page.tsx`
- Create: `frontend/components/admin/admin-community-panel.tsx`
- Create: `frontend/components/admin/community-thread-health-table.tsx`

**Step 1: Write the failing community Playwright test**

```ts
test("admin community page filters thread health rows and paginates", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/community");

  await expect(page.getByRole("heading", { name: "Community Forum" })).toBeVisible();
  await page.getByLabel("Solved state").selectOption("unsolved");
  await page.getByLabel("Pinned state").selectOption("unpinned");
  await page.getByLabel("Moderation state").selectOption("openFlags");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page.getByTestId("community-thread-row").first()).toContainText("Open flags");
  await page.getByRole("button", { name: "Load more" }).click();
});
```

**Step 2: Run test to verify RED**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase3-community-analytics.spec.ts --grep community`

Expected: FAIL because `/admin/community` is currently a placeholder without filters/table.

**Step 3: Implement minimal community frontend**

```tsx
// frontend/app/admin/community/page.tsx
const initial = await getAdminCommunityThreads({
  page: 1,
  pageSize: 20,
  solved: "all",
  pinned: "all",
  flagState: "all",
  cookieHeader,
});
return <AdminCommunityPanel initialPayload={initial} />;
```

```tsx
// frontend/components/admin/admin-community-panel.tsx
const payload = await getAdminCommunityThreads({ ...filters, page: 1, pageSize: 20 });
setRows(payload.entries);
setTotal(payload.total);
```

**Step 4: Run test to verify GREEN**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase3-community-analytics.spec.ts --grep community`

Expected: PASS for community filtering/pagination behavior.

**Step 5: Commit**

```bash
git add frontend/tests/e2e/admin-phase3-community-analytics.spec.ts frontend/lib/admin-api.ts frontend/app/admin/community/page.tsx frontend/components/admin/admin-community-panel.tsx frontend/components/admin/community-thread-health-table.tsx
git commit -m "feat: implement admin community thread health view"
```

### Task 4: Frontend Analytics Page + E2E (TDD)

**Files:**

- Modify: `frontend/tests/e2e/admin-phase3-community-analytics.spec.ts`
- Modify: `frontend/lib/admin-api.ts`
- Modify: `frontend/app/admin/analytics/page.tsx`
- Create: `frontend/components/admin/admin-analytics-panel.tsx`
- Create: `frontend/components/admin/admin-analytics-subject-table.tsx`

**Step 1: Write the failing analytics Playwright test**

```ts
test("admin analytics page switches windows and renders KPI + subject table data", async ({
  page,
}) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/analytics");

  await expect(page.getByRole("heading", { name: "Analytics & Reporting" })).toBeVisible();
  await expect(page.getByText("Active students")).toBeVisible();
  await page.getByLabel("Time window").selectOption("7");
  await expect(page.getByText("Last 7 days")).toBeVisible();
  await expect(page.getByRole("table", { name: "Subject performance" })).toBeVisible();
});
```

**Step 2: Run test to verify RED**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase3-community-analytics.spec.ts --grep analytics`

Expected: FAIL because `/admin/analytics` is currently a placeholder.

**Step 3: Implement minimal analytics frontend**

```tsx
// frontend/app/admin/analytics/page.tsx
const initial = await getAdminAnalyticsOverview({ windowDays: 30, cookieHeader });
return <AdminAnalyticsPanel initialPayload={initial} />;
```

```tsx
// frontend/components/admin/admin-analytics-panel.tsx
const payload = await getAdminAnalyticsOverview({ windowDays });
setSummary(payload.summary);
setSubjectRows(payload.subjectPerformance);
```

**Step 4: Run test to verify GREEN**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase3-community-analytics.spec.ts --grep analytics`

Expected: PASS for window switching and KPI/table rendering.

**Step 5: Commit**

```bash
git add frontend/tests/e2e/admin-phase3-community-analytics.spec.ts frontend/lib/admin-api.ts frontend/app/admin/analytics/page.tsx frontend/components/admin/admin-analytics-panel.tsx frontend/components/admin/admin-analytics-subject-table.tsx
git commit -m "feat: implement admin analytics dashboard overview"
```

### Task 5: Final Verification and Regression Gate

**Files:**

- Modify: only files required to address verification failures.

**Step 1: Run backend Phase 3 integration tests**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase3.integration.test.ts`

Expected: PASS.

**Step 2: Run frontend typecheck**

Run: `pnpm.cmd --filter frontend typecheck`

Expected: PASS.

**Step 3: Run frontend lint**

Run: `pnpm.cmd --filter frontend lint`

Expected: PASS.

**Step 4: Run frontend smoke e2e**

Run: `pnpm.cmd --filter frontend test:e2e:smoke`

Expected: PASS.

**Step 5: Run admin Phase 1 shell regression**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase1-shell.spec.ts`

Expected: PASS.

**Step 6: Run admin Phase 2 regression**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase2-moderation-users.spec.ts`

Expected: PASS.

**Step 7: Run admin Phase 3 targeted e2e**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase3-community-analytics.spec.ts`

Expected: PASS.

**Step 8: Run backend typecheck**

Run: `pnpm.cmd --filter backend typecheck`

Expected: PASS.

**Step 9: Use completion verification skill**

- Invoke `superpowers:verification-before-completion` before any success claim.

**Step 10: Commit verification fixes**

```bash
git add -A
git commit -m "chore: finalize admin phase 3 verification fixes"
```
