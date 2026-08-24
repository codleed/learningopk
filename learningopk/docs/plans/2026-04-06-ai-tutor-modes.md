# AI Tutor Modes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make AI tutor replies render as polished Markdown with proper math notation and make `Explain` and `Socratic` modes behave differently end to end.

**Architecture:** Extend the frontend-to-backend AI chat contract with an explicit tutor mode, then update backend prompt generation so response style is mode-specific and formatting is always Markdown + LaTeX oriented. Reuse the existing frontend Markdown renderer rather than adding a second rendering pipeline.

**Tech Stack:** Next.js, React, Express, Zod, AI SDK, Mistral prompt generation, Node test runner, TypeScript

---

### Task 1: Add failing tutor prompt tests

**Files:**

- Modify: `learningopk/backend/src/tests/unit/mistral.unit.test.ts`
- Modify: `learningopk/backend/src/lib/mistral.ts`

**Step 1: Write the failing test**

Add tests that assert:

- explain mode includes direct explanation instructions
- socratic mode includes hint-plus-question instructions
- prompt requires Markdown and LaTeX math notation

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test "src/tests/unit/mistral.unit.test.ts"`

Expected: FAIL because the mode contract and formatting rules do not exist yet.

**Step 3: Write minimal implementation**

Update `buildTutorSystemPrompt()` and related types to satisfy the new tests.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test "src/tests/unit/mistral.unit.test.ts"`

Expected: PASS.

### Task 2: Add explicit tutor mode to backend chat contract

**Files:**

- Modify: `learningopk/backend/src/routes/ai-chat.ts`
- Modify: `learningopk/backend/src/lib/mistral.ts`

**Step 1: Write the failing test**

Use the prompt tests from Task 1 as the guardrail and rely on type errors for the missing request contract.

**Step 2: Run typecheck to verify the contract is incomplete**

Run: `pnpm --filter backend typecheck`

Expected: FAIL once the route and prompt signatures are temporarily out of sync.

**Step 3: Write minimal implementation**

- Extend the request schema with `mode`
- pass mode into `buildTutorSystemPrompt()`
- keep validation strict with Zod

**Step 4: Run typecheck to verify it passes**

Run: `pnpm --filter backend typecheck`

Expected: PASS.

### Task 3: Wire frontend mode into chat requests

**Files:**

- Modify: `learningopk/frontend/src/components/ai/ai-tutor-chat.tsx`

**Step 1: Write the failing test**

No frontend automated test exists here, so use type-safe implementation with manual verification and backend prompt tests as the regression harness.

**Step 2: Run frontend typecheck before change**

Run: `pnpm --filter frontend typecheck`

Expected: PASS before editing.

**Step 3: Write minimal implementation**

Send `tutorMode` in the AI request body as `mode`.

**Step 4: Run frontend typecheck to verify it passes**

Run: `pnpm --filter frontend typecheck`

Expected: PASS.

### Task 4: Final verification

**Files:**

- Verify only

**Step 1: Run backend unit tests**

Run: `node --import tsx --test "src/tests/unit/mistral.unit.test.ts"`

Expected: PASS.

**Step 2: Run backend typecheck**

Run: `pnpm --filter backend typecheck`

Expected: PASS.

**Step 3: Run frontend typecheck**

Run: `pnpm --filter frontend typecheck`

Expected: PASS.
