# Curriculum Builder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add admin-managed curriculum creation for boards, classes, subjects, and chapters using a flexible `board -> class -> subject -> chapter` schema.

**Architecture:** Introduce a new `board_classes` relational layer and migrate existing subject links from `board + grade` to `board_class`. Implement backend-first with strict TDD for admin curriculum endpoints, then extend admin content UI to create and display the hierarchy without breaking existing chapter publishing flows.

**Tech Stack:** TypeScript, Express, Drizzle ORM, PostgreSQL, Zod, Node test runner (`tsx --test`), Next.js App Router, React

---

## Task 1: Schema Migration RED Test Coverage

**Files:**

- Modify: `backend/src/tests/integration/api-routes.integration.test.ts`
- Reference: `backend/src/lib/db/schema.ts`

**Step 1: Write the failing tests**

- Add integration test(s) for admin curriculum creation and tree retrieval:
  - `POST /api/admin/content/boards`
  - `POST /api/admin/content/classes`
  - `POST /api/admin/content/subjects`
  - `POST /api/admin/content/chapters`
  - `GET /api/admin/content/curriculum`
- Include auth/role rejection and one validation failure.

**Step 2: Run test to verify RED**

- Run: `pnpm.cmd --filter backend exec tsx --test src/tests/integration/api-routes.integration.test.ts`
- Expected: fail because endpoints are missing.

## Task 2: Drizzle Schema + SQL Migration GREEN

**Files:**

- Modify: `backend/src/lib/db/schema.ts`
- Create: `backend/drizzle/0008_curriculum_classes.sql`
- Modify: `backend/drizzle/meta/_journal.json`
- Create: `backend/drizzle/meta/0007_snapshot.json` or next available snapshot as needed

**Step 1: Add failing migration verification test**

- Extend integration test assertions to ensure created records are linked through `board_classes`.

**Step 2: Run test to verify RED**

- Run same integration command and confirm missing columns/tables behavior.

**Step 3: Write minimal schema/migration implementation**

- Add `board_classes`.
- Move `subjects` parent to `board_class_id`.
- Add unique `(subject_id, chapter_number)` for chapters.
- Backfill classes from existing subject rows and map subjects.

**Step 4: Run tests to verify GREEN**

- Re-run integration test command.
- Expected: endpoints still fail (until Task 3), but schema-level failures resolved.

## Task 3: Admin Curriculum API Endpoints GREEN

**Files:**

- Modify: `backend/src/routes/admin.ts`
- Modify: `backend/src/tests/integration/api-routes.integration.test.ts`

**Step 1: Write failing endpoint-behavior tests**

- Assert full happy path create sequence and nested tree response shape.
- Assert content audit log rows for successful create actions.

**Step 2: Run test to verify RED**

- Run targeted backend integration test file.

**Step 3: Implement minimal endpoints**

- Add zod schemas for create payloads.
- Add admin-only handlers for board/class/subject/chapter creation.
- Add curriculum tree read handler.
- Add success/failure audit log persistence in `content` scope.

**Step 4: Run tests to verify GREEN**

- Re-run targeted backend integration test file and ensure pass.

## Task 4: Frontend Admin API Client + UI RED/GREEN

**Files:**

- Modify: `frontend/lib/admin-api.ts`
- Modify: `frontend/components/admin/admin-content-panel.tsx`
- Create: `frontend/components/admin/admin-curriculum-builder.tsx`
- Optional modify: `frontend/app/admin/content/page.tsx` (if server prefetch is needed)

**Step 1: Write failing UI runtime coverage**

- Add/extend e2e or integration-style UI test to assert curriculum builder section and create flow visibility.

**Step 2: Run test to verify RED**

- Run targeted frontend test command for the added test.

**Step 3: Implement minimal UI/client**

- Add client functions for new endpoints.
- Add curriculum tree schema/types.
- Build a simple curriculum builder form set and tree render in admin content.

**Step 4: Run tests to verify GREEN**

- Re-run targeted frontend test.

## Task 5: Verification Gate

**Files:**

- Modify only if verification reveals breakage.

**Step 1: Backend verification**

- Run: `pnpm.cmd --filter backend test:integration`
- Run: `pnpm.cmd --filter backend typecheck`

**Step 2: Frontend verification**

- Run: `pnpm.cmd --filter frontend typecheck`
- Run: `pnpm.cmd --filter frontend lint`

**Step 3: Confirm no regressions in admin content**

- Run targeted admin content e2e spec(s).

**Step 4: Completion check**

- Ensure new behavior is validated by runtime tests and existing admin content publish behavior remains intact.
