# API Integration Notes

> Auto-generated audit of frontend-to-backend API surface for LearningoPK.
> Last updated: 2026-04-02

---

## 1. Frontend Page to API Endpoint Mapping

| Frontend Page | API Calls |
|---|---|
| `/` (landing) | None (static) |
| `/login` | `GET /api/auth/get-session` |
| `/register` | `GET /api/auth/get-session` |
| `/dashboard` | `GET /api/auth/get-session`, `GET /api/progress/dashboard`, `GET /api/forum/filters`, `GET /api/learn/:board/:grade/:subject` |
| `/dashboard/[subject]` | `GET /api/auth/get-session`, `GET /api/progress/dashboard/:boardSlug/:grade/:subjectSlug` |
| `/subjects` | `GET /api/auth/get-session`, `GET /api/forum/filters`, `GET /api/progress/dashboard` |
| `/[board]/[grade]/[subject]` | `GET /api/auth/get-session`, `GET /api/learn/:board/:grade/:subject` (client: `GET .../graph`) |
| `/[board]/[grade]/[subject]/[chapter]` | `GET /api/auth/get-session`, `GET /api/learn/:board/:grade/:subject/:chapter` (client: `POST /api/progress/events`, `POST /api/quiz/submit`, `POST /api/ai/chat`) |
| `/past-papers` | `GET /api/auth/get-session` (client: `GET /api/mock-exams/filters/options`, `GET /api/mock-exams/`, `GET /api/mock-exams/:id/attempts`) |
| `/past-papers/[id]/solutions` | `GET /api/auth/get-session` (client: `GET /api/mock-exams/:id`, `GET /api/mock-exams/:id/questions`) |
| `/forum` | `GET /api/auth/get-session`, `GET /api/forum/filters`, `GET /api/forum/threads` (client: `POST /api/forum/threads`) |
| `/forum/[threadId]` | `GET /api/auth/get-session`, `GET /api/forum/threads/:threadId` (client: `POST .../replies`, `POST .../vote`, `POST .../accept`) |
| `/ai-tutor` | `GET /api/auth/get-session` (client: `GET /api/ai/sessions`, `GET .../messages`, `POST /api/ai/chat`) |
| `/stats` | `GET /api/auth/get-session`, `GET /api/progress/dashboard` |
| `/settings` | `GET /api/auth/get-session` (client: `PUT /api/users/me/profile-image`) |
| `/admin` | `GET /api/auth/get-session`, `GET /api/admin/overview` |
| `/admin/content/*` | `GET /api/admin/content/curriculum-tree` + various CRUD endpoints |
| `/admin/users` | `GET /api/admin/users` |
| `/admin/moderation` | `GET /api/admin/moderation/flags` |
| `/admin/analytics` | `GET /api/admin/analytics/overview` |
| `/admin/audit` | `GET /api/admin/audit-logs` |

---

## 2. Type Mismatches (Bugs)

### BUG: Flashcard reorder field name mismatch

- **Frontend** (`admin-api.ts` `reorderAdminFlashcards`): sends `{ chapterId, flashcardIds }`
- **Backend** (`admin.ts` `flashcardReorderBodySchema`): expects `{ chapterId, orderedIds }`
- **Severity**: High - will cause 400 errors on flashcard reorder
- **Fix**: Rename `flashcardIds` to `orderedIds` in `admin-api.ts`

### WARN: Admin analytics grade enum mismatch

- **Frontend**: `adminAnalyticsSubjectPerformanceSchema` hardcodes `z.enum(["9", "10"])` for grade
- **Backend**: `subjects.grade` column is nullable
- **Severity**: Medium - Zod parse failure if null grade returned
- **Fix**: Change to `z.enum(["9", "10"]).nullable()` in `admin-api.ts`

### INFO: Missing `quiz_submit` event type on frontend

- **Backend** `progressEventSchema` supports: `chapter_visit`, `exercise_view`, `flashcard_complete`, `quiz_submit`
- **Frontend** `ProgressClientEvent` only defines 3 (missing `quiz_submit`)
- **Severity**: Low - quiz progress tracked via `POST /api/quiz/submit` instead

### INFO: Admin subject edit page says "API does not support updating subjects"

- But `PUT /api/admin/content/subjects/:id` DOES exist in backend
- **Fix**: Wire up the edit form to the existing endpoint

---

## 3. Shared Package Drift

The `packages/shared/` package defines Zod schemas and types meant to be shared, but **the backend does not import from it**. Instead, it re-declares identical schemas locally:

| Schema | Shared location | Backend duplicate |
|---|---|---|
| `progressEventSchema` | `packages/shared/src/types/progress.ts` | `backend/src/routes/progress.ts` |
| `submitQuizSchema` | `packages/shared/src/types/quiz.ts` | `backend/src/routes/quiz.ts` |
| `createThreadSchema` | `packages/shared/src/types/forum.ts` | `backend/src/routes/forum.ts` |
| `replySchema` | `packages/shared/src/types/forum.ts` | `backend/src/routes/forum.ts` |
| `boardGradeSubjectParamsSchema` | `packages/shared/src/types/route.ts` | various backend routes |

**Risk**: Any schema change must be made in two places. Drift has likely already occurred.

---

## 4. Orphan / Unused Endpoints

None. The previously-listed standalone `GET /api/boards|classes|institutes|subjects` routers were dead code and have been deleted (they were never mounted in `server.ts`).

---

## 5. Direct Fetch Calls (bypassing API client files)

These components call the backend directly instead of using `src/lib/*-api.ts`:

| Component | Direct fetch to |
|---|---|
| `ai-tutor-chat.tsx` | `/api/ai/sessions`, `/api/ai/sessions/:id/messages`, `/api/ai/chat` |
| `ai-chat-context.tsx` | `/api/ai/sessions/:id/messages` |
| `ai-chat-panel.tsx` | `/api/ai/chat` |
| `quiz-runner.tsx` | `/api/quiz/submit` |
| `quest-quiz-view.tsx` | `/api/quiz/submit` |
| `forum-thread-form.tsx` | `/api/forum/threads` |
| `forum-reply-form.tsx` | `/api/forum/threads/:id/replies` |
| `forum-reply-actions.tsx` | `/api/forum/replies/:id/vote`, `/api/forum/replies/:id/accept` |

Not a bug, but an inconsistency: some calls go through centralized API clients with Zod validation, others use inline `fetch()` without response validation.

---

## 6. Admin Placeholder Pages (No Real API Wiring)

These admin pages have placeholder UI with no functional API calls:

- `/admin/content/quizzes/add` - "Coming Soon"
- `/admin/content/quizzes/[id]/edit` - "Coming Soon"
- `/admin/content/flashcards/add` - "Coming Soon"
- `/admin/content/flashcards/[id]/edit` - "Coming Soon"

The backend CRUD endpoints for quizzes and flashcards DO exist and are fully implemented.
