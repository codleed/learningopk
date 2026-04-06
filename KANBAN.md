# LearningoPK — Kanban Board

> **Coding Agent Instructions**
>
> - Pick the top task from `## 🔵 Todo` that is not blocked.
> - Move it to `## 🟡 In Progress` before starting.
> - Move it to `## 🟢 Done` when complete and tested.
> - Never work on more than 3 tasks simultaneously.
> - Each task has a unique ID (e.g. `TASK-01`). Always reference the ID in commits: `git commit -m "TASK-01: init Next.js project"`.
> - Check `## 🔴 Blocked` before picking a task — some tasks have hard dependencies listed.

---

## Legend

| Symbol | Meaning                  |
| ------ | ------------------------ |
| 🔴     | Critical priority        |
| 🟠     | High priority            |
| 🔵     | Medium priority          |
| ⚪     | Low priority             |
| ⛔     | Blocked — see dependency |
| ✅     | Done                     |

---

## 🟡 In Progress

_No tasks in progress yet. Pick from Todo below._

---

## 🔵 Todo

### Phase 11 — Code Review Follow-Ups (High 🟠 / Medium 🔵)

---

#### TASK-53 🟠

**Title:** Decouple backend app creation from worker and Redis side effects
**Phase:** 11 — Code Review Follow-Ups
**Priority:** High
**Depends on:** TASK-39
**Acceptance Criteria:**

- [ ] Importing `backend/src/server.ts` does not start BullMQ workers or long-lived Redis side effects
- [ ] `createApp()` can be used by scripts and tests without background worker startup
- [ ] Worker startup is moved behind explicit runtime/bootstrap wiring
- [ ] `pnpm --filter backend auth:verify` exits cleanly in local verification
- [ ] Auth and integration tests no longer depend on queue startup to run

---

#### TASK-54 🟠

**Title:** Separate auth outage handling from unauthenticated redirects
**Phase:** 11 — Code Review Follow-Ups
**Priority:** High
**Depends on:** TASK-05
**Acceptance Criteria:**

- [ ] Protected SSR pages distinguish backend/auth unavailability from a genuinely missing session
- [ ] `frontend/src/lib/session.ts` stops collapsing every fetch failure into `null`
- [ ] `frontend/proxy.ts` has an explicit strategy for auth-service failure versus logged-out users
- [ ] Protected pages show a service-unavailable/degraded state when the backend is down
- [ ] Coverage exists for protected-page behavior during auth/backend outages

---

#### TASK-55 🟠

**Title:** Decouple signup and student routing from forum filter metadata
**Phase:** 11 — Code Review Follow-Ups
**Priority:** High
**Depends on:** TASK-08, TASK-19
**Acceptance Criteria:**

- [ ] Registration no longer depends on `/api/forum/filters` for board/class options
- [ ] `/subjects` no longer fails solely because forum filters are unavailable
- [ ] Legacy `/dashboard/[subject]` and `/dashboard/[subject]/[chapter]` redirects resolve via curriculum/learn data, not forum metadata
- [ ] Student navigation routes remain available when forum filter data is degraded
- [ ] Tests cover signup and student-route behavior when forum metadata endpoints fail

---

#### TASK-56 🔵

**Title:** Resolve password reset contract mismatch
**Phase:** 11 — Code Review Follow-Ups
**Priority:** Medium
**Depends on:** TASK-05
**Acceptance Criteria:**

- [ ] Password reset is either fully enabled end-to-end or removed/disabled from the live auth UI
- [ ] `/forgot-password` and `/reset-password` behavior matches the actual backend capability
- [ ] No success-path UI is shipped for an unavailable backend flow
- [ ] Playwright coverage reflects the real product contract instead of mocked-only success
- [ ] Auth docs describe the current password reset status accurately

---

#### TASK-57 🔵

**Title:** Repair auth review drift in tests, docs, and dead auth UI
**Phase:** 11 — Code Review Follow-Ups
**Priority:** Medium
**Depends on:** TASK-05, TASK-06
**Acceptance Criteria:**

- [ ] `docs/redesign/api-contracts.md` matches the actual Better Auth endpoints in code
- [ ] Auth Playwright coverage is updated for the current auth layout and passes reliably
- [ ] `auth-resilience.spec.ts` verifies the intended network-failure path instead of failing on locator ambiguity
- [ ] Outdated Bento auth assertions are removed or rewritten to match the current auth UI
- [ ] The “Remember me” control is either wired to real behavior or removed from the login form

