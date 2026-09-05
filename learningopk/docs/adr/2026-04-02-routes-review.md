# Routes Review: LearningoPK Backend

**Date**: 2026-04-02
**Reviewer**: Code Review Agent
**Scope**: All Express route files, services, repositories, library helpers, and test files
**TypeScript Config**: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, ESM with `.js` extensions, `module: NodeNext`

---

## Executive Summary

The LearningoPK backend has **15 route files**, **4 services**, **4 repositories**, and **12 test files**. The codebase demonstrates solid fundamentals — Zod validation on all inputs, Drizzle ORM preventing SQL injection, and a clear service/repository layering for forum and quiz features.

However, this review identified **7 blockers**, **14 suggestions**, and **6 nits**. The most critical issues are: a route-ordering bug causing 100% failure of the mock-exam filters endpoint, fragile error handling via string matching in `quiz.ts`, pervasive type unsafety from `req as AuthenticatedRequest` casts, and the 5,371-line admin monolith that bypasses the service/repository architecture entirely.

### Issue Summary

| Priority      | Count | Category                                                                   |
| ------------- | ----- | -------------------------------------------------------------------------- |
| 🔴 Blocker    | 7     | Route ordering, type safety, missing error classes, response inconsistency |
| 🟡 Suggestion | 14    | Validation gaps, code duplication, missing tests, hardcoded values         |
| 💭 Nit        | 6     | Naming, style, minor improvements                                          |

---

## Per-File Findings

### `routes/mock-exams.ts` (314 lines)

#### 🔴 **Blocker: Route Ordering Bug — `/filters/options` Unreachable**

**Lines 72, 264**: The `/:id` route is registered at line 72, but `/filters/options` is registered at line 264. Express evaluates routes in registration order, so a `GET /filters/options` request will match `/:id` with `id = "filters"`.

**Why**: Express route parameters are greedy — `/:id` matches any single path segment. The specific static route must come first.

**Impact**: The `/filters/options` endpoint is completely unreachable. Any call will hit the `/:id` handler, which will attempt `parseInt("filters")` → `NaN`, then fail with a Zod validation error or return unexpected results.

**Fix**: Move the `/filters/options` route definition **before** the `/:id` route:

```typescript
// Register static routes FIRST
mockExamsRouter.get("/filters/options", async (_req, res) => { ... });

// Then parameterized routes
mockExamsRouter.get("/:id", async (req, res) => { ... });
mockExamsRouter.get("/:id/attempts", requireSession, async (req, res) => { ... });
mockExamsRouter.get("/:id/questions", requireSession, async (req, res) => { ... });
```

---

#### 🟡 **Suggestion: Hardcoded Year Validation Will Go Stale**

**Line 13**: `mockExamParamsSchema` uses `.max(2024)` for the year field.

**Why**: As new past papers are added for 2025, 2026, etc., this validation will reject valid data. Hardcoded temporal limits are a maintenance trap.

**Fix**: Use the current year or remove the upper bound:

```typescript
year: z.coerce.number().int().min(2000).max(new Date().getFullYear());
```

---

#### 🟡 **Suggestion: NaN Not Handled After parseInt Transform**

**Line 17**: `mockExamParamsSchema` uses `.transform()` to `parseInt` but doesn't validate the result is a valid number.

**Why**: `parseInt("abc")` returns `NaN`, which will pass through the transform without error, leading to downstream query failures.

**Fix**: Add a `.refine()` or use `z.coerce.number()` instead of manual `parseInt`:

```typescript
id: z.coerce.number().int().positive();
```

---

#### 🟡 **Suggestion: Ad-hoc Error Handling Pattern**

**Lines 34, 97, 148, 259**: All routes use `try/catch` → `console.error` → `res.status(500).json({ error: "..." })`. No structured error codes, no use of `errorResponse()` helper.

**Fix**: Adopt the `errorResponse()` helper from `lib/response.ts` and use structured error codes.

---

### `routes/quiz.ts` (57 lines)

