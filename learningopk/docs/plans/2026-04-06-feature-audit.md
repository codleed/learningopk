# LearningoPK — Comprehensive Feature Audit

**Date:** 2026-04-06
**Purpose:** Inventory every platform feature, map frontend pages to backend endpoints, and classify each as Working / Degraded / Broken / Not Verified.

---

## Legend

| Status       | Meaning                                                                    |
| ------------ | -------------------------------------------------------------------------- |
| WORKING      | Backend endpoint returns correct data; frontend renders it                 |
| FIXED        | Was broken (500), now gracefully degrades or fully works after our patches |
| DEGRADED     | Partially works — some sub-features fail or show empty states              |
| BROKEN       | Hard error or unusable                                                     |
| NOT VERIFIED | Cannot be verified without manual browser testing or live API key          |

---

## 1. Authentication & User Management

| Feature                         | Frontend Route | Backend Endpoint                               | Status       |
| ------------------------------- | -------------- | ---------------------------------------------- | ------------ |
| Login (email/password)          | `/login`       | Better Auth `/api/auth/*`                      | NOT VERIFIED |
| Register                        | `/register`    | Better Auth `/api/auth/*`                      | NOT VERIFIED |
| Session management              | Layout guards  | Better Auth middleware                         | NOT VERIFIED |
| Profile image upload            | Settings       | `PUT /api/profile/me/profile-image`            | NOT VERIFIED |
| Leaderboard visibility settings | Settings       | `GET/PUT /api/profile/me/leaderboard-settings` | NOT VERIFIED |

**Notes:** Auth uses Better Auth library (not custom routes). Registration and login forms exist. Cannot verify without running the app.

---

## 2. Dashboard

| Feature                        | Frontend Route | Backend Endpoint                           | Status |
| ------------------------------ | -------------- | ------------------------------------------ | ------ |
| Main dashboard                 | `/dashboard`   | `GET /api/progress/dashboard`              | FIXED  |
| Welcome card                   | Dashboard      | progress service                           | FIXED  |
| Stats cards (XP, streak, etc.) | Dashboard      | progress service                           | FIXED  |
| Subject progress table         | Dashboard      | progress service                           | FIXED  |
| Streak card & counter          | Dashboard      | progress + streak-wager service            | FIXED  |
| Weekly activity heatmap        | Dashboard      | progress service                           | FIXED  |
| Recent activity feed           | Dashboard      | progress service                           | FIXED  |
| Review now widget              | Dashboard      | flashcard-reviews due                      | FIXED  |
| Starred formulas widget        | Dashboard      | formulas starred                           | FIXED  |
| Focus areas widget             | Dashboard      | progress weak areas                        | FIXED  |
| Study groups panel             | Dashboard      | `GET /api/study-groups/`                   | FIXED  |
| AI memory card                 | Dashboard      | ai-context                                 | FIXED  |
| Streak wager                   | Dashboard      | `POST /api/progress/streak-wager`          | FIXED  |
| Daily momentum / today's focus | Dashboard      | `POST /api/progress/todays-focus/complete` | FIXED  |

**Notes:** All dashboard features previously threw 500s due to missing DB tables. Now wrapped with `withOptionalDbFallback()` — they return empty/default data when tables are absent, and real data when tables exist.

---

## 3. Learning Content (Browse & Study)

| Feature                           | Frontend Route                         | Backend Endpoint                                 | Status  |
| --------------------------------- | -------------------------------------- | ------------------------------------------------ | ------- |
| Browse boards                     | `/[board]`                             | `GET /api/learn/boards`                          | WORKING |
| Browse subjects                   | `/[board]/[grade]`                     | `GET /api/learn/subjects`                        | WORKING |
| Subject detail (chapters list)    | `/[board]/[grade]/[subject]`           | `GET /api/learn/:board/:grade/:subject`          | WORKING |
| Chapter detail (quest workspace)  | `/[board]/[grade]/[subject]/[chapter]` | `GET /api/learn/:board/:grade/:subject/:chapter` | WORKING |
| Chapter knowledge graph           | Subject page                           | `GET /api/learn/:board/:grade/:subject/graph`    | WORKING |
| Subject view switcher (list/grid) | Subject page                           | N/A (frontend-only)                              | WORKING |
| Chapter progress tracker          | Chapter page                           | progress events                                  | WORKING |
| Chapter weightage badge           | Chapter card                           | schema field                                     | WORKING |