---

#### TASK-58 🟠

**Title:** Fix SSR personalization gaps and formalize student route protection matrix
**Phase:** 11 — Code Review Follow-Ups
**Priority:** High
**Depends on:** TASK-18, TASK-20
**Acceptance Criteria:**

- [ ] SSR forum thread detail requests forward cookies when personalized reply state is expected
- [ ] Authenticated users see correct initial `viewerVoteType` state on first forum thread render
- [ ] A documented route matrix exists for which student routes are public, proxy-protected, or page-gated
- [ ] Student route protection is made consistent or intentionally documented where it differs
- [ ] Automated coverage exists for SSR personalized forum state and route protection expectations

---

#### TASK-59 🟠

**Title:** Lock mock exam solutions behind actual exam completion
**Phase:** 11 — Code Review Follow-Ups
**Priority:** High
**Depends on:** TASK-21
**Acceptance Criteria:**

- [ ] `/api/mock-exams/:id/questions` checks that the requesting user has a qualifying attempt for that mock exam before returning answers
- [ ] Direct navigation to `/past-papers/[id]/solutions` does not reveal answer keys to merely authenticated users
- [ ] Frontend and backend enforce the same rule for when solutions are viewable
- [ ] Unauthorized solution access returns a clear 403/404 contract instead of exposing answers
- [ ] Automated coverage exists for both attempted and unattempted solution access

---

#### TASK-60 🟠

**Title:** Replace ambiguous subject-slug progress routing with scoped subject identity
**Phase:** 11 — Code Review Follow-Ups
**Priority:** High
**Depends on:** TASK-17, TASK-18
**Acceptance Criteria:**

- [ ] Subject progress routes no longer rely on bare `subjectSlug` when the schema allows duplicate slugs across board/class scopes
- [ ] Backend subject progress lookup is scoped by a unique subject identity or route tuple
- [ ] Dashboard subject links resolve to the correct subject across multiple board/class contexts
- [ ] Progress pages cannot silently load the wrong subject due to `limit(1)` slug selection
- [ ] Automated coverage exists for duplicate-slug scenarios across board/class combinations

---

#### TASK-61 🔵

**Title:** Fix forum thread validation contracts and preserve accurate error statuses
**Phase:** 11 — Code Review Follow-Ups
**Priority:** Medium
**Depends on:** TASK-19
**Acceptance Criteria:**

- [ ] Invalid forum thread payloads involving missing subjects, missing chapters, or mismatched `subjectId`/`chapterId` return intentional 400/404 responses instead of generic 500s
- [ ] Forum thread creation preserves structured validation errors from the service layer through the route layer
- [ ] Forum thread creation rejects unpublished chapter attachments instead of accepting IDs that are hidden from published forum filters
- [ ] Forum create-thread behavior is covered for nonexistent chapters and subject/chapter mismatch cases
- [ ] Forum create-thread behavior is covered for unpublished chapter rejection
- [ ] The forum create-thread API contract is documented by tests rather than relying on string-matched exception handling

---

---

### Phase 8 — Growth Features (Medium 🔵)

---

---

---

### Phase 9 — Low Priority (Post-Investment ⚪)

---

#### TASK-30 ⚪

**Title:** Parent progress weekly email/SMS
**Phase:** 9 — Post-Investment
**Priority:** Low
**Depends on:** TASK-17
**Acceptance Criteria:**

- [ ] Student links parent email during onboarding (optional)
- [ ] Cron job runs every Sunday: generates HTML email with weekly stats
- [ ] Stats: chapters studied, quiz scores, streak, XP earned, time spent
- [ ] Use Resend or Nodemailer for email delivery
- [ ] Unsubscribe link in every email

---

#### TASK-31 ⚪

**Title:** Teacher/tutor accounts + class assignment
**Phase:** 9 — Post-Investment
**Priority:** Low
**Depends on:** TASK-05, TASK-12
**Acceptance Criteria:**

- [ ] New role: `teacher` added to `users.role` enum
- [ ] Teacher can create a "class" and invite students by email
- [ ] Teacher assigns chapters and quizzes with a due date
- [ ] Teacher dashboard shows all students' progress and quiz scores
- [ ] Students see assigned tasks in their dashboard

---

#### TASK-32 ⚪

**Title:** Offline mode (PWA)
**Phase:** 9 — Post-Investment
**Priority:** Low
**Depends on:** TASK-10, TASK-11
**Acceptance Criteria:**