#### 🔴 **Blocker: Fragile Error Handling via String Matching**

**Lines 35-48**: Error handling relies on matching error message strings:

```typescript
if (message === "Quiz not found") { res.status(404)... }
else if (message.includes("Answers include question IDs")) { res.status(400)... }
```

**Why**: If `quiz.service.ts` changes any error message wording, these checks silently break. The user would get a generic 500 instead of a proper 404 or 400. This is especially dangerous because there's no test covering these error paths.

**Fix**: Use typed error classes (like forum routes already do):

```typescript
// In quiz.service.ts
throw new NotFoundError("Quiz not found");
throw new ValidationError("Answers include question IDs not in this quiz");

// In quiz.ts
import { isHttpError } from "../lib/errors/index.js";
if (isHttpError(error)) {
  res.status(error.statusCode).json(errorResponse(error.message));
}
```

---

### `routes/forum.ts` (307 lines)

#### 🔴 **Blocker: `session.user` Type Mismatch**

**Line 111**: `viewerUserId: session?.user.id ?? null` — but `getSessionFromRequest` (in `lib/session.ts:61-66`) returns a type that doesn't expose `.user` as a direct property. The actual `better-auth` session structure differs from the typed return.

**Why**: Under `strict: true`, this will fail TypeScript compilation. Even if it works at runtime today, a better-auth upgrade could silently break it.

**Fix**: Align the `getSessionFromRequest` return type with the actual better-auth session shape, or add proper type narrowing:

```typescript
const session = await getSessionFromRequest(req);
const viewerUserId = session ? session.user.id : null;
// Ensure getSessionFromRequest's return type includes { user: { id: string } }
```

---

#### 👍 **Praise: Best Error Handling Pattern in Codebase**

Lines 173-307: Forum routes consistently use `isHttpError()` with typed error classes from `lib/errors/index.ts`, providing proper status codes and structured error responses. This should be the template for all other routes.

---

### `routes/progress.ts` (102 lines)

#### 🟡 **Suggestion: Indiscriminate 500 for All Errors**

**Lines 53-56, 73-76, 96-99**: Every catch block returns `{ error: message }` with status 500, regardless of whether the error is a client error (400/404) or a server error (500).

**Why**: A "user not found" error and a database connection failure both return 500, making debugging impossible and client-side error handling unreliable.

**Fix**: Use typed error classes and return appropriate status codes:

```typescript
catch (error) {
  if (isHttpError(error)) {
    res.status(error.statusCode).json(errorResponse(error.message));
  } else {
    res.status(500).json(errorResponse("Internal server error"));
  }
}
```

---

#### 🟡 **Suggestion: Hardcoded Grade Enum**

**Line 29**: `z.enum(["9", "10"])` — only grades 9 and 10 are accepted.

**Why**: If the curriculum expands to other grades (8, 11, 12), this validation must be manually updated.

**Fix**: Source valid grades from the database or a shared constants file.

---

### `routes/learn.ts` (162 lines)

#### 🟡 **Suggestion: Unsafe Property Access on Session**

**Lines 73-85**: Access control checks reference `authedReq.session.user.board` and `authedReq.session.user.class`, which may not exist on the `AuthenticatedRequest` session type.

**Why**: If the session type doesn't include `board` and `class` properties, this will either fail at compile time (good) or silently return `undefined` (bad), bypassing access control entirely.

**Fix**: Verify the session type includes these fields, or add explicit null checks:

```typescript
const userBoard = authedReq.session.user.board;
if (!userBoard) {
  // Handle missing board — either allow or deny
}
```

---

### `routes/ai-chat.ts` (416 lines)

#### 🟡 **Suggestion: Custom Error Handling Diverges from Patterns**

**Throughout**: Uses its own error handling patterns rather than `isHttpError()` or `errorResponse()`. Inconsistent with both the forum pattern and the simple try/catch pattern.

**Fix**: Align with the forum route pattern using `isHttpError()`.

---

### `routes/chapter-media.ts` (418 lines)

