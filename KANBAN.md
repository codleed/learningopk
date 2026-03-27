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

### Phase 6 — Mock Exams (High 🟠)

---

#### TASK-21 🟠

**Title:** Mock exam flow
**Phase:** 6 — Mock Exams
**Priority:** High
**Depends on:** TASK-12
**Files:** `components/quiz/MockExam.tsx`, `app/(learn)/mock-exam/[examId]/page.tsx`
**Acceptance Criteria:**

- [ ] Exam mode: no per-question feedback until full submission
- [ ] 60–75 questions, 2–3 hour countdown timer
- [ ] Question navigator sidebar: jump to any question, see answered/unanswered status
- [ ] On submit: detailed result report — section-wise scores, time spent estimate, weak areas
- [ ] Weak area recommendation: list chapters to revise based on wrong answers
- [ ] Saves attempt to `quiz_attempts` with `type: mock_exam`

---

### Phase 7 — Engagement Features (High 🟠)

---

#### TASK-22 🟠

**Title:** XP system + study streaks
**Phase:** 7 — Engagement
**Priority:** High
**Depends on:** TASK-17
**Acceptance Criteria:**

- [ ] XP awarded: chapter visit (+5), exercise expand (+2), flashcard complete (+10), quiz pass (+25), forum answer accepted (+15)
- [ ] XP and level stored on `users` table (add `xp` integer, `level` integer columns)
- [ ] Level thresholds: Fresher (0), Student (100), Scholar (300), Topper (600), Board Topper (1000)
- [ ] Streak freeze: one allowed per week — stored on `users` table
- [ ] XP gain toast notification on every award
- [ ] Streak shown on dashboard with flame icon (CSS, no emoji)

---

#### TASK-23 🟠

**Title:** Shareable result card (score image)
**Phase:** 7 — Engagement
**Priority:** High
**Depends on:** TASK-12
**File:** `app/api/share/result/route.ts`
**Acceptance Criteria:**

- [ ] After quiz/mock exam, "Share Result" button visible
- [ ] Generates a styled HTML card rendered to PNG using `html-to-image` or `@vercel/og`
- [ ] Card shows: score, subject, chapter/exam name, platform branding, date
- [ ] Download button saves PNG locally
- [ ] WhatsApp share link pre-fills message with score + platform URL

---

#### TASK-24 🟠

**Title:** Past papers archive page
**Phase:** 7 — Engagement
**Priority:** High
**Depends on:** TASK-07
**File:** `app/(learn)/past-papers/page.tsx`
**Acceptance Criteria:**

- [ ] Lists all mock exams filtered by: board, grade, subject, year
- [ ] Each entry shows: year, subject, board, total marks, duration, "Attempt" button
- [ ] Solved papers also have "View Solutions" (read-only, no timer)
- [ ] Year range: 2015–2024

---

### Phase 8 — Growth Features (Medium 🔵)

---

#### TASK-25 🔵

**Title:** Study groups
**Phase:** 8 — Growth
**Priority:** Medium
**Depends on:** TASK-17
**Acceptance Criteria:**

- [ ] Students create a group (name + invite by username/email)
- [ ] Max 6 members per group
- [ ] Group page shows: each member's chapter completion %, quiz scores, streak
- [ ] No real-time chat — async only
- [ ] Notifications when a group member completes a chapter or beats your quiz score

---

#### TASK-26 🔵

**Title:** Quiz duel — challenge a friend
**Phase:** 8 — Growth
**Priority:** Medium
**Depends on:** TASK-12
**Acceptance Criteria:**

- [ ] "Challenge a friend" button on chapter quiz result page
- [ ] Generates a shareable link with `challengeId`
- [ ] Recipient opens link, takes the same 10 questions
- [ ] Both scores shown side-by-side on result page
- [ ] Challenge expires after 48 hours

---

#### TASK-27 🔵

**Title:** Adaptive weak-spot detection
**Phase:** 8 — Growth
**Priority:** Medium
**Depends on:** TASK-12, TASK-14
**Acceptance Criteria:**

- [ ] After 3+ quiz attempts on a subject, analyse wrong answers by topic/exercise tag
- [ ] Surface "Your weak areas" card on dashboard per subject
- [ ] Weak areas link directly to relevant exercises
- [ ] AI teacher context updated to mention weak areas in system prompt