- [ ] `next-pwa` or manual service worker configured
- [ ] Chapters and flashcards cached on first visit
- [ ] Offline banner shown when no network detected
- [ ] Quiz attempts queued locally and synced on reconnect
- [ ] App installable on Android home screen

---

#### TASK-33 ⚪

**Title:** Urdu language support (i18n)
**Phase:** 9 — Post-Investment
**Priority:** Low
**Depends on:** TASK-10
**Acceptance Criteria:**

- [ ] `next-intl` installed and configured
- [ ] Language toggle (EN / اردو) in navbar
- [ ] UI strings translated to Urdu
- [ ] Urdu content seeded separately per subject
- [ ] RTL layout applied when Urdu is active

---

#### TASK-34 ⚪

**Title:** Freemium paywall + JazzCash/EasyPaisa integration
**Phase:** 9 — Post-Investment
**Priority:** Low
**Depends on:** TASK-14, TASK-21
**Acceptance Criteria:**

- [ ] Free tier limits defined: 10 AI messages/day, 2 mock exams/month
- [ ] Paywall modal shown when limit hit
- [ ] Premium tier: PKR 199/month — unlimited AI + mock exams
- [ ] JazzCash and EasyPaisa payment APIs integrated
- [ ] Subscription status stored on `users` table

---

#### TASK-35 ⚪

**Title:** School/institution bulk licensing portal
**Phase:** 9 — Post-Investment
**Priority:** Low
**Depends on:** TASK-31, TASK-34
**Acceptance Criteria:**

- [ ] Separate `/institutions` landing page
- [ ] Institution admin can create school account and bulk-invite students
- [ ] Per-seat pricing: PKR 500/student/year
- [ ] Usage dashboard for institution admin
- [ ] Invoice generation (PDF) for each billing cycle

---

### Phase 10 — Enhancements (High 🟠)

---

---

---

---

---

---

## 🔴 Blocked

_Tasks listed here are blocked by an external dependency or decision._

| Task ID | Blocked By        | Reason                                                                    |
| ------- | ----------------- | ------------------------------------------------------------------------- |
| TASK-34 | Business decision | Needs JazzCash/EasyPaisa merchant account — requires company registration |
| TASK-35 | TASK-31, TASK-34  | Requires payment system and teacher roles to be complete                  |
| TASK-30 | Infrastructure    | Needs email provider (Resend free tier) — get API key first               |

---

## 🟢 Done

_Completed tasks are moved here by the coding agent._

### Phase 1 — Foundation (Critical 🔴)

#### TASK-01 ✅

**Title:** Init Next.js 16 project with TypeScript + Tailwind + shadcn/ui
**Phase:** 1 — Foundation
**Priority:** Critical
**Evidence:** `frontend/package.json` has Next.js 16.1.6, TypeScript, Tailwind CSS, shadcn/ui components, `tsconfig.json` has `"strict": true`

#### TASK-02 ✅

**Title:** Docker Compose — Postgres 16 + Redis 7
**Phase:** 1 — Foundation
**Priority:** Critical
**Evidence:** `docker-compose.yml` created with postgres:16, redis:7-alpine, minio; `pnpm docker:up` in `package.json`

#### TASK-03 ✅

**Title:** Environment variables setup (.env.local)
**Phase:** 1 — Foundation
**Priority:** Critical
**Evidence:** `.env.local.example` exists, `.gitignore` excludes `.env.local`

#### TASK-04 ✅

**Title:** Drizzle ORM setup + full database schema
**Phase:** 1 — Foundation
**Priority:** Critical
**Evidence:** `backend/src/lib/db/schema.ts` defines all tables (users, boards, subjects, chapters, exercises, flashcards, quizzes, quiz_questions, quiz_attempts, ai_chat_sessions, ai_messages, forum_threads, forum_replies, user_progress, mock_exams)

#### TASK-05 ✅

**Title:** Better Auth — authentication system
**Phase:** 1 — Foundation
**Priority:** Critical
**Evidence:** `backend/src/lib/auth.ts` configured with Better Auth + Drizzle adapter + email/password provider

#### TASK-06 ✅

**Title:** Auth pages — Register, Login, Forgot Password
**Phase:** 1 — Foundation
**Priority:** Critical
**Evidence:** `/login`, `/register`, `/forgot-password`, `/reset-password` pages exist with React Hook Form + Zod validation

---

### Phase 2 — Content System (Critical 🔴)

#### TASK-07 ✅