#### 🟡 **Suggestion: DELETE Endpoint Returns Inconsistent Shape**

**~Line 375**: The DELETE endpoint returns `{ success: true }` while all other endpoints in this file use `successResponse()` from `lib/response.ts`.

**Fix**: Use `successResponse({ deleted: true })` for consistency.

---

#### 👍 **Praise: Good Use of Response Helpers**

This file consistently uses `successResponse()` and `errorResponse()` for all other endpoints — the DELETE endpoint is the sole exception.

---

### `routes/profile.ts` (114 lines)

#### 🟡 **Suggestion: No Response Helpers Used**

**Lines 50, 65, 87, 104**: Returns raw `{ imageUrl: ... }` and `{ error: "..." }` shapes without using `successResponse()`/`errorResponse()`.

**Fix**: Adopt the standard response helpers for consistency with `chapter-media.ts` and `forum.ts`.

---

### `routes/health.ts` (28 lines)

#### 💭 **Nit: Custom Response Shape**

**Lines 8-27**: Returns `{ ok: true, postgres: "up", redis: "up" }`. This is fine for a health endpoint — health checks are often consumed by infrastructure tools that expect specific shapes. No change needed, but worth documenting the intentional divergence.

---

### `routes/boards.ts`, `routes/classes.ts`, `routes/subjects.ts`, `routes/institutes.ts` (24-25 lines each)

#### 🟡 **Suggestion: Identical Error Handling Pattern**

All four routes use the exact same `try/catch` → `console.error` → `res.status(500).json({ error: ... })` pattern without structured error codes.

**Fix**: Standardize on `errorResponse()` or create a shared middleware for these simple lookup routes.

---

### `routes/admin.ts` (5,371 lines)

#### 🔴 **Blocker: Monolithic File with No Service Layer**

**Entire file**: All admin business logic, database queries, audit logging, and response formatting are embedded directly in route handlers. This is the only route file that bypasses the service/repository pattern used by forum, quiz, and progress routes.

**Why this matters**:

1. **Untestable**: You cannot unit test admin business logic without spinning up an Express server
2. **Unreadable**: At 5,371 lines, navigating this file requires IDE search — no human can hold it in working memory
3. **Duplication-prone**: Helper functions like `persistAuditLog`, `listAuditLogs`, `listModerationFlags`, `listAdminUsers` are defined inline instead of in a shared service
4. **Inconsistent response shapes**: Some endpoints return `{ board: {...} }`, others `{ data: {...} }`, others `{ success: true, deletedId: N }`

**Fix**: Extract into modules:

```
routes/admin/
  index.ts          # Re-exports the combined router
  notifications.ts  # Admin notification CRUD
  settings.ts       # Admin settings CRUD
  moderation.ts     # Moderation flags
  users.ts          # User management
  content.ts        # Curriculum CRUD (boards, classes, subjects, chapters, exercises)
  quiz-crud.ts      # Admin quiz CRUD
  flashcards.ts     # Admin flashcard CRUD
  analytics.ts      # Overview + analytics
  audit-logs.ts     # Audit log read endpoints
  jobs.ts           # BullMQ job management
services/admin.service.ts  # Shared business logic
```

---

#### 🔴 **Blocker: Delete Operations Don't Cascade Safely**

**Lines 2769-2786 (delete board)**: The board delete transaction deletes `subjects` and `boardClasses` but does NOT delete `chapters`, `exercises`, `flashcards`, `quizzes`, `quizQuestions`, or `userProgress` that belong to those subjects. This could leave orphaned data or cause FK constraint violations.

**Lines 2971-2975 (delete class)**: Similarly deletes `subjects` and `boardClasses` but not downstream content.

**Lines 3284 (delete chapter)**: Deletes the chapter directly. If FK cascades aren't configured in the schema, exercises/flashcards/quizzes will be orphaned.

**Fix**: Verify FK `ON DELETE CASCADE` is configured in the schema for all dependent relationships. If not, add explicit cascading deletes in the transaction.

