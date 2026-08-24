# Quiz Duel Challenge Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a minimal logged-in quiz duel flow where a chapter quiz result can generate a shareable challenge link and the recipient can take the same quiz and see both scores side-by-side.

**Architecture:** Persist duel challenges in a dedicated backend table keyed by a UUID `challengeId`. Reuse the existing chapter quiz page, existing chapter quiz payload, and existing `/api/quiz/submit` flow by threading an optional `challengeId` through submit and returning duel comparison data when a recipient completes a challenge.

**Tech Stack:** Express, Drizzle ORM, PostgreSQL, Next.js App Router, React, Zod, existing quiz runner/result components.

---

### Task 1: Backend duel API contract

**Files:**

- Create: `backend/src/tests/integration/quiz-duel-challenges.integration.test.ts`
- Modify: `backend/src/routes/quiz.ts`
- Modify: `backend/src/services/quiz.service.ts`
- Modify: `backend/src/repositories/quiz.repository.ts`

**Step 1: Write the failing test**

- Add an integration test that signs up two users, creates a chapter quiz, creates a challenge from the creator result, opens it as the recipient, submits it, and asserts duel data is returned.

**Step 2: Run test to verify it fails**

- Run: `pnpm test src/tests/integration/quiz-duel-challenges.integration.test.ts`
- Expected: FAIL because challenge routes/data do not exist yet.

**Step 3: Write minimal implementation**

- Add challenge create/get endpoints.
- Extend quiz submit input with optional `challengeId`.
- Return duel comparison data only for challenge submissions.

**Step 4: Run test to verify it passes**

- Run: `pnpm test src/tests/integration/quiz-duel-challenges.integration.test.ts`
- Expected: PASS.

### Task 2: Database persistence

**Files:**

- Modify: `backend/src/lib/db/schema.ts`
- Modify: `backend/src/lib/db/clear-database.ts`
- Create: `backend/drizzle/0022_quiz_duel_challenges.sql`
- Modify: `backend/drizzle/meta/_journal.json`

**Step 1: Add schema + migration**

- Add `quiz_duel_challenges` with creator attempt, optional recipient attempt, expiry, and timestamps.

**Step 2: Keep test database cleanup current**

- Add the new table to `CLEAR_TABLES` in dependency-safe order.

### Task 3: Frontend chapter quiz integration

**Files:**

- Modify: `frontend/app/(learn)/[board]/[grade]/[subject]/[chapter]/page.tsx`
- Modify: `frontend/src/components/learn/chapter-study-workspace.tsx`
- Modify: `frontend/src/components/learn/chapter-study-content-with-ai.tsx`
- Modify: `frontend/src/components/learn/quiz-runner.tsx`
- Modify: `frontend/src/components/learn/quiz-result-summary.tsx`

**Step 1: Thread challenge ID through existing quiz page**

- Read `challengeId` from chapter page search params.
- Pass it into the existing quiz runner.

**Step 2: Add minimal duel UX**

- Add a `Challenge a friend` button on chapter quiz results.
- Create/copy a shareable link using the existing chapter path plus `?tab=quiz&challengeId=...`.
- Show a duel banner before starting when the link is valid.
- Show side-by-side challenger/recipient scores on the result page when duel data is present.

### Task 4: Verification

**Files:**

- No new files required.

**Step 1: Backend test**

- Run the targeted duel integration test.

**Step 2: Typecheck**

- Run: `pnpm typecheck` in `backend/`
- Run: `pnpm typecheck` in `frontend/`

**Step 3: Commit**

- Commit from the outer repo with: `TASK-26: add quiz duel challenge flow`