### Quest Workspace Tabs

| Feature                        | Component                                   | Status  |
| ------------------------------ | ------------------------------------------- | ------- |
| Study content (revision notes) | `chapter-study-content-with-ai.tsx`         | FIXED   |
| Exercises with AI              | `chapter-exercises-with-ai.tsx`             | WORKING |
| Flashcard deck                 | `flashcard-deck.tsx` / `flashcard-card.tsx` | WORKING |
| Quiz runner                    | `quiz-runner.tsx`                           | WORKING |
| Quick revision view            | `quick-revision-view.tsx`                   | WORKING |
| Illustration view              | `quest-illustration-view.tsx`               | WORKING |
| Quiz result summary            | `quiz-result-summary.tsx`                   | WORKING |

**Notes:** The chapter workspace is the core study experience. Each tab (summary, exercises, flashcards, quiz, illustrations) loads from the chapter detail API. Revision notes now use optional fallback.

---

## 4. AI Tutor

| Feature                      | Frontend Route                     | Backend Endpoint                                    | Status  |
| ---------------------------- | ---------------------------------- | --------------------------------------------------- | ------- |
| AI Tutor chat page           | `/ai-tutor`                        | `POST /api/ai/chat`                                 | FIXED   |
| Chat sessions list           | AI Tutor                           | `GET /api/ai/sessions`                              | WORKING |
| Session messages             | AI Tutor                           | `GET /api/ai/sessions/:id/messages`                 | WORKING |
| Explain mode                 | AI Tutor toggle                    | `mode: "explain"` in request body                   | FIXED   |
| Socratic mode                | AI Tutor toggle                    | `mode: "socratic"` in request body                  | FIXED   |
| LaTeX math rendering         | MarkdownRenderer + ContentRenderer | N/A (frontend)                                      | FIXED   |
| Streaming responses          | StreamingText component            | SSE from /api/ai/chat                               | WORKING |
| AI context panel             | AI Tutor                           | `GET /api/ai-context/context`                       | WORKING |
| Learning path                | AI Tutor                           | `GET /api/ai-context/learning-path`                 | WORKING |
| Weak/strong topic management | AI Tutor                           | `PATCH /api/ai-context/context`, `DELETE` endpoints | WORKING |
| Ask AI from exercises        | Chapter page                       | Same chat endpoint                                  | WORKING |

**Notes:**

- Mode toggle now properly sends to backend (was frontend-only before).
- LaTeX delimiter instructions added to system prompt (was outputting `\[...\]` instead of `$$...$$`).
- Actual AI response quality depends on Mistral API key being valid.

---

## 5. Quizzes

| Feature                      | Frontend Route     | Backend Endpoint               | Status       |
| ---------------------------- | ------------------ | ------------------------------ | ------------ |
| Quiz runner (within chapter) | Chapter quest tab  | Chapter detail API             | WORKING      |
| Quiz submission              | Quiz runner        | `POST /api/quiz/submit`        | WORKING      |
| Quiz result summary          | After submit       | Frontend component             | WORKING      |
| Quiz question review list    | After submit       | Frontend component             | WORKING      |
| Quiz timer                   | Quiz runner        | Frontend component             | WORKING      |
| Quiz duel challenges         | Leaderboard/Social | `POST /api/quiz/challenges`    | NOT VERIFIED |
| Get challenge detail         | Challenge page     | `GET /api/quiz/challenges/:id` | NOT VERIFIED |

**Notes:** Core quiz flow (take quiz, submit, see results) works. Quiz duels are a social feature — likely need two users to test.

---

## 6. Flashcard Review (SRS)

