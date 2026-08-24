# Admin Phase 1 Shell Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dedicated `/admin/*` shell with enterprise navigation and topbar, preserve existing working admin features, and ensure every Phase 1 section route resolves without regressions.

**Architecture:** Add a route-level admin layout (`app/admin/layout.tsx`) that centralizes session lookup, role guard, and shared shell UI. Keep existing `/admin/content` and `/admin/forum` feature panels intact and wrap them with the new shell instead of rewriting business behavior. Add placeholder routes for remaining sections and wire everything through a single navigation config.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Lucide icons, Playwright

---

### Task 1: Add failing admin shell E2E coverage (TDD start)

**Files:**

- Create: `frontend/tests/e2e/admin-phase1-shell.spec.ts`

**Step 1: Write the failing test**

```ts
import { expect, test } from "@playwright/test";

test("admin shell exposes phase-1 section navigation", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Command Center" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
  await expect(page.getByRole("link", { name: "User Management" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Flagging & Moderation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Content Management" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Community Forum" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Analytics & Reporting" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Notifications" })).toBeVisible();
  await expect(page.getByRole("link", { name: "System Settings" })).toBeVisible();
  await expect(page.getByText("Super Admin")).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec playwright test tests/e2e/admin-phase1-shell.spec.ts`

Expected: FAIL because the new admin shell/nav labels and role badge are not implemented yet.

**Step 3: Commit test scaffold**

```bash
git add frontend/tests/e2e/admin-phase1-shell.spec.ts
git commit -m "test: add failing admin phase 1 shell e2e coverage"
```

### Task 2: Implement shared admin shell, nav config, and topbar

**Files:**

- Create: `frontend/app/admin/layout.tsx`
- Create: `frontend/components/admin/admin-shell.tsx`
- Create: `frontend/components/admin/admin-sidebar.tsx`
- Create: `frontend/components/admin/admin-topbar.tsx`
- Create: `frontend/components/admin/admin-nav-config.ts`
- Modify: `frontend/components/admin/admin-guard.tsx`
- Modify: `frontend/app/admin/page.tsx`
- Modify: `frontend/app/admin/content/page.tsx`
- Modify: `frontend/app/admin/forum/page.tsx`

**Step 1: Implement minimal layout + shell wiring**

```tsx
// app/admin/layout.tsx
const session = await getServerSession();
return (
  <AdminGuard session={session}>
    <AdminShell session={session}>{children}</AdminShell>
  </AdminGuard>
);
```

```ts
// admin-nav-config.ts
export const adminNavItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/moderation", label: "Flagging & Moderation", icon: Flag },
  { href: "/admin/content", label: "Content Management", icon: BookOpenCheck },
  { href: "/admin/community", label: "Community Forum", icon: MessagesSquare },
  { href: "/admin/analytics", label: "Analytics & Reporting", icon: BarChart3 },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "System Settings", icon: Settings },
] as const;
```

**Step 2: Update existing admin pages to use new layout contract**

- Remove nested `AppShell` usage from admin pages.
- Keep existing content/forum panel logic untouched.
- Ensure `/admin` heading/title aligns with “Command Center”.

**Step 3: Run test to verify progress**

Run: `pnpm --filter frontend exec playwright test tests/e2e/admin-phase1-shell.spec.ts`

Expected: still FAIL on missing placeholder routes until Task 3, but heading/sidebar/topbar assertions should now pass.

**Step 4: Commit shell foundation**

```bash
git add frontend/app/admin/layout.tsx frontend/components/admin/admin-shell.tsx frontend/components/admin/admin-sidebar.tsx frontend/components/admin/admin-topbar.tsx frontend/components/admin/admin-nav-config.ts frontend/components/admin/admin-guard.tsx frontend/app/admin/page.tsx frontend/app/admin/content/page.tsx frontend/app/admin/forum/page.tsx
git commit -m "feat: add shared admin shell with sidebar and topbar"
```

### Task 3: Add placeholder section pages with explicit feedback actions

**Files:**

- Create: `frontend/components/admin/admin-section-placeholder.tsx`
- Create: `frontend/components/admin/admin-coming-soon-action.tsx`
- Create: `frontend/app/admin/users/page.tsx`
- Create: `frontend/app/admin/moderation/page.tsx`
- Create: `frontend/app/admin/community/page.tsx`
- Create: `frontend/app/admin/analytics/page.tsx`
- Create: `frontend/app/admin/notifications/page.tsx`
- Create: `frontend/app/admin/settings/page.tsx`
- Modify: `frontend/tests/e2e/admin-phase1-shell.spec.ts`

**Step 1: Extend failing test for placeholder route traversal**

```ts
for (const target of [
  "/admin/users",
  "/admin/moderation",
  "/admin/community",
  "/admin/analytics",
  "/admin/notifications",
  "/admin/settings",
]) {
  await page.goto(target);
  await expect(page.getByText("Coming in next sprint")).toBeVisible();
}
```

**Step 2: Implement reusable placeholder page**

```tsx
<AdminSectionPlaceholder
  title="User Management"
  description="Phase 3 will add search, filters, and bulk actions."
  action={<AdminComingSoonAction label="Export Users (Coming Soon)" />}
/>
```

**Step 3: Run test to verify it passes**

Run: `pnpm --filter frontend exec playwright test tests/e2e/admin-phase1-shell.spec.ts`

Expected: PASS.

**Step 4: Commit placeholder routing**

```bash
git add frontend/components/admin/admin-section-placeholder.tsx frontend/components/admin/admin-coming-soon-action.tsx frontend/app/admin/users/page.tsx frontend/app/admin/moderation/page.tsx frontend/app/admin/community/page.tsx frontend/app/admin/analytics/page.tsx frontend/app/admin/notifications/page.tsx frontend/app/admin/settings/page.tsx frontend/tests/e2e/admin-phase1-shell.spec.ts
git commit -m "feat: add admin placeholder routes for phase 1 navigation completeness"
```

### Task 4: Full verification and regression gate

**Files:**

- Modify as needed from prior tasks only.

**Step 1: Run typecheck**

Run: `pnpm --filter frontend typecheck`

Expected: PASS.

**Step 2: Run lint**

Run: `pnpm --filter frontend lint`

Expected: PASS.

**Step 3: Run frontend smoke**

Run: `pnpm --filter frontend test:e2e:smoke`

Expected: PASS for existing student journey regression safety.

**Step 4: Run targeted admin E2E**

Run: `pnpm --filter frontend exec playwright test tests/e2e/admin-phase1-shell.spec.ts`

Expected: PASS.

**Step 5: Commit verification fixes**

```bash
git add -A
git commit -m "chore: finalize admin phase 1 shell verification fixes"
```

### Task 5: Completion notes and handoff

**Files:**

- Modify: `docs/plans/2026-02-26-admin-phase1-shell.md` (if verification commands differ)

**Step 1: Record actual command outcomes**

- Note any environment limitations (for example, backend not running for Playwright).
- Capture pass/fail status for each command in the implementation summary.

**Step 2: Prepare PR summary bullets**

- Shell/layout files added
- Placeholder routes added
- Existing admin content/forum preserved
- Verification results

**Step 3: Optional final commit for plan corrections**

```bash
git add docs/plans/2026-02-26-admin-phase1-shell.md
git commit -m "docs: sync admin phase 1 plan with final verification notes"
```