---

#### 🟡 **Suggestion: `POST` Used for Destructive Operations Instead of `DELETE`**

**Lines 2722, 2922, 3011, 3233, 3471, 3847, 4145, 4601**: All delete operations use `POST /.../:id/delete` instead of `DELETE /.../:id`. Similarly, updates use `POST /.../:id/update` instead of `PUT` or `PATCH`.

**Why**: This diverges from REST conventions, making the API harder to understand and preventing proper HTTP caching behavior.

**Fix**: While not a functional issue, consider migrating to proper HTTP methods when the API contract allows.

---

#### 🟡 **Suggestion: Inconsistent Response Shapes Across Admin Endpoints**

Examples of different shapes used within the same file:

- `{ board: { id, name, slug } }` (content CRUD)
- `{ data: updatedQuiz, created: false }` (quiz upsert)
- `{ success: true, deletedId: quiz.id }` (quiz delete)
- `{ data: newFlashcard }` (flashcard create)
- `{ exercises: exerciseRows }` (exercise list)
- `{ chapters: chapterRows }` (chapter list)
- `{ jobs: stats }` (job stats)

**Fix**: Standardize on a single shape: `{ data: T }` for single-entity responses, `{ data: T[], total: number }` for lists, `{ success: true }` for deletes. Or use `successResponse()`.

---

#### 🟡 **Suggestion: `console.error` in Quiz Question Validation**

**Line 4339**: `console.error("[quiz-questions POST] Validation failed:", { body: req.body, errors: ... })` — this logs the full request body to console, which could include sensitive data in production.

**Fix**: Remove the `console.error` or replace with structured logging that doesn't dump raw request bodies.

---

#### 💭 **Nit: Audit Log on Failed Validation**

Many admin endpoints call `persistAuditLog` with `status: "failed"` when a resource is not found. This is good for security tracking. However, some 404 paths log an audit entry while others don't — the inconsistency could cause blind spots.

---

### `routes/auth.ts` (8 lines)

#### 💭 **Nit: Minimal Proxy, No Documentation**

This file simply proxies all `/api/auth/*` requests to `better-auth`. This is fine but there's no inline documentation explaining the proxy pattern or what routes better-auth exposes.

---

## Cross-Cutting Issues

### 1. 🔴 Response Shape Inconsistency (Major)

**Affected files**: All route files except `forum.ts` and `chapter-media.ts`

The codebase has three competing response patterns:

| Pattern                                              | Used By                                                                  | Example                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `successResponse(data)` / `errorResponse(msg, code)` | `forum.ts`, `chapter-media.ts`                                           | `{ success: true, data: {...} }`                           |
| Raw JSON                                             | `quiz.ts`, `progress.ts`, `learn.ts`, `mock-exams.ts`, `boards.ts`, etc. | `{ threads: [...] }`, `{ error: "..." }`                   |
| Mixed admin shapes                                   | `admin.ts`                                                               | `{ board: {...} }`, `{ data: {...} }`, `{ success: true }` |

**Impact**: Frontend must handle multiple response shapes, and there's no single contract to type-check against.

**Recommendation**: Mandate `successResponse()`/`errorResponse()` for all routes. Create a shared `ApiResponse<T>` type:

```typescript
type ApiResponse<T> = { success: true; data: T } | { success: false; error: string; code?: string };
```

---

### 2. 🔴 Pervasive `req as AuthenticatedRequest` Casts

**Affected files**: `quiz.ts:27`, `forum.ts:173`, `progress.ts:45`, `learn.ts:71`, `ai-chat.ts:239`, `chapter-media.ts:63`, `profile.ts:26`, `admin.ts` (50+ occurrences)

**Why this is a problem**: The `requireSession` middleware attaches session data to `req`, but TypeScript doesn't know about it. The `as AuthenticatedRequest` cast is unsafe — it tells TypeScript to trust the programmer, but there's no runtime guarantee. If `requireSession` fails silently, the handler proceeds with an invalid cast.