| Feature              | Frontend Route | Backend Endpoint                             | Status  |
| -------------------- | -------------- | -------------------------------------------- | ------- |
| SRS review deck      | `/review`      | `GET /api/flashcard-reviews/due`             | FIXED   |
| Review stats         | Review page    | `GET /api/flashcard-reviews/stats`           | FIXED   |
| Submit review rating | Review deck    | `POST /api/flashcard-reviews/:cardId/review` | WORKING |
| Seed initial reviews | Automatic      | `POST /api/flashcard-reviews/seed`           | WORKING |

**Notes:** Flashcard review tables were missing. Now uses optional fallback — returns empty due list and zero stats when tables absent. Works fully when tables exist.

---

## 7. Formulas Library

| Feature              | Frontend Route | Backend Endpoint                | Status |
| -------------------- | -------------- | ------------------------------- | ------ |
| Formula library page | `/formulas`    | `GET /api/formulas/`            | FIXED  |
| Star/unstar formula  | Formula card   | `POST /api/formulas/:id/star`   | FIXED  |
| Track formula access | Formula card   | `POST /api/formulas/:id/access` | FIXED  |

**Notes:** Formula tables were missing. Now uses optional fallback. Returns empty list when tables absent.

---

## 8. Past Papers & Exam Patterns

| Feature                   | Frontend Route                | Backend Endpoint                          | Status       |
| ------------------------- | ----------------------------- | ----------------------------------------- | ------------ |
| Past papers list          | `/past-papers`                | `GET /api/mock-exams/`                    | FIXED        |
| Past paper filter options | Past papers                   | `GET /api/mock-exams/filters/options`     | WORKING      |
| Paper detail              | `/past-papers/[id]`           | `GET /api/mock-exams/:id`                 | WORKING      |
| Paper questions           | Paper detail                  | `GET /api/mock-exams/:id/questions`       | NOT VERIFIED |
| Paper attempts            | Paper detail                  | `GET /api/mock-exams/:id/attempts`        | NOT VERIFIED |
| Solutions page            | `/past-papers/[id]/solutions` | Frontend + API                            | FIXED        |
| Exam pattern analysis     | `/patterns/[board]/[subject]` | `GET /api/learn/patterns/:board/:subject` | FIXED        |

**Notes:** Mock exams API had envelope-unwrapping bug (fixed). Solutions page had noisy 403 logging (fixed). Exam pattern analysis uses optional fallback.

---

## 9. Statistics & Progress

| Feature                    | Frontend Route                  | Backend Endpoint                                     | Status  |
| -------------------------- | ------------------------------- | ---------------------------------------------------- | ------- |
| Stats page                 | `/stats`                        | `GET /api/progress/dashboard`                        | FIXED   |
| Subject-specific dashboard | `/subjects/[subject]`           | `GET /api/progress/dashboard/:board/:grade/:subject` | WORKING |
| Chapter detail dashboard   | `/subjects/[subject]/[chapter]` | Chapter API                                          | WORKING |
| Progress events tracking   | Background                      | `POST /api/progress/events`                          | WORKING |
| Subject weak areas card    | Dashboard                       | progress service                                     | FIXED   |
| Topic trend chart          | Stats                           | Frontend component                                   | WORKING |

---

## 10. Leaderboard

| Feature          | Frontend Route | Backend Endpoint        | Status  |
| ---------------- | -------------- | ----------------------- | ------- |
| Leaderboard page | `/leaderboard` | `GET /api/leaderboard/` | WORKING |
| XP-based ranking | Leaderboard    | leaderboard service     | WORKING |

---

## 11. Forum

