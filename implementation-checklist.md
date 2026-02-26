# 11. Executable Implementation Checklist

Use this checklist as the execution source of truth. Complete items in
order unless marked parallel-safe.

Effort scale:

- S: 0.5-1 day
- M: 1-2 days
- L: 3-4 days

## 11.1 Foundation and Environment

- [ ] `FND-01` Initialize Next.js App Router project with TypeScript,
  Tailwind, and shadcn baseline.  
  Depends on: none  
  Effort: S  
  Done when: app runs at `/`, strict TypeScript enabled, CI install
  succeeds.

- [ ] `FND-02` Add Docker Compose for PostgreSQL 16 + Redis 7 and verify
  connectivity from app.  
  Depends on: `FND-01`  
  Effort: S  
  Done when: `pnpm docker:up` works and DB/Redis health checks pass.

- [ ] `FND-03` Configure Drizzle (`schema.ts`, `index.ts`,
  `drizzle.config.ts`) and initial migrations.  
  Depends on: `FND-02`  
  Effort: M  
  Done when: migrations apply cleanly on empty DB and rerun without
  drift.

- [ ] `FND-04` Implement Better Auth + middleware protection for
  dashboard and mutation routes.  
  Depends on: `FND-03`  
  Effort: M  
  Done when: register/login/logout/session validation flows pass.

## 11.2 Core Data Model (Hardened)

- [ ] `DB-01` Implement core tables (boards, subjects, chapters,
  exercises, flashcards, quizzes, quiz_questions, quiz_attempts,
  AI/forum/progress tables).  
  Depends on: `FND-03`  
  Effort: M  
  Done when: tables and FKs match guide and migrate successfully.

- [ ] `DB-02` Add hardening constraints and indexes from v1.1:
  unique slugs, exercise uniqueness, forum search GIN index.  
  Depends on: `DB-01`  
  Effort: S  
  Done when: duplicates fail at DB level and search index exists.

- [ ] `DB-03` Add `forum_reply_votes`, `content_sources`,
  `ai_usage_logs` with required constraints.  
  Depends on: `DB-01`  
  Effort: S  
  Done when: vote uniqueness enforced and AI usage rows log per chat.

## 11.3 Seeder Pipeline (MVP Scope First)

- [ ] `SDR-01` Build two-pass `scripts/seed-content.ts` with CLI flags:
  `--board --grade --subject --dry-run`.  
  Depends on: `DB-01`  
  Effort: L  
  Done when: dry run prints parse summary without writing.

- [ ] `SDR-02` Add idempotency checks + file hash tracking in
  `content_sources`.  
  Depends on: `SDR-01`, `DB-03`  
  Effort: M  
  Done when: second run produces only skip/update outcomes.

- [ ] `SDR-03` Generate `seed-report.json` (inserted, skipped, warnings)
  per run.  
  Depends on: `SDR-01`  
  Effort: S  
  Done when: report writes consistently and includes warning counts.

- [ ] `SDR-04` Seed only Punjab Grade 9 Mathematics + Physics (6-8
  chapters total) for MVP dataset.  
  Depends on: `SDR-02`  
  Effort: M  
  Done when: both subjects render end-to-end in UI.

## 11.4 Learning Experience UI

- [ ] `UX-01` Build subject and chapter routes:
  `/[board]/[grade]/[subject]` and chapter tabs route.  
  Depends on: `DB-01`, `SDR-04`  
  Effort: M  
  Done when: chapter list and chapter detail load from DB.

- [ ] `UX-02` Implement Summary tab (Markdown + KaTeX) and Exercises
  tab (accordion + step solutions).  
  Depends on: `UX-01`  
  Effort: M  
  Done when: formulas render and exercise expansion works.

- [ ] `UX-03` Implement Flashcard deck with progress and local known/review
  state.  
  Depends on: `UX-01`  
  Effort: S  
  Done when: all cards navigable and completion state visible.

## 11.5 AI Tutor (Socratic with Controlled Reveal)

- [ ] `AI-01` Implement `backend/src/lib/mistral.ts` with server-side prompt policy:
  guide -> hint -> final concise reveal after 2 failed attempts.  
  Depends on: `FND-04`  
  Effort: S  
  Done when: prompt logic includes attempt-aware behavior rules.

