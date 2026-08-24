# Admin Phase 4 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `/admin/notifications` and `/admin/settings` placeholders with working admin workflows while preserving all previously shipped admin behavior.

**Architecture:** Implement backend-first vertical slices under strict TDD. First add notification and settings persistence + APIs + integration tests. Then implement server-prefetch pages and client panel workflows with targeted Playwright coverage. Keep scope to manual broadcasts and allowlisted setting updates.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Express, Drizzle ORM, PostgreSQL, Zod, Playwright, Node test runner (`tsx --test`)

---

## Execution Guardrails

- Follow RED -> GREEN -> refactor for every task.
- If any command fails unexpectedly, invoke `superpowers:systematic-debugging` before fixing.
- Commit after each task or logical task group.
- Invoke `superpowers:verification-before-completion` before any completion claim.

### Task 1: Backend Notifications API + Persistence (TDD)

**Files:**

- Create: `backend/src/tests/integration/admin-phase4.integration.test.ts`
- Modify: `backend/src/lib/db/schema.ts`
- Create: `backend/drizzle/0005_admin_phase4_notifications_settings.sql` (or generated equivalent)
- Modify: `backend/drizzle/meta/_journal.json`
- Modify: `backend/drizzle/meta/0005_snapshot.json` (if generated)
- Modify: `backend/seed.ts`
- Modify: `backend/src/routes/admin.ts`

**Step 1: Write the failing notifications endpoint tests**

```ts
test("admin notifications listing and creation enforce auth/role with validation", async () => {
  const unauthenticated = await request(app).get("/api/admin/notifications");
  assert.equal(unauthenticated.status, 401);

  const forbidden = await memberAgent.get("/api/admin/notifications");
  assert.equal(forbidden.status, 403);

  const invalidCreate = await adminAgent.post("/api/admin/notifications").send({
    title: "Hi",
    message: "short",
    audience: "all",
  });
  assert.equal(invalidCreate.status, 400);

  const created = await adminAgent.post("/api/admin/notifications").send({
    title: "Maintenance window",
    message: "Platform maintenance starts at 10 PM with expected 15 minute downtime.",
    audience: "students",
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.notification.audience, "students");
});
```

**Step 2: Run test to verify RED**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase4.integration.test.ts --test-name-pattern notifications`

Expected: FAIL with missing route/schema behavior.

**Step 3: Implement minimal backend notifications slice**

```ts
adminRouter.get("/notifications", requireSession, async (req, res) => {
  if (!(await requireAdminRole(req as AuthenticatedRequest, res))) return;
  // parse page/pageSize and return paginated notification rows
});

adminRouter.post("/notifications", requireSession, async (req, res) => {
  if (!(await requireAdminRole(req as AuthenticatedRequest, res))) return;
  // validate title/message/audience, insert row, write audit log, return created payload
});
```

**Step 4: Run test to verify GREEN**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase4.integration.test.ts --test-name-pattern notifications`

Expected: PASS for notifications auth/validation/create/list assertions.

**Step 5: Commit**

```bash
git add backend/src/tests/integration/admin-phase4.integration.test.ts backend/src/lib/db/schema.ts backend/drizzle backend/seed.ts backend/src/routes/admin.ts
git commit -m "feat: add admin notifications API with persistence and audit logs"
```

### Task 2: Backend Settings API + Updates (TDD)

**Files:**

- Modify: `backend/src/tests/integration/admin-phase4.integration.test.ts`
- Modify: `backend/seed.ts`
- Modify: `backend/src/routes/admin.ts`

**Step 1: Write the failing settings endpoint tests**

```ts
test("admin settings listing and update enforce auth/role and key validation", async () => {
  const unauthenticated = await request(app).get("/api/admin/settings");
  assert.equal(unauthenticated.status, 401);

  const forbidden = await memberAgent.get("/api/admin/settings");
  assert.equal(forbidden.status, 403);

  const listing = await adminAgent.get("/api/admin/settings").query({ page: 1, pageSize: 10 });
  assert.equal(listing.status, 200);
  assert.ok(Array.isArray(listing.body.entries));

  const notFound = await adminAgent.post("/api/admin/settings/unknown_key").send({ value: "true" });
  assert.equal(notFound.status, 404);

  const updated = await adminAgent
    .post("/api/admin/settings/forum_auto_lock_hours")
    .send({ value: "48" });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.setting.value, "48");
});
```

**Step 2: Run test to verify RED**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase4.integration.test.ts --test-name-pattern settings`

Expected: FAIL with missing settings route/table behavior.

**Step 3: Implement minimal backend settings slice**

```ts
adminRouter.get("/settings", requireSession, async (req, res) => {
  if (!(await requireAdminRole(req as AuthenticatedRequest, res))) return;
  // parse page/pageSize and return settings rows
});

adminRouter.post("/settings/:key", requireSession, async (req, res) => {
  if (!(await requireAdminRole(req as AuthenticatedRequest, res))) return;
  // validate value, update allowlisted setting key, write audit log
});
```

**Step 4: Run test to verify GREEN**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase4.integration.test.ts --test-name-pattern settings`

Expected: PASS for settings auth/list/update assertions.

**Step 5: Commit**

```bash
git add backend/src/tests/integration/admin-phase4.integration.test.ts backend/seed.ts backend/src/routes/admin.ts
git commit -m "feat: add admin settings API with validated updates and audit logs"
```