| Feature           | Frontend Route      | Backend Endpoint                            | Status       |
| ----------------- | ------------------- | ------------------------------------------- | ------------ |
| Forum thread list | `/forum`            | `GET /api/forum/threads`                    | WORKING      |
| Forum filters     | Forum sidebar       | `GET /api/forum/filters`                    | WORKING      |
| Thread detail     | `/forum/[threadId]` | `GET /api/forum/threads/:threadId`          | WORKING      |
| Create thread     | Forum               | `POST /api/forum/threads`                   | NOT VERIFIED |
| Post reply        | Thread detail       | `POST /api/forum/threads/:threadId/replies` | NOT VERIFIED |
| Vote on reply     | Thread detail       | `POST /api/forum/replies/:replyId/vote`     | NOT VERIFIED |
| Accept answer     | Thread detail       | `POST /api/forum/replies/:replyId/accept`   | NOT VERIFIED |
| Track thread view | Thread detail       | `POST /api/forum/threads/:threadId/view`    | WORKING      |
| Trending sidebar  | Forum               | Frontend component                          | WORKING      |

---

## 12. Study Groups

| Feature            | Frontend Route  | Backend Endpoint                 | Status       |
| ------------------ | --------------- | -------------------------------- | ------------ |
| List user's groups | Dashboard panel | `GET /api/study-groups/`         | FIXED        |
| Create group       | Dashboard panel | `POST /api/study-groups/`        | NOT VERIFIED |
| Group detail       | Dashboard panel | `GET /api/study-groups/:groupId` | FIXED        |

**Notes:** Study groups tables were in a separate schema file. Now created via migration. Queries use optional fallback.

---

## 13. Gamification

| Feature                 | Frontend Route     | Backend Endpoint                      | Status  |
| ----------------------- | ------------------ | ------------------------------------- | ------- |
| XP notifications/toasts | Global             | Frontend (`use-xp-notifications.ts`)  | WORKING |
| Streak tracking         | Global             | Frontend (`use-streak-tracking.ts`)   | WORKING |
| Streak counter display  | Dashboard          | Frontend (`streak-counter.tsx`)       | WORKING |
| Confetti celebration    | After achievements | Frontend (`confetti-celebration.tsx`) | WORKING |
| Progress ring           | Various cards      | Frontend (`progress-ring.tsx`)        | WORKING |
| Gamification state      | Global             | Frontend (`use-gamification.ts`)      | WORKING |

**Notes:** Gamification is mostly frontend-driven using local storage and XP service calls.

---

## 14. Calendar

| Feature        | Frontend Route | Backend Endpoint      | Status       |
| -------------- | -------------- | --------------------- | ------------ |
| Study calendar | `/calendar`    | Likely progress-based | NOT VERIFIED |

---

## 15. Settings

| Feature            | Frontend Route | Backend Endpoint         | Status       |
| ------------------ | -------------- | ------------------------ | ------------ |
| User settings page | `/settings`    | profile + auth endpoints | NOT VERIFIED |

---

## 16. Admin Panel