---

#### TASK-28 🔵

**Title:** Exam countdown + auto revision schedule
**Phase:** 8 — Growth
**Priority:** Medium
**Depends on:** TASK-17
**Acceptance Criteria:**

- [ ] Student inputs board exam dates on dashboard
- [ ] Platform generates a day-by-day revision schedule (which chapters on which day)
- [ ] Schedule accounts for: remaining chapters, quiz scores, available days
- [ ] Schedule shown as a calendar grid on dashboard
- [ ] Daily reminder notification (browser push or email)

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

### Phase 10 — Enhancements (Critical 🔴 / High 🟠)

---

#### TASK-36 🔴

**Title:** KaTeX Math Screen Reader Accessibility
**Phase:** 10 — Enhancements
**Priority:** Critical
**Depends on:** TASK-10
**Acceptance Criteria:**

- [ ] All KaTeX equations have `aria-label` with spoken-form math (e.g., "x squared divided by y plus 3")
- [ ] Complex equations include hidden descriptive text explaining the mathematical structure in plain language
- [ ] Math content passes screen reader testing with VoiceOver (Safari) and NVDA (Firefox)
- [ ] Math rendering respects `prefers-reduced-motion`

---

#### TASK-37 🔴

**Title:** AI Chat Panel Keyboard Navigation & Focus Management
**Phase:** 10 — Enhancements
**Priority:** Critical
**Depends on:** TASK-15
**Acceptance Criteria:**

- [ ] Tab navigation enters the chat panel and focuses the message input field
- [ ] All AI response messages are focusable and readable with screen readers via arrow-key navigation
- [ ] Focus is trapped within the chat panel when open; Escape key returns focus to trigger element
- [ ] Visual focus indicator has 3:1 contrast ratio minimum and is distinguishable from chat bubble backgrounds

---

#### TASK-38 🔴

**Title:** Quiz System Keyboard Accessibility
**Phase:** 10 — Enhancements
**Priority:** Critical
**Depends on:** TASK-12
**Acceptance Criteria:**

- [ ] Quiz questions use properly grouped `<fieldset>` and `<legend>` elements with clear question numbering
- [ ] All MCQ options are selectable via keyboard (Arrow keys between options, Space/Enter to select)
- [ ] Answer submission results are announced via `aria-live` region ("Correct!" or "Incorrect.")
- [ ] Focus moves to the next question after answer selection

---

#### TASK-39 🔴

**Title:** Background Job Processing Infrastructure
**Phase:** 10 — Enhancements
**Priority:** Critical
**Depends on:** TASK-04
**Acceptance Criteria:**

- [ ] BullMQ integration using existing Redis 7 infrastructure with worker processes
- [ ] Job registry with typed definitions, retry policies, and dead-letter queue for failed jobs
- [ ] Schedulable jobs: cron-based recurring jobs (daily analytics, weekly emails, stale session cleanup)
- [ ] Admin dashboard integration: job monitoring endpoint exposing queue statistics and manual retry

---

#### TASK-40 🟠

**Title:** Structured Content Caching Layer
**Phase:** 10 — Enhancements
**Priority:** High
**Depends on:** TASK-39
**Acceptance Criteria:**

- [ ] Cache-aside pattern with typed keys, JSON serialization, and TTL management (static: 1hr, user: 5min, analytics: 15min)
- [ ] Automatic cache purge hooks on content mutations via repository pattern
- [ ] Cache statistics endpoint exposing hit rates, miss rates, and eviction counts
- [ ] Dashboard query optimization with background refresh before TTL expiry

---

#### TASK-41 🟠

**Title:** Error Monitoring & Observability Infrastructure
**Phase:** 10 — Enhancements
**Priority:** High
**Depends on:** TASK-04
**Acceptance Criteria:**

- [ ] Sentry integration with automatic error capture, stack traces, and source map resolution
- [ ] Structured JSON logs with correlation IDs, log levels, and request timing spans
- [ ] Performance monitoring: custom spans for DB queries, AI calls, and cache operations with p50/p95/p99 tracking
- [ ] Health check enhancement: `/api/health/live` and `/api/health/ready` reporting PostgreSQL, Redis, MinIO, AI status

---

