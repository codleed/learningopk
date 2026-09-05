# Admin Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `/admin/moderation` and `/admin/users` placeholders with working Phase 2 admin workflows while preserving Phase 1 behavior.

**Architecture:** Implement backend-first vertical slices with strict TDD: first moderation queue APIs and lifecycle persistence, then users directory APIs, then frontend moderation and users UI using server-prefetch plus client-panel interactions. Preserve existing `/admin/content` and `/admin/forum` code paths and keep remaining placeholder routes untouched.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Express, Drizzle ORM, PostgreSQL, Zod, Playwright, Node test runner (`tsx --test`)

---

### Task 1: Backend Moderation Queue + Resolve Lifecycle (TDD)

**Files:**

- Create: `backend/src/tests/integration/admin-phase2.integration.test.ts`
- Modify: `backend/src/lib/db/schema.ts`
- Create: `backend/drizzle/0004_admin_phase2_moderation.sql` (or generated equivalent from `drizzle-kit`)
- Modify: `backend/drizzle/meta/_journal.json`
- Modify: `backend/drizzle/meta/0004_snapshot.json` (if generated)
- Modify: `backend/seed.ts`
- Modify: `backend/src/routes/admin.ts`

**Step 1: Write the failing moderation endpoint tests**

```ts
test("admin moderation flags listing enforces auth/role and supports status + targetType filters", async () => {
  const unauthenticated = await request(app).get("/api/admin/moderation/flags");
  assert.equal(unauthenticated.status, 401);

  const forbidden = await memberAgent.get("/api/admin/moderation/flags");
  assert.equal(forbidden.status, 403);

  const openThreads = await adminAgent.get("/api/admin/moderation/flags").query({
    status: "open",
    targetType: "thread",
    page: 1,
    pageSize: 10,
  });
  assert.equal(openThreads.status, 200);
  assert.ok(openThreads.body.entries.every((row: { status: string }) => row.status === "open"));
});

test("admin moderation resolve requires note, persists lifecycle fields, and writes moderation audit log", async () => {
  const shortNote = await adminAgent
    .post(`/api/admin/moderation/flags/${flagId}/resolve`)
    .send({ note: "too short" });
  assert.equal(shortNote.status, 400);

  const success = await adminAgent
    .post(`/api/admin/moderation/flags/${flagId}/resolve`)
    .send({ note: "Resolved after verifying context and evidence." });
  assert.equal(success.status, 200);
  assert.equal(success.body.flag.status, "resolved");
  assert.equal(typeof success.body.flag.resolvedAt, "string");

  const conflict = await adminAgent
    .post(`/api/admin/moderation/flags/${flagId}/resolve`)
    .send({ note: "Attempting a second resolve should fail." });
  assert.equal(conflict.status, 409);
});
```

**Step 2: Run test to verify RED**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase2.integration.test.ts --test-name-pattern moderation`

Expected: FAIL with missing route/table/schema behavior (404 or assertion failures).

**Step 3: Write minimal backend implementation for moderation**

```ts
// backend/src/routes/admin.ts (new query + resolve handlers)
adminRouter.get("/moderation/flags", requireSession, async (req, res) => {
  if (!(await requireAdminRole(req as AuthenticatedRequest, res))) return;
  // parse query, apply filters, return paginated payload
});

adminRouter.post("/moderation/flags/:id/resolve", requireSession, async (req, res) => {
  if (!(await requireAdminRole(req as AuthenticatedRequest, res))) return;
  // validate note >= 10, transition open->resolved, persist audit log scope "moderation"
});
```

```ts
// backend/src/lib/db/schema.ts (new enums/table)
export const moderationTargetTypeEnum = pgEnum("moderation_target_type", [
  "thread",
  "reply",
  "chapter",
]);
export const moderationStatusEnum = pgEnum("moderation_status", ["open", "resolved"]);
```

```ts
// backend/seed.ts (deterministic flag fixtures)
await db.insert(moderationFlags).values([
  { targetType: "thread", targetId: thread1.id, targetLabel: thread1.title, reason: "Abusive language", status: "open" },
  { targetType: "reply", targetId: reply1.id, targetLabel: "Reply snippet...", reason: "Spam", status: "open" },
  { targetType: "chapter", targetId: String(ch1.id), targetLabel: ch1.title, reason: "Outdated content", status: "resolved", ... }
]);
```

**Step 4: Run test to verify GREEN**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase2.integration.test.ts --test-name-pattern moderation`