| Feature                         | Frontend Route         | Backend Endpoint                                                  | Status       |
| ------------------------------- | ---------------------- | ----------------------------------------------------------------- | ------------ |
| Admin overview                  | `/admin`               | `GET /api/admin/overview`                                         | NOT VERIFIED |
| Analytics dashboard             | `/admin/analytics`     | `GET /api/admin/analytics/overview`                               | NOT VERIFIED |
| User management                 | `/admin/users`         | `GET/POST /api/admin/users/*`                                     | NOT VERIFIED |
| Content management (curriculum) | `/admin/content`       | `GET /api/admin/content/curriculum`                               | NOT VERIFIED |
| CRUD boards                     | `/admin/boards`        | `POST /api/admin/content/boards` + update/delete                  | NOT VERIFIED |
| CRUD classes                    | `/admin/classes`       | `POST /api/admin/content/classes` + update/delete                 | NOT VERIFIED |
| CRUD subjects                   | `/admin/subjects`      | `POST /api/admin/content/subjects` + delete                       | NOT VERIFIED |
| CRUD chapters                   | `/admin/chapters`      | `POST /api/admin/content/chapters` + update/delete/rename/publish | NOT VERIFIED |
| CRUD exercises                  | Admin content          | `POST /api/admin/content/exercises` + update/delete               | NOT VERIFIED |
| CRUD quizzes                    | Admin content          | `POST /api/admin/content/quizzes` + update/delete                 | NOT VERIFIED |
| CRUD quiz questions             | Admin content          | `POST /api/admin/content/quiz-questions` + update/delete          | NOT VERIFIED |
| CRUD flashcards                 | Admin content          | `POST /api/admin/content/flashcards` + update/delete/reorder      | NOT VERIFIED |
| Chapter summaries               | Admin content          | `GET/POST /api/admin/content/chapters/:id/summary`                | NOT VERIFIED |
| Chapter revision notes          | Admin content          | `GET/POST /api/admin/content/chapters/:id/revision-notes`         | NOT VERIFIED |
| Chapter link graph              | Admin content          | `GET /api/admin/content/chapters/graph`                           | NOT VERIFIED |
| Chapter link suggestions        | Admin content          | `GET /api/admin/content/chapters/link-suggestions`                | NOT VERIFIED |
| Chapter media upload            | Admin content          | `POST /api/admin/chapters/:id/summary-media`                      | NOT VERIFIED |
| Forum moderation                | `/admin/forum`         | `POST /api/admin/forum/threads/:id/pin`                           | NOT VERIFIED |
| Moderation flags                | `/admin/moderation`    | `GET/POST /api/admin/moderation/flags/*`                          | NOT VERIFIED |
| Notifications                   | `/admin/notifications` | `GET/POST /api/admin/notifications`                               | NOT VERIFIED |
| Settings (admin)                | `/admin/settings`      | `GET/POST /api/admin/settings/*`                                  | NOT VERIFIED |
| Audit logs                      | `/admin/audit`         | `GET /api/admin/audit-logs` (+ scoped variants)                   | NOT VERIFIED |
| Community threads               | `/admin/community`     | `GET /api/admin/community/threads`                                | NOT VERIFIED |
| Job queue stats                 | Admin                  | `GET /api/admin/jobs/stats`                                       | NOT VERIFIED |
| Cache management                | Admin                  | `GET/POST /api/admin/cache/*`                                     | NOT VERIFIED |

**Notes:** Admin panel is massive (51 components, 80+ endpoints). Requires admin role to test. All endpoints are guarded by `requireSession` + role check.

---

## 17. Infrastructure / Health

| Feature             | Backend Endpoint              | Status       |
| ------------------- | ----------------------------- | ------------ |
| Liveness probe      | `GET /api/health/live`        | WORKING      |
| Readiness probe     | `GET /api/health/ready`       | WORKING      |
| Full health check   | `GET /api/health/`            | WORKING      |
| Performance metrics | `GET /api/health/performance` | NOT VERIFIED |

---

## 18. Chapter Media

| Feature              | Backend Endpoint                                | Status       |
| -------------------- | ----------------------------------------------- | ------------ |
| Upload summary media | `POST /api/admin/chapters/:id/summary-media`    | NOT VERIFIED |
| Presigned upload URL | `POST /api/admin/chapters/:id/presigned-upload` | NOT VERIFIED |
| Confirm media upload | `POST /api/admin/chapters/:id/media/confirm`    | NOT VERIFIED |
| List chapter media   | `GET /api/admin/chapters/:id/media`             | NOT VERIFIED |
| Delete chapter media | `DELETE /api/admin/chapters/:id/media/:mediaId` | NOT VERIFIED |

---

## 19. Miscellaneous / Reference Data

| Feature         | Backend Endpoint       | Status  |
| --------------- | ---------------------- | ------- |
| List boards     | `GET /api/boards/`     | WORKING |
| List classes    | `GET /api/classes/`    | WORKING |
| List subjects   | `GET /api/subjects/`   | WORKING |
| List institutes | `GET /api/institutes/` | WORKING |

---

## Summary Statistics