#### TASK-42 🟠

**Title:** Spaced Repetition Flashcard System (SRS)
**Phase:** 10 — Enhancements
**Priority:** High
**Depends on:** TASK-11
**Acceptance Criteria:**

- [ ] SM-2 algorithm calculating next review date per card
- [ ] `flashcard_reviews` table: `card_id`, `user_id`, `interval_days`, `ease_factor`, `next_review_date`
- [ ] Dashboard "Review Now" button shows overdue flashcards based on `next_review_date`
- [ ] After flip, user rates recall: "Again / Hard / Good / Easy" (4 buttons, CSS-only)
- [ ] System calculates next review: Easy = +3 days, Good = +2 days, Hard = +1 day, Again = reset to today

---

#### TASK-43 🟠

**Title:** AI Tutor Memory & Personal Context
**Phase:** 10 — Enhancements
**Priority:** High
**Depends on:** TASK-14
**Acceptance Criteria:**

- [ ] New `ai_context` table: `user_id`, `weak_topics`, `strong_topics`, `preferred_explanation_style`, `last_concepts_discussed`
- [ ] System prompt includes user context: "Student struggles with [topic]. Prefers [visual/examples]."
- [ ] AI messages parsed post-stream to extract concepts and auto-update `weak_topics`/`strong_topics`
- [ ] Dashboard shows "AI remembers: You struggle with trigonometry" card with edit option
- [ ] On quiz failure, AI tutor proactively references: "I see you scored 45% on Motion..."

---

#### TASK-44 🟠

**Title:** Learning Path from Weak Areas
**Phase:** 10 — Enhancements
**Priority:** High
**Depends on:** TASK-16, TASK-14
**Acceptance Criteria:**

- [ ] Endpoint `GET /api/ai/learning-path` generates prioritized chapter list based on weak topics
- [ ] Weighted scoring: quiz scores (50%), exercises viewed (30%), AI session engagement (20%)
- [ ] Returns `{recommendedChapters: [{chapterId, priority, reason, estimatedTime}]}`
- [ ] Dashboard displays "Focus Areas" widget with top 3 recommended chapters and one-click "Start practicing"
- [ ] AI tutor context includes `studentWeakAreas` for proactive intervention

---

#### TASK-45 🟠

**Title:** Revision Notes & Quick Reference Cards
**Phase:** 10 — Enhancements
**Priority:** High
**Depends on:** TASK-10
**Acceptance Criteria:**

- [ ] New `revision_notes` table: `chapter_id`, `key_formulas` (jsonb), `key_definitions` (jsonb), `common_mistakes`, `exam_tips`
- [ ] Admin panel form to add revision notes per chapter
- [ ] Chapter page new "Quick Revision" tab showing condensed notes (90% shorter than full summary)
- [ ] Revision notes render with KaTeX formula highlighting and warning badges for common mistakes
- [ ] "Download as PDF" button generates single-page cheat sheet for offline printing

---

#### TASK-46 🟠

**Title:** Formula Library Centralized Repository
**Phase:** 10 — Enhancements
**Priority:** High
**Depends on:** TASK-07
**Acceptance Criteria:**

- [ ] New `formulas` table: `subject_id`, `chapter_id`, `name`, `formula_latex`, `description`, `variables`, `tags`
- [ ] Formula Library page (`/formulas`) with filters: subject, chapter, topic tag
- [ ] Full-text search by formula name or description (tsvector)
- [ ] Formula cards render with KaTeX, expandable explanation, and "Copy LaTeX" button
- [ ] Students can star formulas for personal quick-access (`user_starred_formulas` join table)
- [ ] Dashboard shows "Your Starred Formulas" widget with top 5 by access frequency

---

#### TASK-47 🟠

**Title:** Daily Momentum Micro-Goal Engine
**Phase:** 10 — Enhancements
**Priority:** High
**Depends on:** TASK-17
**Acceptance Criteria:**

- [ ] On dashboard load, display ONE "Today's Focus" card with a single micro-goal
- [ ] Micro-goal algorithm prioritizes: (a) chapters with <50% quiz score, (b) streak-at-risk days, (c) unvisited chapters closest to exam date
- [ ] Goal includes "Quick Start" button that deep-links directly to the action
- [ ] Completion shows celebratory animation with XP bonus (+5 to +15 XP depending on difficulty)
- [ ] Ramadan Mode: Micro-goals auto-adjust to shorter sessions (3-5 minutes) during fasting hours