Expected: PASS for moderation listing + resolve tests.

**Step 5: Commit**

```bash
git add backend/src/tests/integration/admin-phase2.integration.test.ts backend/src/lib/db/schema.ts backend/drizzle backend/seed.ts backend/src/routes/admin.ts
git commit -m "feat: add admin moderation queue APIs with resolve lifecycle"
```

### Task 2: Backend Users Directory API (TDD)

**Files:**

- Modify: `backend/src/tests/integration/admin-phase2.integration.test.ts`
- Modify: `backend/src/routes/admin.ts`

**Step 1: Write the failing users list tests**

```ts
test("admin users listing enforces auth/role and supports search + role filters with pagination", async () => {
  const unauthenticated = await request(app).get("/api/admin/users");
  assert.equal(unauthenticated.status, 401);

  const forbidden = await memberAgent.get("/api/admin/users");
  assert.equal(forbidden.status, 403);

  const byEmail = await adminAgent
    .get("/api/admin/users")
    .query({ q: "admin@example.com", page: 1, pageSize: 10 });
  assert.equal(byEmail.status, 200);
  assert.ok(
    byEmail.body.entries.some((row: { email: string }) => row.email === "admin@example.com")
  );

  const studentsOnly = await adminAgent
    .get("/api/admin/users")
    .query({ role: "student", page: 1, pageSize: 10 });
  assert.equal(studentsOnly.status, 200);
  assert.ok(studentsOnly.body.entries.every((row: { role: string }) => row.role === "student"));
});
```

**Step 2: Run test to verify RED**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase2.integration.test.ts --test-name-pattern users`

Expected: FAIL with missing `/api/admin/users` route or incorrect payload.

**Step 3: Write minimal users endpoint implementation**

```ts
adminRouter.get("/users", requireSession, async (req, res) => {
  if (!(await requireAdminRole(req as AuthenticatedRequest, res))) return;
  // parse page/pageSize/q/role
  // where lower(name) like q or lower(email) like q
  // return paginated entries with id/name/email/role/createdAt
});
```

**Step 4: Run test to verify GREEN**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase2.integration.test.ts --test-name-pattern users`

Expected: PASS for users list auth + filtering tests.

**Step 5: Commit**

```bash
git add backend/src/tests/integration/admin-phase2.integration.test.ts backend/src/routes/admin.ts
git commit -m "feat: add admin users directory API with search and role filters"
```

### Task 3: Frontend Moderation Queue UI + E2E (TDD)

**Files:**

- Create: `frontend/tests/e2e/admin-phase2-moderation-users.spec.ts`
- Modify: `frontend/lib/admin-api.ts`
- Modify: `frontend/app/admin/moderation/page.tsx`
- Create: `frontend/components/admin/admin-moderation-panel.tsx`
- Create: `frontend/components/admin/moderation-queue-table.tsx`
- Create: `frontend/components/admin/moderation-resolve-action.tsx`

**Step 1: Write the failing moderation Playwright test**

```ts
test("admin moderation queue filters open/resolved and resolves an open flag", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/moderation");

  await expect(page.getByRole("heading", { name: "Flagging & Moderation" })).toBeVisible();
  await page.getByLabel("Status").selectOption("open");
  await page.getByLabel("Target type").selectOption("thread");

  const firstOpenRow = page.getByTestId("moderation-row").first();
  await expect(firstOpenRow).toContainText("Open");

  await firstOpenRow.getByRole("button", { name: "Resolve" }).click();
  await page
    .getByLabel("Resolution note")
    .fill("This report was reviewed and valid corrective action was taken.");
  await page.getByRole("button", { name: "Resolve flag" }).click();

  await expect(firstOpenRow).toHaveCount(0);
  await page.getByLabel("Status").selectOption("resolved");
  await expect(
    page.getByText("This report was reviewed and valid corrective action was taken.")
  ).toBeVisible();
});
```