- [ ] `AI-02` Build `/api/ai/chat` streaming route with auth, Zod
  validation, context injection, persistence, and token logging.  
  Depends on: `AI-01`, `DB-03`  
  Effort: M  
  Done when: chat streams, stores messages, and logs usage tokens.

- [ ] `AI-03` Add rate limiting + abuse checks on AI endpoint.  
  Depends on: `AI-02`, `FND-02`  
  Effort: S  
  Done when: over-limit and flagged-content requests are blocked.

- [ ] `AI-04` Build chapter-integrated `AIChatPanel` with "Start fresh
  session".  
  Depends on: `AI-02`, `UX-02`  
  Effort: M  
  Done when: user can launch chat from exercises and reset session.

## 11.6 Assessment (Quizzes + Mock Exams)

- [ ] `QZ-01` Implement QuizRunner (timer, MCQ flow, submit, results).  
  Depends on: `UX-01`, `DB-01`  
  Effort: M  
  Done when: quiz attempts persist and explanations display correctly.

- [ ] `QZ-02` Build `/api/quiz/submit` with scoring, attempt save, and
  `user_progress` upsert.  
  Depends on: `QZ-01`  
  Effort: S  
  Done when: best score logic is correct across retakes.

- [ ] `QZ-03` Implement mock exam mode (deferred feedback until submit).  
  Depends on: `QZ-01`  
  Effort: S  
  Done when: no per-question reveal before final submission.

## 11.7 Forum and Community

- [ ] `FRM-01` Build forum feed + thread detail + one-level nested
  replies.  
  Depends on: `FND-04`, `DB-01`  
  Effort: M  
  Done when: user can create threads, reply, and view counts update.

- [ ] `FRM-02` Implement voting using `forum_reply_votes` and accepted
  answer flow.  
  Depends on: `FRM-01`, `DB-03`  
  Effort: S  
  Done when: one vote per user/reply is enforced.

- [ ] `FRM-03` Add forum search/filter with PostgreSQL full-text index.  
  Depends on: `FRM-01`, `DB-02`  
  Effort: S  
  Done when: keyword search returns relevant ranked threads.

- [ ] `FRM-04` Add moderation checks and mutation rate limits.  
  Depends on: `FRM-01`  
  Effort: S  
  Done when: abusive/spam content is rejected with clear errors.

## 11.8 Progress Dashboard

- [ ] `PRG-01` Implement progress tracking events:
  chapter visit, exercise view, flashcard complete, quiz submit.  
  Depends on: `UX-01`, `QZ-02`  
  Effort: S  
  Done when: `user_progress` updates correctly for all event types.

- [ ] `PRG-02` Build `/dashboard` summary cards, streak, and recent
  activity.  
  Depends on: `PRG-01`  
  Effort: M  
  Done when: dashboard reflects live user-specific data.

- [ ] `PRG-03` Build `/dashboard/[subject]` chapter-level progress view.  
  Depends on: `PRG-02`  
  Effort: S  
  Done when: status colors and averages match scoring rules.

## 11.9 Quality Gates and Demo Readiness

- [ ] `TST-01` Add unit tests for validators, scoring, streak
  calculation.  
  Depends on: `QZ-02`, `PRG-01`  
  Effort: S  
  Done when: unit tests run green in CI/local.

- [ ] `TST-02` Add integration tests for auth-protected and public API
  routes.  
  Depends on: `AI-02`, `QZ-02`, `FRM-01`  
  Effort: M  
  Done when: unauthorized cases return expected 401/403.

- [ ] `TST-03` Add Playwright smoke flow:
  register -> chapter -> quiz -> AI chat -> dashboard.  
  Depends on: `UX-02`, `AI-04`, `QZ-02`, `PRG-02`  
  Effort: M  
  Done when: smoke test passes on fresh seed data.

- [ ] `REL-01` Run release gate checklist:
  no P1 auth/data-loss bugs, seed idempotency pass, AI stable under
  concurrent load.  
  Depends on: `TST-03`  
  Effort: S  
  Done when: investor demo script can be run end-to-end without
  manual patching.