**Title:** PDF content seeder CLI script
**Phase:** 2 — Content
**Priority:** Critical
**Evidence:** `backend/scripts/seed-content.ts` accepts `--board`, `--grade`, `--subject` flags; idempotent inserts via Drizzle

#### TASK-08 ✅

**Title:** Subject list page
**Phase:** 2 — Content
**Priority:** Critical
**Evidence:** `frontend/app/(dashboard)/subjects/page.tsx` lists subjects with progress, icons, links

#### TASK-09 ✅

**Title:** Chapter list page (subject home)
**Phase:** 2 — Content
**Priority:** Critical
**Evidence:** `frontend/app/(learn)/[board]/[grade]/[subject]/page.tsx` shows chapters with progress ring, quiz scores

#### TASK-10 ✅

**Title:** Chapter page — Summary + Exercises tabs
**Phase:** 2 — Content
**Priority:** Critical
**Evidence:** `frontend/app/(learn)/[board]/[grade]/[subject]/[chapter]/page.tsx` with Summary/Exercises/Flashcards/Quiz tabs, KaTeX math, markdown rendering

#### TASK-11 ✅

**Title:** Flashcard deck tab
**Phase:** 2 — Content
**Priority:** Critical
**Evidence:** `frontend/src/components/learn/flashcard-deck.tsx` with CSS 3D flip animation, Known/Review Again tracking

#### TASK-12 ✅

**Title:** Chapter quiz — runner + result page
**Phase:** 2 — Content
**Priority:** Critical
**Evidence:** `frontend/src/components/learn/quiz-runner.tsx`, `quiz-timer.tsx`, `quiz-result-summary.tsx`; `backend/src/routes/quiz.ts`

---

### Phase 3 — AI Teacher (Critical 🔴)

#### TASK-13 ✅

**Title:** Mistral AI client + Socratic system prompt
**Phase:** 3 — AI Teacher
**Priority:** Critical
**Evidence:** `backend/src/lib/mistral.ts` with `mistral-small-latest`, 500 tokens, 0.7 temp, Socratic prompt builder

#### TASK-14 ✅

**Title:** AI chat streaming API route
**Phase:** 3 — AI Teacher
**Priority:** Critical
**Evidence:** `backend/src/routes/ai-chat.ts` with streaming, rate limiting, session persistence, message logging

#### TASK-15 ✅

**Title:** AI chat panel UI component
**Phase:** 3 — AI Teacher
**Priority:** Critical
**Evidence:** `frontend/src/components/learn/ai-chat-panel.tsx` with Sheet component, useChat hook, token streaming, KaTeX rendering

---

### Phase 4 — Student Dashboard + Progress (High 🟠)

#### TASK-16 ✅

**Title:** Progress tracking API
**Phase:** 4 — Dashboard
**Priority:** High
**Evidence:** `backend/src/routes/progress.ts` with chapter_visit, exercise_view, flashcard_complete, quiz_submit events

#### TASK-17 ✅

**Title:** Student dashboard page
**Phase:** 4 — Dashboard
**Priority:** High
**Evidence:** `frontend/app/(dashboard)/dashboard/page.tsx` with subject cards, activity feed, weekly heatmap, streak calculation

#### TASK-18 ✅

**Title:** Subject progress detail page
**Phase:** 4 — Dashboard
**Priority:** High
**Evidence:** `frontend/app/(dashboard)/dashboard/[subject]/page.tsx` with chapter-by-chapter progress table, color coding

---

### Phase 5 — Community Forum (High 🟠)

#### TASK-19 ✅

**Title:** Forum feed page + thread creation
**Phase:** 5 — Forum
**Priority:** High
**Evidence:** `frontend/app/forum/page.tsx` with filters, full-text search via tsvector+GIN, thread creation

#### TASK-20 ✅

**Title:** Forum thread detail + replies
**Phase:** 5 — Forum
**Priority:** High
**Evidence:** `frontend/app/forum/[threadId]/page.tsx` with markdown rendering, upvotes, accepted answer, nested replies

---

### Phase 6 — Mock Exams (High 🟠)

#### TASK-21 ✅

**Title:** Mock exam flow
**Phase:** 6 — Mock Exams
**Priority:** High
**Evidence:** Exam mode with 60-75 questions, 2-3 hour timer, question navigator sidebar, section-wise scores, weak area recommendations, saves to quiz_attempts with type: mock_exam

---

### Phase 7 — Engagement Features (High 🟠)