**Step 2: Run test to verify RED**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase2-moderation-users.spec.ts --grep moderation`

Expected: FAIL because `/admin/moderation` is still placeholder and lacks queue controls/actions.

**Step 3: Implement minimal moderation frontend**

```tsx
// frontend/app/admin/moderation/page.tsx
const initial = await getAdminModerationFlags({
  page: 1,
  pageSize: 10,
  status: "open",
  cookieHeader,
});
return <AdminModerationPanel initialEntries={initial.entries} initialTotal={initial.total} />;
```

```tsx
// frontend/components/admin/moderation-resolve-action.tsx
if (note.trim().length < 10) {
  pushToast({ tone: "error", title: "Resolution note too short" });
  return;
}
await resolveAdminModerationFlag({ id: flagId, note });
```

**Step 4: Run test to verify GREEN**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase2-moderation-users.spec.ts --grep moderation`

Expected: PASS for moderation queue flow.

**Step 5: Commit**

```bash
git add frontend/tests/e2e/admin-phase2-moderation-users.spec.ts frontend/lib/admin-api.ts frontend/app/admin/moderation/page.tsx frontend/components/admin/admin-moderation-panel.tsx frontend/components/admin/moderation-queue-table.tsx frontend/components/admin/moderation-resolve-action.tsx
git commit -m "feat: implement admin moderation queue with resolve workflow"
```

### Task 4: Frontend Users Directory UI + E2E (TDD)

**Files:**

- Modify: `frontend/tests/e2e/admin-phase2-moderation-users.spec.ts`
- Modify: `frontend/lib/admin-api.ts`
- Modify: `frontend/app/admin/users/page.tsx`
- Create: `frontend/components/admin/admin-users-panel.tsx`
- Create: `frontend/components/admin/admin-users-table.tsx`

**Step 1: Write the failing users Playwright test**

```ts
test("admin users directory supports text search and role filtering", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/users");

  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await page.getByLabel("Search users").fill("admin@example.com");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("cell", { name: "admin@example.com" })).toBeVisible();

  await page.getByLabel("Role").selectOption("student");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("cell", { name: "admin@example.com" })).toHaveCount(0);
});
```

**Step 2: Run test to verify RED**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase2-moderation-users.spec.ts --grep users`

Expected: FAIL because `/admin/users` is still placeholder and lacks directory controls.

**Step 3: Implement minimal users frontend**

```tsx
// frontend/app/admin/users/page.tsx
const initial = await getAdminUsers({ page: 1, pageSize: 10, q: "", role: "", cookieHeader });
return <AdminUsersPanel initialEntries={initial.entries} initialTotal={initial.total} />;
```

```tsx
// frontend/components/admin/admin-users-panel.tsx
const payload = await getAdminUsers({ page: 1, pageSize, q: searchTerm, role });
setEntries(payload.entries);
setTotal(payload.total);
```

**Step 4: Run test to verify GREEN**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase2-moderation-users.spec.ts --grep users`

Expected: PASS for users directory search and role filter flow.

**Step 5: Commit**

```bash
git add frontend/tests/e2e/admin-phase2-moderation-users.spec.ts frontend/lib/admin-api.ts frontend/app/admin/users/page.tsx frontend/components/admin/admin-users-panel.tsx frontend/components/admin/admin-users-table.tsx
git commit -m "feat: implement admin users directory with search and filters"
```

### Task 5: Final Verification and Regression Gate

**Files:**

- Modify: only files needed to address verification failures.

**Step 1: Run frontend typecheck**

Run: `pnpm.cmd --filter frontend typecheck`

Expected: PASS.

**Step 2: Run frontend lint**

Run: `pnpm.cmd --filter frontend lint`

Expected: PASS.

**Step 3: Run frontend smoke e2e**

Run: `pnpm.cmd --filter frontend test:e2e:smoke`

Expected: PASS.

**Step 4: Run Phase 1 admin shell e2e regression**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase1-shell.spec.ts`

Expected: PASS.

**Step 5: Run Phase 2 targeted e2e**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase2-moderation-users.spec.ts`

Expected: PASS.

**Step 6: Run backend typecheck**

Run: `pnpm.cmd --filter backend typecheck`

Expected: PASS.

**Step 7: Commit verification fixes**

```bash
git add -A
git commit -m "chore: finalize admin phase 2 verification fixes"
```
