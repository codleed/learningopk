# Exam Pattern Analysis Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a minimal topic-weightage analysis flow that surfaces chapter-level board exam importance across subject, chapter, and dedicated pattern pages.

**Architecture:** Add a small `exam_analysis` table for precomputed subject-chapter weightage, refresh it lazily from existing mock exam question data, and expose the results through the learn API and a new pattern route. Render the analysis with lightweight server-rendered UI and simple CSS charts.

**Tech Stack:** Drizzle ORM, Express, Next.js App Router, Zod, Tailwind CSS.

---

### Task 1: Add exam analysis persistence

**Files:**
- Modify: `backend/src/lib/db/schema.ts`
- Create: `backend/drizzle/0020_exam_pattern_analysis.sql`
- Modify: `backend/drizzle/meta/_journal.json`

1. Add the `exam_analysis` table schema.
2. Add the SQL migration.
3. Register the migration in the journal.

### Task 2: Add backend analysis reads

**Files:**
- Create: `backend/src/repositories/exam-pattern.repository.ts`
- Modify: `backend/src/routes/learn.ts`

1. Add lazy-refresh aggregation from existing mock-exam question data.
2. Enrich subject and chapter learn payloads with weightage.
3. Add `/api/learn/patterns/:board/:subject?grade=` endpoint.

### Task 3: Add frontend API support

**Files:**
- Modify: `frontend/src/lib/learn-api.ts`

1. Extend subject/chapter schemas for weightage payloads.
2. Add the dedicated pattern-analysis client fetcher.

### Task 4: Render chapter and subject weightage UI

**Files:**
- Create: `frontend/src/components/learn/chapter-weightage-badge.tsx`
- Create: `frontend/src/components/learn/subject-weightage-list.tsx`
- Modify: `frontend/app/(learn)/[board]/[grade]/[subject]/[chapter]/page.tsx`
- Modify: `frontend/app/(learn)/[board]/[grade]/[subject]/page.tsx`

1. Show chapter badge text matching the acceptance criterion.
2. Sort subject chapters by weightage and render a visual importance bar.
3. Surface the study recommendation.

### Task 5: Add patterns page

**Files:**
- Create: `frontend/src/components/learn/topic-trend-chart.tsx`
- Create: `frontend/app/(learn)/patterns/[board]/[subject]/page.tsx`

1. Render the 5-year trend per chapter with a tiny inline bar chart.
2. Show recommendation text and back-navigation to the subject page.

### Task 6: Verify and commit

**Files:**
- None

1. Run backend typecheck.
2. Run frontend typecheck.
3. Commit from the outer repo with `TASK-50: add exam pattern analysis and topic weightage`.