#### TASK-22 ✅

**Title:** XP system + study streaks
**Phase:** 7 — Engagement
**Priority:** High
**Evidence:** XP awards (+5 chapter, +2 exercise, +10 flashcard, +25 quiz, +15 forum), 5-level system (Fresher→Board Topper), streak freeze, toast notifications, dashboard streak display with flame icon

#### TASK-23 ✅

**Title:** Shareable result card (score image)
**Phase:** 7 — Engagement
**Priority:** High
**Evidence:** "Share Result" button on quiz results, html-to-image PNG generation, card shows score/subject/chapter/platform/date, download button, WhatsApp share pre-fill

#### TASK-24 ✅

**Title:** Past papers archive page
**Phase:** 7 — Engagement
**Priority:** High
**Evidence:** Filter by board/grade/subject/year (2015-2024), exam cards with marks/duration/Attempt button, View Solutions for solved papers

---

### Phase 8 — Growth Features (Medium 🔵)

#### TASK-25 ✅

**Title:** Study groups
**Phase:** 8 — Growth
**Priority:** Medium
**Evidence:** Added authenticated study groups API and pages with immediate invite resolution by username/email, 6-member cap, member progress/streak summaries, and async group activity notifications

#### TASK-26 ✅

**Title:** Quiz duel — challenge a friend
**Phase:** 8 — Growth
**Priority:** Medium
**Evidence:** Added `quiz_duel_challenges`, shareable challenge links from quiz results, logged-in recipient duel flow using the same chapter quiz, side-by-side duel results, and 48-hour expiry enforcement

#### TASK-27 ✅

**Title:** Adaptive weak-spot detection
**Phase:** 8 — Growth
**Priority:** Medium
**Evidence:** Added historical subject weak-area aggregation after 3+ attempts, dashboard weak-areas card with direct exercise links, and AI tutor prompt context enriched with adaptive weak areas

#### TASK-28 ✅

**Title:** Exam countdown + auto revision schedule
**Phase:** 8 — Growth
**Priority:** Medium
**Evidence:** Reused `subjects.examDate`; added per-subject read-time revision plan generation from chapters, progress, and quiz scores; dashboard planner widget with exam-date input, countdown, calendar grid, and visible today reminder; local in-app reminder toast on dashboard open

#### TASK-29 ✅

**Title:** Admin panel — content management
**Phase:** 8 — Growth
**Priority:** Medium
**Evidence:** `frontend/app/admin/page.tsx` with command center, content CRUD, forum moderation, audit logs

---

### Phase 10 — Enhancements (Critical 🔴)

#### TASK-39 ✅

**Title:** Background Job Processing Infrastructure
**Phase:** 10 — Enhancements
**Priority:** Critical
**Evidence:** `backend/src/lib/queue.ts` with BullMQ setup; `backend/src/jobs/*.ts` with typed job definitions; `backend/src/workers/*.ts` with worker processes; `backend/src/routes/admin.ts` with job stats/retry endpoints

#### TASK-36 ✅

**Title:** KaTeX Math Screen Reader Accessibility
**Phase:** 10 — Enhancements
**Priority:** Critical
**Evidence:** `frontend/src/lib/latex-to-speech.ts` with LaTeX-to-spoken-form conversion; `markdown-math-renderer.tsx` with aria-label and aria-description; `globals.css` with prefers-reduced-motion support

#### TASK-37 ✅

**Title:** AI Chat Panel Keyboard Navigation & Focus Management
**Phase:** 10 — Enhancements
**Priority:** Critical
**Evidence:** `frontend/src/components/learn/ai-chat-panel.tsx` with focus trap, Escape key handling, arrow key message navigation, 3:1 focus indicators

#### TASK-38 ✅

**Title:** Quiz System Keyboard Accessibility
**Phase:** 10 — Enhancements
**Priority:** Critical
**Evidence:** `frontend/src/components/learn/quiz-question-card.tsx` with fieldset/legend, radio inputs, keyboard navigation; `frontend/src/components/learn/quiz-runner.tsx` with aria-live region

---

### Phase 0 — Infrastructure Scaling (Critical 🔴)

#### TASK-51A ✅

**Title:** PostgreSQL Connection Pooling (PgBouncer)
**Phase:** 0 — Infrastructure Scaling
**Priority:** Critical
**Evidence:** `docker-compose.yml` added pgbouncer service (edoburu/pgbouncer:latest) with transaction-mode pooling, max_client_conn=500, default_pool_size=25; `backend/.env` updated DATABASE_URL to port 6432