**Fix**: Create a typed middleware that returns a narrowed request:

```typescript
function withAuth(handler: (req: AuthenticatedRequest, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    const session = await getSessionFromRequest(req);
    if (!session) {
      res.status(401).json(errorResponse("Unauthorized"));
      return;
    }
    (req as AuthenticatedRequest).session = session;
    await handler(req as AuthenticatedRequest, res);
  };
}
```

---

### 3. 🟡 Error Handling: Four Different Patterns

| Pattern                               | Used By                                        | Robustness                                |
| ------------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| `isHttpError()` + typed error classes | `forum.ts`                                     | ✅ Best — proper status codes, extensible |
| String matching on error messages     | `quiz.ts`                                      | ❌ Fragile — breaks on message changes    |
| Blanket `catch` → 500                 | `progress.ts`, `boards.ts`, `classes.ts`, etc. | ⚠️ Loses error specificity                |
| Custom per-route handling             | `ai-chat.ts`, `admin.ts`                       | ⚠️ Inconsistent, hard to maintain         |

**Recommendation**: Standardize on the forum pattern. Create a shared error-handling middleware:

```typescript
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (isHttpError(err)) {
    res.status(err.statusCode).json(errorResponse(err.message, err.code));
  } else {
    console.error("Unhandled error:", err);
    res.status(500).json(errorResponse("Internal server error"));
  }
});
```

---

### 4. 🟡 Missing `noUncheckedIndexedAccess` Safety in Admin Routes

**Affected**: `admin.ts` throughout — `const board = boardRows[0]` followed by null checks is correct, but several locations in services/repositories may not properly handle the `T | undefined` type that `noUncheckedIndexedAccess` requires.

**Specifically in tests**: `phase11-access-control.integration.test.ts` lines 38/39/47/62-63/103/267/270 use `const [board] = await db.insert(...)` which yields `T | undefined` under this config.

---

## Test Coverage Gaps

### Missing Unit Tests

| Component         | What's Missing                                                                                               | Priority  |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | --------- |
| `ForumService`    | No unit tests for any business logic — thread creation, reply creation, vote toggling, accept answer         | 🔴 High   |
| `QuizService`     | No unit tests for quiz fetching, answer validation, scoring logic                                            | 🔴 High   |
| `ProgressService` | No unit tests for progress recording, streak calculation, visit tracking                                     | 🔴 High   |
| `XpService`       | No unit tests for XP awarding, level calculation, streak freeze logic                                        | 🟡 Medium |
| Admin helpers     | No unit tests for `listAdminUsers`, `listModerationFlags`, `listAdminOverview`, `listAdminAnalyticsOverview` | 🟡 Medium |

### Missing Integration Tests

| Route                                                     | What's Missing                                                      | Priority  |
| --------------------------------------------------------- | ------------------------------------------------------------------- | --------- |
| `ai-chat.ts`                                              | No integration tests for any AI chat endpoint                       | 🟡 Medium |
| `profile.ts`                                              | No integration tests for image upload/retrieval                     | 🟡 Medium |
| `chapter-media.ts`                                        | No integration tests for presigned URL flow, media CRUD             | 🟡 Medium |
| `progress.ts`                                             | No integration tests for progress events, quiz completion recording | 🟡 Medium |
| `mock-exams.ts`                                           | No integration tests for filter options, question retrieval         | 🟡 Medium |
| `boards.ts`, `classes.ts`, `subjects.ts`, `institutes.ts` | No integration tests at all                                         | 💭 Low    |
| `health.ts`                                               | No tests for failure paths (Redis down, Postgres down)              | 💭 Low    |

### Existing Test Issues

#### `phase11-access-control.integration.test.ts` — TypeScript Errors

**Lines 38, 39, 47, 62-63, 103, 267, 270**: Array destructuring with `noUncheckedIndexedAccess`:

