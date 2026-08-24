# AI Tutor Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a signed-in-only `AI Tutor` route with ChatGPT-style full-page chat UI and integrate it into left rail navigation.

**Architecture:** Add a new protected App Router page at `/ai-tutor` that renders a dedicated client chat component using existing `/api/ai/chat` streaming behavior without chapter context. Update shared chrome path typing and left rail links to include the new route.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Playwright

---

### Task 1: Add failing/updated E2E expectations for AI Tutor navigation

**Files:**

- Modify: `frontend/tests/e2e/phase2-auth-dashboard.spec.ts`

**Step 1: Write the failing test**

- Update authenticated left-rail test to assert:
  - `AI Tutor` link is visible in left rail
  - navigating to `/ai-tutor` renders `AI Tutor` heading

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter frontend test:e2e -- tests/e2e/phase2-auth-dashboard.spec.ts --grep "left rail"
```

Expected: FAIL before implementation because `/ai-tutor` route and nav link do not exist.

**Step 3: Commit**

```bash
git add frontend/tests/e2e/phase2-auth-dashboard.spec.ts
git commit -m "test: expect ai tutor in authenticated left rail"
```

### Task 2: Implement AI Tutor route and chat component

**Files:**

- Create: `frontend/components/ai/ai-tutor-chat.tsx`
- Create: `frontend/app/ai-tutor/page.tsx`
- Create: `frontend/app/ai-tutor/loading.tsx`
- Create: `frontend/app/ai-tutor/error.tsx`
- Modify: `frontend/components/dashboard/dashboard-chrome-layout.tsx`

**Step 1: Write minimal implementation**

- Build `AITutorChat` with:
  - local message state
  - streaming response handling from `/api/ai/chat`
  - `New chat` reset action
  - empty/error states
- Add `/ai-tutor` page:
  - redirects guests to `/login`
  - uses `DashboardChromeLayout` with `currentPath="/ai-tutor"`
  - renders chat component in a panel surface
- Add route loading/error files matching existing app conventions.
- Extend dashboard chrome `currentPath` type union to include `/ai-tutor`.

**Step 2: Verify**

Run:

```bash
pnpm --filter frontend typecheck
```

Expected: PASS.

**Step 3: Commit**

```bash
git add frontend/components/ai/ai-tutor-chat.tsx frontend/app/ai-tutor/page.tsx frontend/app/ai-tutor/loading.tsx frontend/app/ai-tutor/error.tsx frontend/components/dashboard/dashboard-chrome-layout.tsx
git commit -m "feat: add ai tutor route with full-page tutor chat"
```

### Task 3: Integrate AI Tutor link into left rail

**Files:**

- Modify: `frontend/components/foundation/left-rail.tsx`

**Step 1: Implement minimal nav update**

- Add primary link:
  - `href: "/ai-tutor"`
  - `label: "AI Tutor"`
  - active matcher via existing `isPathPrefix`

**Step 2: Verify**

Run:

```bash
pnpm --filter frontend typecheck
pnpm --filter frontend lint
```

Expected: PASS.

**Step 3: Commit**

```bash
git add frontend/components/foundation/left-rail.tsx
git commit -m "feat: add ai tutor to left rail navigation"
```

### Task 4: Final verification

**Files:**

- Verify only

**Step 1: Run full verification commands**

Run:

```bash
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm --filter frontend test:e2e -- tests/e2e/phase2-auth-dashboard.spec.ts --grep "left rail"
```

Expected:

- typecheck/lint PASS
- e2e PASS when Playwright backend/webServer environment is available

**Step 2: Report evidence**

- Summarize command outputs and any environment blockers.