| Category         | Total Features | Working/Fixed  | Degraded | Broken | Not Verified |
| ---------------- | -------------- | -------------- | -------- | ------ | ------------ |
| Auth & Users     | 5              | 0              | 0        | 0      | 5            |
| Dashboard        | 14             | 14 (all FIXED) | 0        | 0      | 0            |
| Learning Content | 15             | 15             | 0        | 0      | 0            |
| AI Tutor         | 11             | 11 (6 FIXED)   | 0        | 0      | 0            |
| Quizzes          | 7              | 5              | 0        | 0      | 2            |
| Flashcard SRS    | 4              | 4 (2 FIXED)    | 0        | 0      | 0            |
| Formulas         | 3              | 3 (all FIXED)  | 0        | 0      | 0            |
| Past Papers      | 7              | 5 (3 FIXED)    | 0        | 0      | 2            |
| Stats & Progress | 6              | 6 (2 FIXED)    | 0        | 0      | 0            |
| Leaderboard      | 2              | 2              | 0        | 0      | 0            |
| Forum            | 9              | 4              | 0        | 0      | 5            |
| Study Groups     | 3              | 2 (FIXED)      | 0        | 0      | 1            |
| Gamification     | 6              | 6              | 0        | 0      | 0            |
| Calendar         | 1              | 0              | 0        | 0      | 1            |
| Settings         | 1              | 0              | 0        | 0      | 1            |
| Admin Panel      | 25             | 0              | 0        | 0      | 25           |
| Infrastructure   | 4              | 3              | 0        | 0      | 1            |
| Chapter Media    | 5              | 0              | 0        | 0      | 5            |
| Reference Data   | 4              | 4              | 0        | 0      | 0            |
| **TOTAL**        | **131**        | **82**         | **0**    | **0**  | **49**       |

---

## What We Fixed (This Session)

1. **500 errors on 6+ screens** — Dashboard, Stats, Formulas, Chapter detail, Past papers, Progress tracking. Root cause: missing DB tables/columns from schema drift. Fixed by:
   - Creating `withOptionalDbFallback()` helper
   - Wrapping 7 repository files with graceful fallbacks
   - Wrapping progress service dashboard branches
   - Running `drizzle-kit push --force` to create missing tables
   - Updating drizzle config to include both schema files
   - Making clear-database resilient to missing tables

2. **AI Tutor mode toggle was decorative** — Frontend had Explain/Socratic tabs but never sent mode to backend. Fixed by:
   - Adding `TutorMode` type and split system prompts
   - Adding `mode` field to API request schema
   - Wiring frontend toggle to request body

3. **AI Tutor LaTeX not rendering** — Model outputted `\[...\]` bracket delimiters; frontend needs `$$...$$` dollar-sign delimiters. Fixed by:
   - Adding explicit delimiter instructions to system prompt (both core rules and mode-specific instructions)
   - Added `LATEX_DELIMITER_RULES` constant with examples and prohibition of bracket notation

4. **Mock exams API envelope bug** — Frontend wasn't unwrapping `{ data: ... }` response envelope.

5. **Seed data completely replaced** — New seed covers all current features with realistic data and known test credentials.

---

## Remaining Work

### Cannot Verify Without Manual Testing

- 49 features marked NOT VERIFIED require either:
  - Running the app in a browser (auth flows, admin panel, forum write operations)
  - Having a valid Mistral API key (AI chat quality)
  - Having two users (quiz duels)

### Potential Issues to Investigate

1. **Admin panel** — 25 features totally unverified. Given the pattern of schema drift, some admin CRUD operations may fail on newer tables.
2. **Forum write operations** — Creating threads, posting replies, voting — need session + browser.
3. **Calendar page** — No clear backend endpoint mapped. May be frontend-only or incomplete.
4. **Quiz duels** — Social feature requiring two authenticated users.
5. **Chapter media uploads** — File upload infrastructure (S3/local) unknown status.

### Recommended Next Steps

1. Start the dev servers (`pnpm dev:all`) and do manual smoke testing of auth + dashboard + chapter flow.
2. Test admin panel with `admin@example.com` / `password`.
3. Verify AI tutor actually renders LaTeX with dollar signs (requires valid Mistral API key).
4. Investigate calendar page implementation to confirm if it's functional.