```typescript
// Current (TS error under noUncheckedIndexedAccess)
const [board] = await db.insert(boards).values({...}).returning();

// Fix: add non-null assertion or use index with null check
const boardRows = await db.insert(boards).values({...}).returning();
const board = boardRows[0];
if (!board) throw new Error("Setup failed: board not inserted");
```

#### `repository-methods.unit.test.ts` — Only Tests Method Existence

This test file only checks that repository methods exist as functions — it doesn't test any actual behavior. While method-existence tests have value as regression guards, they're not a substitute for behavioral tests.

#### Test Fixture Duplication

`createQuizFixture`, `createFlashcardFixture`, and `createMockExamFixture` across test files share ~80% identical code (board → class → subject → chapter creation). These should be extracted to a shared `tests/helpers/fixtures.ts`.

---

## Specific Recommendations

### Priority 1 — Fix Immediately

1. **Fix mock-exams route ordering**: Move `/filters/options` before `/:id` (5 min fix, 100% failure on that endpoint)
2. **Add `HttpError` import to `forum.repository.ts`**: Already flagged in code-quality review but bears repeating — runtime crash on vote/reply errors
3. **Fix `quiz.ts` error handling**: Replace string matching with typed error classes (30 min)
4. **Align `session.ts` return type**: Fix the type mismatch between `getSessionFromRequest` and `better-auth`'s actual session shape

### Priority 2 — This Sprint

5. **Standardize response shapes**: Mandate `successResponse()`/`errorResponse()` across all routes
6. **Create typed `withAuth` middleware**: Eliminate `req as AuthenticatedRequest` casts
7. **Extract admin.ts into modules**: Start with the lowest-risk sections (audit logs, jobs) and work toward content CRUD
8. **Fix test TS errors**: Update `phase11-access-control.integration.test.ts` for `noUncheckedIndexedAccess`
9. **Remove hardcoded year validation**: In `mock-exams.ts`, use `new Date().getFullYear()`
10. **Verify cascade deletes**: Ensure admin delete operations handle all downstream FK relationships

### Priority 3 — Next Sprint

11. **Add service-layer unit tests**: ForumService, QuizService, ProgressService
12. **Add integration tests**: AI chat, profile, chapter-media, mock-exam filters
13. **Extract shared test fixtures**: Create `tests/helpers/fixtures.ts`
14. **Standardize error handling middleware**: Single Express error handler for the entire app

---

## Summary Table

| File                      | Blockers                      | Suggestions | Nits  | Status                   |
| ------------------------- | ----------------------------- | ----------- | ----- | ------------------------ |
| `routes/mock-exams.ts`    | 1 (route ordering)            | 3           | 0     | ❌ Needs fix             |
| `routes/quiz.ts`          | 1 (string matching errors)    | 0           | 0     | ❌ Needs fix             |
| `routes/forum.ts`         | 1 (session type)              | 0           | 0     | ⚠️ Type fix needed       |
| `routes/admin.ts`         | 2 (monolith, cascade deletes) | 4           | 1     | ❌ Major refactor needed |
| `routes/progress.ts`      | 0                             | 2           | 0     | ⚠️ Improvements needed   |
| `routes/learn.ts`         | 0                             | 1           | 0     | ⚠️ Type safety check     |
| `routes/ai-chat.ts`       | 0                             | 1           | 0     | ⚠️ Error pattern         |
| `routes/chapter-media.ts` | 0                             | 1           | 0     | ✅ Good overall          |
| `routes/profile.ts`       | 0                             | 1           | 0     | ⚠️ Response helpers      |
| `routes/health.ts`        | 0                             | 0           | 1     | ✅ Fine as-is            |
| `routes/boards.ts` et al. | 0                             | 1 (shared)  | 0     | ⚠️ Error pattern         |
| `routes/auth.ts`          | 0                             | 0           | 1     | ✅ Fine as-is            |
| Cross-cutting             | 2                             | 2           | 0     | —                        |
| Tests                     | 0                             | 0           | 3     | ⚠️ Coverage gaps         |
| **Total**                 | **7**                         | **14**      | **6** | —                        |