#### TASK-51B ✅

**Title:** Redis Content Caching Layer
**Phase:** 0 — Infrastructure Scaling
**Priority:** Critical
**Evidence:** `backend/src/lib/cache/cache.service.ts` with typed keys, JSON serialization, TTL management (subjects: 1hr, chapters: 30min, forum: 5min); no cache for quiz questions/progress/AI; cache invalidation via repository pattern

#### TASK-51C ✅

**Title:** Nginx Load Balancing + Rate Limiting
**Phase:** 0 — Infrastructure Scaling
**Priority:** Critical
**Evidence:** `infra/nginx.conf` with upstream backend, rate limiting (100r/m user, 1000r/m IP), JWT pass-through, health check endpoint, gzip compression and buffer optimizations; `docker-compose.yml` added nginx service

#### TASK-51D ✅

**Title:** Repository Pattern Consolidation
**Phase:** 0 — Infrastructure Scaling
**Priority:** Critical
**Evidence:** `backend/src/repositories/*.ts` all services refactored to use repos; `backend/src/services/` removed; direct db.select() removed from services; cache-through pattern added to repositories; `backend/src/tests/unit/repositories/` added with passing tests

---

### Admin Content Management & UI Improvements

#### TASK-65 ✅

**Title:** Chapter Content Management System (CMS)
**Phase:** Admin — Content Management
**Priority:** High
**Evidence:** `frontend/app/admin/content/` with chapter CRUD, exercise/quiz/flashcard editing; flashcard reorder with DB transaction atomicity (`4325feb`); quiz question explanation made optional (`5dd9630`); PRs #14, #15 merged

#### TASK-66 ✅

**Title:** Reusable MarkdownRenderer + Virtual Text Measurement
**Phase:** Frontend — Components
**Priority:** Medium
**Evidence:** `frontend/src/components/MarkdownRenderer.tsx` with themeable CSS module; `frontend/src/hooks/usePretextMeasure.ts` with Pretext.js integration for markdown virtualization; PRs #16, #17 merged

#### TASK-67 ✅

**Title:** Admin Subject Management + Curriculum FK Fixes
**Phase:** Admin — Content Management
**Priority:** Medium
**Evidence:** Subject CRUD with deletion and markdown file import in chapter forms; updated foreign key constraints for subjects and board_classes; routing path adjustments for admin content management; PR #13 merged

#### TASK-68 ✅

**Title:** Curriculum Delete API + Admin Navigation Paths
**Phase:** Admin — Content Management
**Priority:** Medium
**Evidence:** Connected delete API endpoints for boards, classes, subjects, chapters; fixed navigation paths for curriculum management flows; PR #12 merged

#### TASK-69 ✅

**Title:** Sidebar Navigation Fix + Icon Centering
**Phase:** Frontend — UI Fix
**Priority:** Low
**Evidence:** Resolved sidebar icon centering and navigation issues in left rail; PR #11 merged

---

### Phase 11 — Code Review Follow-Ups (Completed)

#### TASK-53 ✅

**Title:** Decouple backend app creation from worker and Redis side effects
**Phase:** 11 — Code Review Follow-Ups
**Priority:** High
**Evidence:** `backend/src/lib/queue.ts` refactored with lazy singleton factories (`getRedisConnection()`, `getAnalyticsQueue()`); workers dynamically imported in `server.ts`; no module-level Redis side effects

#### TASK-54 ✅

**Title:** Separate auth outage handling from unauthenticated redirects
**Phase:** 11 — Code Review Follow-Ups
**Priority:** High
**Evidence:** `ServiceUnavailable` component for auth outage; error boundaries detect `AUTH_SERVICE_UNAVAILABLE`; `session.ts` and `proxy.ts` distinguish auth failures from missing sessions

#### TASK-55 ✅

**Title:** Decouple signup and student routing from forum filter metadata
**Phase:** 11 — Code Review Follow-Ups
**Priority:** High
**Evidence:** New `GET /api/learn/boards` and `GET /api/learn/subjects` endpoints; registration and subjects pages use learn API instead of forum filters

#### TASK-56 ✅

**Title:** Resolve password reset contract mismatch
**Phase:** 11 — Code Review Follow-Ups
**Priority:** Medium
**Evidence:** Removed "Forgot password?" link from login; created ADR-064 documenting password reset disabled until `sendResetPassword` implemented

#### TASK-57 ✅