### Task 3: Frontend Notifications UI + E2E (TDD)

**Files:**

- Create: `frontend/tests/e2e/admin-phase4-notifications-settings.spec.ts`
- Modify: `frontend/lib/admin-api.ts`
- Modify: `frontend/app/admin/notifications/page.tsx`
- Create: `frontend/components/admin/admin-notifications-panel.tsx`
- Create: `frontend/components/admin/admin-notifications-table.tsx`

**Step 1: Write the failing notifications Playwright test**

```ts
test("admin notifications page creates a broadcast and refreshes history", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/notifications");

  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  await page.getByLabel("Title").fill("Maintenance advisory");
  await page.getByLabel("Audience").selectOption("students");
  await page.getByLabel("Message").fill("The platform will be unavailable from 10 PM to 10:15 PM.");
  await page.getByRole("button", { name: "Send notification" }).click();

  await expect(page.getByTestId("admin-notification-row").first()).toContainText(
    "Maintenance advisory"
  );
});
```

**Step 2: Run test to verify RED**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase4-notifications-settings.spec.ts --grep notifications`

Expected: FAIL because `/admin/notifications` is still placeholder.

**Step 3: Implement minimal notifications frontend slice**

```tsx
// frontend/app/admin/notifications/page.tsx
const initial = await getAdminNotifications({ page: 1, pageSize: 10, cookieHeader });
return <AdminNotificationsPanel initialPayload={initial} />;
```

```tsx
// frontend/components/admin/admin-notifications-panel.tsx
await createAdminNotification({ title, message, audience });
await refreshList();
```

**Step 4: Run test to verify GREEN**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase4-notifications-settings.spec.ts --grep notifications`

Expected: PASS for notifications compose/send/history flow.

**Step 5: Commit**

```bash
git add frontend/tests/e2e/admin-phase4-notifications-settings.spec.ts frontend/lib/admin-api.ts frontend/app/admin/notifications/page.tsx frontend/components/admin/admin-notifications-panel.tsx frontend/components/admin/admin-notifications-table.tsx
git commit -m "feat: implement admin notifications broadcast workflow"
```

### Task 4: Frontend Settings UI + E2E (TDD)

**Files:**

- Modify: `frontend/tests/e2e/admin-phase4-notifications-settings.spec.ts`
- Modify: `frontend/lib/admin-api.ts`
- Modify: `frontend/app/admin/settings/page.tsx`
- Create: `frontend/components/admin/admin-settings-panel.tsx`
- Create: `frontend/components/admin/admin-settings-table.tsx`

**Step 1: Write the failing settings Playwright test**

```ts
test("admin settings page updates an allowlisted setting value", async ({ page }) => {
  await loginAsSeededAdmin(page);
  await page.goto("/admin/settings");

  await expect(page.getByRole("heading", { name: "System Settings" })).toBeVisible();
  const row = page
    .getByTestId("admin-setting-row")
    .filter({ hasText: "forum_auto_lock_hours" })
    .first();
  await row.getByLabel("Setting value").fill("48");
  await row.getByRole("button", { name: "Save" }).click();
  await expect(row).toContainText("48");
});
```

**Step 2: Run test to verify RED**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase4-notifications-settings.spec.ts --grep settings`

Expected: FAIL because `/admin/settings` is still placeholder.

**Step 3: Implement minimal settings frontend slice**

```tsx
// frontend/app/admin/settings/page.tsx
const initial = await getAdminSettings({ page: 1, pageSize: 20, cookieHeader });
return <AdminSettingsPanel initialPayload={initial} />;
```

```tsx
// frontend/components/admin/admin-settings-panel.tsx
await updateAdminSetting({ key, value });
await refreshList();
```

**Step 4: Run test to verify GREEN**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase4-notifications-settings.spec.ts --grep settings`

Expected: PASS for settings update flow.

**Step 5: Commit**

```bash
git add frontend/tests/e2e/admin-phase4-notifications-settings.spec.ts frontend/lib/admin-api.ts frontend/app/admin/settings/page.tsx frontend/components/admin/admin-settings-panel.tsx frontend/components/admin/admin-settings-table.tsx
git commit -m "feat: implement admin settings management workflow"
```

### Task 5: Final Verification and Regression Gate

**Files:**

- Modify only files required to address verification failures.

**Step 1: Run backend Phase 4 integration tests**

Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/admin-phase4.integration.test.ts`

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

**Step 5: Run admin Phase 1 regression**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase1-shell.spec.ts`

Expected: PASS.

**Step 6: Run admin Phase 2 regression**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase2-moderation-users.spec.ts`

Expected: PASS.

**Step 7: Run admin Phase 3 regression**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase3-community-analytics.spec.ts`

Expected: PASS.

**Step 8: Run admin Phase 4 targeted e2e**

Run: `pnpm.cmd --filter frontend exec playwright test tests/e2e/admin-phase4-notifications-settings.spec.ts`

Expected: PASS.

**Step 9: Run backend typecheck**

Run: `pnpm.cmd --filter backend typecheck`

Expected: PASS.

**Step 10: Use completion verification skill**

- Invoke `superpowers:verification-before-completion` before any success claim.

**Step 11: Commit verification fixes**

```bash
git add -A
git commit -m "chore: finalize admin phase 4 verification fixes"
```
