# Forum Feed Create Toggle and Incremental Loading Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Hide the forum create-thread form behind a signed-in-only `+` trigger and implement incremental feed loading with 30 initial threads and 10-thread scroll-based fetches.

**Architecture:** Add `offset` support to the forum threads API and frontend API client, then move feed rendering to a client component that appends batches on sentinel intersection. Keep initial forum render server-side with 30 threads and route-level error handling unchanged.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Express + Drizzle, Playwright E2E

---

### Task 1: Test the create-thread toggle behavior (RED first)

**Files:**

- Modify: `frontend/tests/e2e/ui-quality.spec.ts`

**Step 1: Write the failing test**

- Update the forum posting flow to:
  - assert thread form fields are hidden on first forum load
  - click create-thread trigger button
  - then fill and submit

**Step 2: Run test to verify it fails**

- Run: `pnpm --filter frontend exec playwright test tests/e2e/ui-quality.spec.ts --grep "critical UI routes render with expected structure"`
- Expected: FAIL because create-thread trigger does not exist yet and form is always visible.

**Step 3: Commit checkpoint**

- `git add frontend/tests/e2e/ui-quality.spec.ts`
- `git commit -m "test: require explicit create action for forum thread form"`

### Task 2: Add backend pagination offset support

**Files:**

- Modify: `backend/src/routes/forum.ts`

**Step 1: Write the failing test**

- Reuse existing verification scripts by running forum route checks after adding frontend test in Task 1; offset usage currently unsupported and should be missing in implementation.

**Step 2: Implement minimal backend changes**

- Add `offset` to thread feed query schema with default `0` and min `0`.
- Apply `.offset(filters.offset)` on thread feed query.

**Step 3: Verify**

- Run: `pnpm --filter backend typecheck`
- Expected: PASS.

**Step 4: Commit checkpoint**

- `git add backend/src/routes/forum.ts`
- `git commit -m "feat: support thread feed offset pagination"`

### Task 3: Add frontend API offset query support

**Files:**

- Modify: `frontend/lib/forum-api.ts`

**Step 1: Write failing usage**

- Client feed component (next task) will rely on `offset`; introducing usage first will fail typecheck until query type includes `offset`.

**Step 2: Implement minimal changes**

- Extend `ForumFeedQuery` with optional `offset`.
- Include `offset` in query string builder.

**Step 3: Verify**

- Run: `pnpm --filter frontend typecheck`
- Expected: PASS after all dependent code is in place.

**Step 4: Commit checkpoint**

- `git add frontend/lib/forum-api.ts`
- `git commit -m "feat: add offset support to forum API client"`

### Task 4: Implement signed-in-only create-thread toggle UI

**Files:**

- Create: `frontend/components/forum/forum-thread-create-toggle.tsx`
- Modify: `frontend/app/forum/page.tsx`

**Step 1: Write minimal implementation**

- Build a client wrapper component with:
  - circular `+` button
  - hidden-by-default `ForumThreadForm`
  - close action when open
- Render wrapper only for authenticated session in forum page.

**Step 2: Verify**

- Run: `pnpm --filter frontend typecheck`
- Expected: PASS.

**Step 3: Commit checkpoint**

- `git add frontend/components/forum/forum-thread-create-toggle.tsx frontend/app/forum/page.tsx`
- `git commit -m "feat: gate forum thread form behind create toggle"`

### Task 5: Implement incremental client feed loader

**Files:**

- Create: `frontend/components/forum/forum-thread-feed.tsx`
- Modify: `frontend/app/forum/page.tsx`
- Modify: `frontend/components/forum/forum-thread-list.tsx` (if prop/type reuse needed)

**Step 1: Write failing integration**

- Use updated E2E flow and type checks; feed component references offset pagination path and loading states.

**Step 2: Implement minimal code**

- Render initial SSR threads (30) from forum page.
- Add sentinel-based `IntersectionObserver` in client feed component.
- Fetch next page with `limit: 10`, `offset: currentThreadCount`.
- Append de-duplicated threads.
- Stop when response batch smaller than 10.

**Step 3: Verify**

- Run:
  - `pnpm --filter frontend typecheck`
  - `pnpm --filter backend typecheck`
  - `pnpm --filter frontend exec playwright test tests/e2e/ui-quality.spec.ts --grep "critical UI routes render with expected structure"` (if backend/frontend services available)

**Step 4: Commit checkpoint**

- `git add frontend/components/forum/forum-thread-feed.tsx frontend/app/forum/page.tsx frontend/components/forum/forum-thread-list.tsx`
- `git commit -m "feat: add incremental forum feed loading"`