**Title:** Repair auth review drift in tests, docs, and dead auth UI
**Phase:** 11 — Code Review Follow-Ups
**Priority:** Medium
**Evidence:** Deleted 3 dead auth component files; updated api-contracts.md; auth tests use correct locators

#### TASK-58 ✅

**Title:** Fix SSR personalization gaps and formalize student route protection matrix
**Phase:** 11 — Code Review Follow-Ups
**Priority:** High
**Evidence:** `getForumThreadById()` forwards cookies for SSR; created route-protection-matrix.md

#### TASK-59 ✅

**Title:** Lock mock exam solutions behind actual exam completion
**Phase:** 11 — Code Review Follow-Ups
**Priority:** High
**Evidence:** Frontend uses structured `MockExamApiError` for 403 detection; backend already had completion check

#### TASK-60 ✅

**Title:** Replace ambiguous subject-slug progress routing with scoped subject identity
**Phase:** 11 — Code Review Follow-Ups
**Priority:** High
**Evidence:** Route restructured from `[subject]` to `[boardSlug]/[grade]/[subjectSlug]`; repository selects `boardSlug`; removed `limit(1)`

#### TASK-61 ✅

**Title:** Fix forum thread validation contracts and preserve accurate error statuses
**Phase:** 11 — Code Review Follow-Ups
**Priority:** Medium
**Evidence:** Comprehensive integration tests documenting forum thread creation validation contract

#### TASK-62 ✅

**Title:** Preserve forum filter state across search, solved toggles, and advanced filters
**Phase:** 11 — Code Review Follow-Ups
**Priority:** Medium
**Evidence:** Search form preserves active filters via hidden inputs; E2E tests for 8 combined filter interaction scenarios; Playwright assertions updated to match current UI contract

#### TASK-63 ✅

**Title:** Harden forum mutation UX and prevent inflated thread view metrics
**Phase:** 11 — Code Review Follow-Ups
**Priority:** Medium
**Evidence:** Dedicated `POST /threads/:threadId/view` endpoint; client-side `ForumThreadViewTracker` fires once on mount; all mutation components have try/catch/finally with toast errors; integration tests for view tracking semantics

---

### Phase 10 — Enhancements (Completed)

#### TASK-40 ✅

**Title:** Structured Content Caching Layer
**Phase:** 10 — Enhancements
**Priority:** High
**Evidence:** Cache purge hooks on all 22 admin mutation endpoints + forum mutations; `GET /api/admin/cache/stats` and `POST /api/admin/cache/purge` endpoints; stale-while-revalidate background refresh; `invalidatePattern()` uses SCAN instead of KEYS; 10 unit tests

#### TASK-41 ✅

**Title:** Error Monitoring & Observability Infrastructure
**Phase:** 10 — Enhancements
**Priority:** High
**Evidence:** Pino structured JSON logging with correlation IDs; optional Sentry integration; in-memory p50/p95/p99 performance spans; `/api/health/live`, `/api/health/ready`, and admin performance endpoint with unit coverage

#### TASK-42 ✅

**Title:** Spaced Repetition Flashcard System (SRS)
**Phase:** 10 — Enhancements
**Priority:** High
**Evidence:** Added `flashcard_reviews` table and migration; SM-2 review algorithm; `/api/flashcard-reviews` routes; `SrsReviewDeck`, `/review` page, and dashboard `Review Now` widget; initial flashcard review seeding

#### TASK-43 ✅

**Title:** AI Tutor Memory & Personal Context
**Phase:** 10 — Enhancements
**Priority:** High
**Evidence:** Added `ai_context` table and repository; system prompt personal context injection; post-stream concept extraction; AI context API routes; dashboard `AiMemoryCard`; quiz-failure weak-topic hook

#### TASK-44 ✅

**Title:** Learning Path from Weak Areas
**Phase:** 10 — Enhancements
**Priority:** High
**Evidence:** Added protected `GET /api/ai/learning-path`; weighted weak-area scoring from quiz, progress, and AI engagement signals; dashboard `FocusAreasWidget`; AI tutor context includes `studentWeakAreas`

#### TASK-45 ✅

**Title:** Revision Notes & Quick Reference Cards
**Phase:** 10 — Enhancements
**Priority:** High
**Evidence:** Added `revision_notes` table and migration; admin revision-notes manager; student `Quick Revision` tab with KaTeX formulas, common-mistake badges, and print-to-PDF cheat sheet flow

#### TASK-46 ✅