---

#### TASK-48 🟠

**Title:** Streak Wager System (Loss Aversion Engine)
**Phase:** 10 — Enhancements
**Priority:** High
**Depends on:** TASK-22
**Acceptance Criteria:**

- [ ] On streak ≥ 3 days, show "Streak Lock" modal: "Lock in your streak! Wager 25-100 XP to protect it for 24 hours"
- [ ] Student selects wager amount; wagered XP temporarily deducted from balance
- [ ] If daily goal completed before midnight PKT, wager returns +50% bonus
- [ ] If goal missed, wagered XP permanently lost and streak broken
- [ ] Streak freeze from TASK-22 can be used once to recover from broken wager
- [ ] "Streak at Risk" warning at 8 PM PKT if no wager set and streak ≥ 5 days

---

#### TASK-49 🟠

**Title:** Leaderboard & Competitive Benchmarking
**Phase:** 10 — Enhancements
**Priority:** High
**Depends on:** TASK-22
**Acceptance Criteria:**

- [ ] Leaderboard API: `GET /api/leaderboard?scope=global|board|school&metric=xp|streak|quizzes`
- [ ] Leaderboard page (`/leaderboard`) with tabbed views: Global, Your Board, Your Grade
- [ ] Each entry shows: Rank, Avatar, Name, XP/Level, Streak, Weekly Change
- [ ] Student sees their rank in context: "You're ranked #847 of 12,391 students"
- [ ] Leaderboard updates every 5 minutes to reduce DB load
- [ ] Reward system: Top 100 badges shown on profile (Bronze/Silver/Gold badge CSS)
- [ ] Privacy: Students can opt out of public leaderboard

---

#### TASK-50 🟠

**Title:** Exam Pattern Analysis (Topic Weightage)
**Phase:** 10 — Enhancements
**Priority:** High
**Depends on:** TASK-24, TASK-21
**Acceptance Criteria:**

- [ ] `exam_analysis` table: `board_id`, `subject_id`, `chapter_id`, `occurrence_count`, `avg_marks`, `last_seen_year`
- [ ] Chapter page shows "Board Exam Weightage" badge: "This chapter appeared in 85% of past 5 board exams (avg 12 marks)"
- [ ] Subject page shows chapters sorted by weightage with visual bar indicating importance
- [ ] Pattern page (`/patterns/[board]/[subject]`) shows 5-year trend graph per topic
- [ ] Study recommendation: "Focus 60% of your time on these 3 high-weight chapters: [list]"

---

#### TASK-51 🟠

**Title:** Model Fallback Strategy for Cost & Reliability
**Phase:** 10 — Enhancements
**Priority:** High
**Depends on:** TASK-14
**Acceptance Criteria:**

- [ ] Three-tier model strategy: `mistral-tiny` for simple Q&A, `mistral-small` for standard tutoring, `mistral-medium` for complex explanations
- [ ] Query classification within 50ms: simple (<50 tokens, factual recall) vs. complex (multi-step reasoning)
- [ ] Automatic fallback chain with 3 retry attempts and exponential backoff
- [ ] Circuit breaker pattern: after 5 consecutive failures in 1 minute, switch to cached response mode
- [ ] Cost tracking per tier in `ai_usage_logs` with `modelTier` column

---

#### TASK-52 🟠

**Title:** Proactive Confusion Detection & Hints
**Phase:** 10 — Enhancements
**Priority:** High
**Depends on:** TASK-14
**Acceptance Criteria:**

- [ ] Pattern detection triggers: ≥3 consecutive user messages under 15 characters, ≥2 identical wrong answers, or off-topic keywords
- [ ] System injects proactive hint: "It looks like you're working through [topic]. Would you like me to break this down differently?"
- [ ] New `ai_conversation_events` table logs: `sessionId`, `eventType`, `metadata`
- [ ] Frontend shows subtle "Need a hint?" button that appears after confusion patterns detected
- [ ] Analytics dashboard shows confusion patterns by chapter for content improvement insights

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

### Phase 8 — Growth Features (Medium 🔵)

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
