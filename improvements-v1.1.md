# 10. Version 1.1 Improvements (Applied)

The sections below are intentional upgrades to improve delivery speed,
data integrity, and demo reliability. Treat these as overrides where
they conflict with earlier text.

## 10.0 Confirmed Product Decisions

These decisions are now fixed for implementation:

- MVP scope starts with Punjab Board, Grade 9.
- AI tutor policy is Socratic with controlled final reveal after
  guided attempts.
- Delivery should follow an executable implementation checklist with
  dependencies and effort estimates.

## 10.1 MVP Scope Guardrail (Investor Demo First)

- Limit demo seed content to:
  - Punjab Board, Grade 9, Mathematics + Physics
  - 6-8 chapters total with complete summaries, exercises, flashcards,
    and quizzes
- Keep all schema/routes generic for multi-board expansion, but do not
  block delivery on full-board ingestion.
- Success condition for MVP: a new student can register, study one
  chapter end-to-end, take quiz, chat with AI tutor, and view progress.

## 10.2 Data Model Hardening

Add these constraints and support tables:

- Unique slugs:
  - subjects: UNIQUE(board_id, grade, slug)
  - chapters: UNIQUE(subject_id, slug)
  - exercises: UNIQUE(chapter_id, exercise_number)
- Forum vote integrity:
  - create `forum_reply_votes` table: (user_id, reply_id, vote_type,
    created_at), UNIQUE(user_id, reply_id)
  - derive `upvotes` from votes table or update via transaction
- Content provenance:
  - create `content_sources` table:
    (id, board_id, grade, subject_id, file_name, file_hash,
    imported_at, parser_version)
  - attach `source_id` to chapter/exercise records when seeded
- AI usage tracking:
  - create `ai_usage_logs` table:
    (id, user_id, session_id, model, prompt_tokens, completion_tokens,
    created_at)

## 10.3 AI Tutor Policy Upgrade (Socratic + Controlled Reveal)

Replace "never reveal answers directly" with this policy:

- Step 1: Ask guiding question.
- Step 2: If student is stuck, give a structured hint.
- Step 3: If still stuck after 2 attempts, provide concise worked
  solution, then ask a checkpoint question.

This keeps pedagogy strong while preventing student frustration loops.

## 10.4 Security and Abuse Controls

- Rate limit all mutation APIs (`/api/ai/chat`, `/api/forum`,
  `/api/quiz/submit`, auth endpoints), not only AI chat.
- Add simple content moderation pipeline for forum + AI input:
  profanity, harassment, self-harm keywords, and spam throttling.
- Add audit fields for admin actions: published/unpublished chapter,
  pinned/unpinned thread.

## 10.5 Reliability and Testing Requirements

Add quality gates per phase:

- Unit tests: Zod validators, score calculators, streak logic.
- Integration tests: key API routes with authenticated + unauthenticated
  cases.
- E2E smoke tests (Playwright): register -> learn chapter -> quiz ->
  AI chat -> dashboard progress.

Minimum release gate for investor demo:

- No P1 auth or data-loss bugs
- Seed script idempotency verified by running twice
- AI endpoint stable under 20 concurrent demo requests

## 10.6 Drizzle Rule Clarification

Update "no raw SQL strings" rule to:

- Application queries must use Drizzle ORM APIs.
- SQL fragments are allowed only in migrations/index creation and must
  use Drizzle `sql` template helpers (for example, full-text indexes).

## 10.7 Content Seeder Practical Workflow

To improve extraction quality and reduce cleanup:

- Seeder runs in two passes:
  - pass 1: extract + normalize raw text
  - pass 2: parse into structured entities (chapter, exercise, quiz)
- Generate a `seed-report.json` with:
  - inserted counts
  - skipped/duplicate records
  - parse warnings per file/page
- Add `--dry-run` mode to validate parsing before DB writes.