**Title:** Formula Library Centralized Repository
**Phase:** 10 — Enhancements
**Priority:** High
**Evidence:** Added `formulas`, `user_starred_formulas`, and `formula_access_events`; `/formulas` page with filters and full-text search; KaTeX formula cards with copy and starring; dashboard top-5 starred formulas by access frequency

#### TASK-47 ✅

**Title:** Daily Momentum Micro-Goal Engine
**Phase:** 10 — Enhancements
**Priority:** High
**Evidence:** Added computed `todaysFocus` to dashboard payload; priority order for weak quiz chapters, streak-risk, and nearest unvisited chapters by exam date; protected completion route with XP bonus; dashboard Today\'s Focus card with celebration and Ramadan shortening heuristic

#### TASK-48 ✅

**Title:** Streak Wager System (Loss Aversion Engine)
**Phase:** 10 — Enhancements
**Priority:** High
**Evidence:** Added streak wager persistence and PKT settlement logic; dashboard Streak Lock modal and 8 PM warning; explicit streak-freeze recovery flow for missed wager days

#### TASK-49 ✅

**Title:** Leaderboard & Competitive Benchmarking
**Phase:** 10 — Enhancements
**Priority:** High
**Evidence:** Added leaderboard API with global/board/school scopes and xp/streak/quizzes metrics; `/leaderboard` page with cohort tabs; 5-minute caching; weekly change, badges, and privacy opt-out settings

#### TASK-50 ✅

**Title:** Exam Pattern Analysis (Topic Weightage)
**Phase:** 10 — Enhancements
**Priority:** High
**Evidence:** Added `exam_analysis` table and aggregation repository; chapter weightage badge; subject-level importance ranking and study recommendation; `/patterns/[board]/[subject]` trend page with 5-year topic bars

#### TASK-51 ✅

**Title:** Model Fallback Strategy for Cost & Reliability
**Phase:** 10 — Enhancements
**Priority:** High
**Evidence:** Added AI model strategy with prompt classification, tiered model selection, retry fallback chain, circuit breaker, exact normalized-prompt cached-response mode, and `modelTier` persistence on `ai_usage_logs`

#### TASK-52 ✅

**Title:** Proactive Confusion Detection & Hints
**Phase:** 10 — Enhancements
**Priority:** High
**Evidence:** Added `ai_conversation_events` table and confusion detection module using persisted session history; proactive hint payloads and subtle frontend hint CTA; admin analytics chapter-level confusion insights

---

## 📋 Notes for Coding Agent

### Commit message format

```
TASK-XX: short description of what was done
```

Example: `TASK-04: add Drizzle schema with all 13 tables`

### Branch naming

```
task/TASK-XX-short-description
```

Example: `task/TASK-05-better-auth-setup`

### When you finish a task

1. Move task from `## 🔵 Todo` to `## 🟢 Done`
2. Check if any blocked tasks in `## 🔴 Blocked` are now unblocked — move them to Todo
3. Update this file in the same commit as your feature code

### Tech stack quick reference

| Need            | Use                               |
| --------------- | --------------------------------- |
| Package manager | `pnpm`                            |
| Database client | Drizzle ORM (`lib/db/index.ts`)   |
| Auth            | Better Auth (`lib/auth.ts`)       |
| AI streaming    | Vercel AI SDK + `@ai-sdk/mistral` |
| Form validation | React Hook Form + Zod             |
| UI components   | shadcn/ui                         |
| Markdown        | `react-markdown` + `remark-gfm`   |
| Math rendering  | `react-katex` + `katex`           |
| Styling         | Tailwind CSS                      |

### Environment variables required

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5433/learningo
REDIS_URL=redis://localhost:6379
BETTER_AUTH_SECRET=yOocWXqo7cx5Zde53GtGcCn4Q6qoNszeoQ8aLGLze1k=
BETTER_AUTH_URL=http://localhost:3001
FRONTEND_ORIGIN=http://localhost:3000
MISTRAL_API_KEY=0MC0Dro56V7KOnEpeQMhanSXr1XK37l8
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=learningo-media
MINIO_PUBLIC_URL=http://localhost:9000
PORT=3001
```

### Never do these things

- Never use the Pages Router — App Router only
- Never put `MISTRAL_API_KEY` in client-side code
- Never use raw SQL strings — always use Drizzle ORM
- Never use `any` TypeScript type
- Never use `useEffect` for data fetching in Server Components
- Never store session data in `localStorage`
