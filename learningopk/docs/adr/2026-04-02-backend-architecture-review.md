# ADR: Backend Architecture Review - LearningoPK

## Status

Accepted

## Context

Comprehensive review of the LearningoPK backend codebase (Express.js + Drizzle ORM + PostgreSQL + Redis + BullMQ) covering:

- Route architecture (11 route files, including a 5,371-line admin monolith)
- Service layer (4 services)
- Repository layer (4 repositories)
- Database schema (513 lines, 30+ tables)
- Authentication/authorization (Better-Auth)
- Workers (3 BullMQ workers)
- Object storage (MinIO)
- Caching (Redis)
- Configuration management

---

## Findings

### Critical Priority

#### 1. Pre-existing TypeScript Errors (Data Loss Risk)

**File:** `src/lib/session.ts:66`

```typescript
// Type mismatch in getSessionFromRequest return type
// Session type doesn't match what better-auth expects
```

**Severity:** HIGH - Authentication may fail unexpectedly

**File:** `src/repositories/forum.repository.ts:252,274,278`

```typescript
// HttpError used but not imported
throw new HttpError(500, "Unable to update vote.");
throw new HttpError(404, "Reply not found.");
throw new HttpError(403, "Only the thread author can mark an accepted answer.");
```

**Severity:** HIGH - Runtime crashes when vote/reply errors occur

**File:** `src/services/forum.service.ts:240,264`

```typescript
// ModerationError used but not imported
throw new ModerationError("Forum content blocked by safety checks.", moderation.reason);
```

**Severity:** HIGH - Forum creation/reply crashes on content moderation

**File:** `src/routes/forum.ts:111`

```typescript
// Property 'user' does not exist on session type
viewerUserId: session?.user.id ?? null,
```

**Severity:** MEDIUM - Session data access fails

---

#### 2. Eager Worker Startup at Import Time

**File:** `server.ts:21-23`

```typescript
createAnalyticsWorker();
createEmailWorker();
createCleanupWorker();
```

**Problem:** Workers are instantiated when the module is imported, not when the app starts. This causes:

- Workers attempt Redis connections during `pnpm build` (type checking)
- No graceful startup/shutdown handling
- Impossible to disable workers for specific deployment modes

**Severity:** HIGH - Side effects during build, connection issues

---

#### 3. Forum Repository Throws Undefined Errors

**File:** `src/repositories/forum.repository.ts:252,274,278`

```typescript
// Uses HttpError but import is missing
throw new HttpError(500, "Unable to update vote.");
```

**Severity:** HIGH - Runtime crashes

---

### High Priority

#### 4. 5,371-Line Admin Route Monolith

**File:** `routes/admin.ts`
**Problem:** Single file contains 100+ endpoints across these domains:

- `/admin/notifications` (2 endpoints)
- `/admin/settings` (2 endpoints)
- `/admin/moderation/*` (2 endpoints)
- `/admin/users/*` (3 endpoints)
- `/admin/community/*` (1 endpoint)
- `/admin/overview` (1 endpoint)
- `/admin/analytics/*` (1 endpoint)
- `/admin/content/curriculum` (tree structure)
- `/admin/content/boards/*` (CRUD)
- `/admin/content/classes/*` (CRUD)
- `/admin/content/subjects/*` (CRUD)
- `/admin/content/chapters/*` (CRUD + publish/rename/summary/links)
- `/admin/content/exercises/*` (CRUD)
- `/admin/content/quizzes/*` (CRUD + upsert pattern)
- `/admin/content/flashcards/*` (CRUD + reorder)
- `/admin/content/quiz-questions/*` (CRUD)
- `/admin/forum/threads/*` (pin)
- `/admin/audit-logs/*` (7 scope-specific endpoints + 1 aggregated)
- `/admin/jobs/*` (stats + retry)

**Impact:**

- Merge conflicts in version control
- Cognitive overload for developers
- No clear ownership boundaries
- Massive file causes editor lag

**Severity:** HIGH - Maintainability and collaboration blocker

---

#### 5. Inconsistent Response Shapes

**File:** `routes/forum.ts:190-195`

```typescript
// Uses successResponse wrapper
res.status(201).json(successResponse({ thread: {...} }));

// But line 94-96 doesn't:
res.status(200).json({ threads: threadRows });

// And line 157-163 doesn't either:
res.status(200).json({ thread: {...} });
```

**File:** `routes/admin.ts` - Inconsistent patterns:

- Line 1259-1265: `{ entries, total, page, pageSize, hasMore }` (no wrapper)
- Line 2590-2600: `{ notification: {...} }` (no wrapper)
- Line 2590-2600: `{ success: true }` (no wrapper)

**File:** `lib/response.ts:88-89`

```typescript
// Recommended: Add to all route handlers
// Current Inconsistency: Some return directly, some wrap in { data }
```

**Severity:** HIGH - API inconsistency confuses frontend, debugging harder

---

#### 6. Missing Admin Role Authorization Pattern

**File:** `routes/chapter-media.ts:63-65`

```typescript
if (!(await requireAdminRole(authedReq, res))) {
  return;
}
```

**Problem:** `requireSession` is called first but doesn't check admin role. The pattern is duplicated on every admin endpoint.

**Contrast with `lib/session.ts:41-46`:**

```typescript
if (user.status === "suspended") {
  res.status(403).json({ error: "Account suspended", code: "ACCOUNT_SUSPENDED" });
  return;
}
```

Suspension check is in `requireSession`, but admin check requires separate middleware call.

**Severity:** MEDIUM - Authorization logic scattered

---

#### 7. BullMQ Worker Implementations Are Stubs

**File:** `jobs/analytics.ts`

```typescript
export async function processDailyAnalytics(job: AnalyticsJob): Promise<void> {
  const data = job.data as DailyAnalyticsJobData;
  console.log(`Processing daily analytics for ${data.date}`);
  await job.updateProgress(10);
  await job.updateProgress(100);
  // NO ACTUAL IMPLEMENTATION
}
```

**File:** `jobs/email.ts`

```typescript
export async function processEmailJob(job: EmailJob): Promise<void> {
  console.log(`Processing email job: ${data.type} for ${data.email}`);
  // NO ACTUAL IMPLEMENTATION
}
```

**Problem:** Workers are registered but do nothing useful. Analytics and email jobs are placeholder code.

**Severity:** HIGH - Features don't work, dead code

---

#### 8. Blocking Redis KEYS Command in Cleanup

**File:** `jobs/cleanup.ts:10`

```typescript
const keys = await redis.keys("session:*");
```

**Problem:** `KEYS` is O(N) and blocks the Redis server. With many sessions, this freezes Redis for all other operations.

**Severity:** HIGH - Production Redis freeze risk

---

#### 9. ModerationError Not Imported

**File:** `services/forum.service.ts:240,264`

```typescript
// ModerationError used but NOT IMPORTED
throw new ModerationError("Forum content blocked by safety checks.", moderation.reason);
```

**Impact:** Forum thread/reply creation crashes on content moderation

**Severity:** HIGH - Runtime crash

---

### Medium Priority

#### 10. Database Schema Issues

**File:** `lib/db/schema.ts`

**Issue A - Missing Index on forumReplies.threadId:**

```typescript
// Line 380-394
export const forumReplies = pgTable("forum_replies", {
  id: uuid("id").defaultRandom().primaryKey(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => forumThreads.id, { onDelete: "cascade" }),
  // No index on threadId for efficient "find replies by thread"
});
```

**Impact:** Finding replies for a thread does a full table scan

**Issue B - Missing Index on userProgress.userId:**

```typescript
// Line 473-490
export const userProgress = pgTable("user_progress", {
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  chapterId: integer("chapter_id")
    .notNull()
    .references(() => chapters.id, { onDelete: "cascade" }),
  // uniqueIndex on (userId, chapterId) exists, but no index on userId alone
});
```

**Impact:** Dashboard queries that filter by userId need to scan

**Issue C - Potential Circular Cascade Delete:**

```typescript
// sessions.userId -> users.id (cascade)
// accounts.userId -> users.id (cascade)
// verifications references users (no FK)
// forumThreads.userId -> users.id (cascade)
// forumReplies.userId -> users.id (cascade)
// quizAttempts.userId -> users.id (cascade)
// userProgress.userId -> users.id (cascade)
```

When admin deletes a user, cascade deletes are deep. No concern here, but worth monitoring.

**Severity:** MEDIUM - Performance degradation over time

---

#### 11. Duplicate DB Queries in Quiz Flow

**File:** `services/quiz.service.ts:106`

```typescript
const questionRows = await this.getQuizQuestions(quizId);
```

**Problem:** `getQuizQuestions` calls `quizRepository.findQuestionsByQuizId`, but `submitQuiz` already fetched the quiz with `getQuizById` which returns quiz data but not questions. This is fine but re-fetching questions after validation is intentional for scoring.

**Issue:** The `quizRow` variable from `getQuizById` is used but could be consolidated:

```typescript
// Line 98-108 - fetches quiz, then questions
const quizRow = await this.getQuizById(quizId);
const questionRows = await this.getQuizQuestions(quizId);
```

**Severity:** LOW - Not a bug, but worth noting for optimization later

---

#### 12. No Cache Invalidation Strategy

**File:** `lib/cache/cache.service.ts`

**Problem:** Cache is set with TTL but never invalidated when underlying data changes:

```typescript
// Line 35 in learn.repository.ts
await cacheService.set(cacheKey, result, { ttlSeconds: 3600 });
// When admin creates a new subject, the cached subject list is stale for up to 1 hour
```

**Affected Cache Keys:**

- `CacheKeys.subjectList()` - stale after curriculum CRUD
- `CacheKeys.chapterList(subjectId)` - stale after chapter CRUD
- `CacheKeys.forumThreads(filters)` - stale after new posts

**Severity:** MEDIUM - Users see stale data

---

#### 13. Response Helper Never Used Consistently

**File:** `lib/response.ts:88-89`

```typescript
// Recommended: Add to all route handlers
// Current Inconsistency: Some return directly, some wrap in { data }
// Target: All responses should use successResponse() wrapper
```

**Current State:**

- `forum.ts` - mixed usage
- `admin.ts` - mostly no wrapper
- `chapter-media.ts` - uses wrapper
- `quiz.ts` - returns raw object

**Severity:** MEDIUM - Technical debt, inconsistent API

---

#### 14. Admin Router Repetitive Authorization Pattern

**File:** `routes/admin.ts` - Every endpoint follows this pattern:

```typescript
adminRouter.post("/endpoint", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }
  // ... handler
});
```

**Proposed Solution:**

```typescript
// Create combined middleware
const requireAdmin = (req, res, next) => {
  requireSession(req, res, () => {
    requireAdminRole(req, res, next);
  });
};
```

**Severity:** LOW - Boilerplate, not broken

---

#### 15. Worker Double Redis Connection

**File:** `lib/queue.ts:6-10`

```typescript
const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
export const connection = redisConnection;

// vs server.ts creating workers
createAnalyticsWorker(); // BullMQ manages its own connection internally
```

**File:** `workers/analytics.worker.ts:19`

```typescript
connection, // Uses exported connection
```

**Problem:** BullMQ actually manages its own Redis connection internally when you pass a connection object. The explicit `connection` export may be redundant or cause confusion.

**Severity:** LOW - Dead code potential

---

### Low Priority

#### 16. Hardcoded MinIO Defaults

**File:** `lib/env.ts:18-21`

```typescript
MINIO_ACCESS_KEY: z.string().min(1).default("minioadmin"),
MINIO_SECRET_KEY: z.string().min(1).default("minioadmin123"),
MINIO_BUCKET: z.string().min(1).default("learningo-media"),
MINIO_PUBLIC_URL: z.string().url().default("http://localhost:9000"),
```

**Problem:** Defaults are development values. Production will fail if env vars not set correctly.

**Severity:** LOW - Misconfiguration risk

---

#### 17. No Redis Reconnection Handler

**File:** `lib/redis.ts:9-11`

```typescript
redis.on("error", (error) => {
  console.error("Redis client error:", error);
});
// No "reconnecting" event handler
// No automatic reconnection logic
```

**Severity:** LOW - Redis failures may not recover cleanly

---

#### 18. No Request ID / Correlation ID

**Problem:** No request tracing across services. Difficult to debug production issues.

**Severity:** LOW - Observability gap

---

#### 19. Jobs Not Idempotent

**File:** `jobs/cleanup.ts:4-22`

```typescript
export async function processStaleSessionCleanup(job: CleanupJob): Promise<void> {
  // Same job could run twice if first attempt partially completes
  const keys = await redis.keys("session:*");
  for (const key of keys) {
    const ttl = await redis.ttl(key);
    if (ttl === -1) {
      await redis.del(key);
    }
  }
}
```

**Problem:** If this job runs while another instance is also running, sessions could be deleted incorrectly.

**Severity:** LOW - Race condition unlikely but possible

---

#### 20. Missing Health Check for Workers

**File:** `server.ts`

```typescript
// Only registers HTTP health check
app.use("/api/health", healthRouter);

// Workers have no health endpoint
// No way to know if BullMQ workers are alive
```

**Severity:** LOW - Operational blindness

---

## Recommended Actions

### Immediate (Fix Before Phase 3 Deploy)

1. **Fix TypeScript Errors** - Priority 1
   - Add missing imports in `forum.repository.ts` (HttpError)
   - Add missing imports in `forum.service.ts` (ModerationError)
   - Fix session type in `session.ts` and `forum.ts`
   - Fix integration test type issues

2. **Lazy Worker Initialization** - Priority 1
   - Move worker creation inside `createApp()` or use lazy initialization pattern
   - Add shutdown handlers for graceful worker termination

3. **Implement Actual Worker Logic** - Priority 1
   - Replace stub implementations in `jobs/analytics.ts` and `jobs/email.ts`
   - Add real analytics aggregation logic
   - Add real email sending via configured provider

4. **Replace Blocking KEYS Command** - Priority 1
   - In `jobs/cleanup.ts`, use `SCAN` instead of `KEYS`
   - Or use `redis.dbsize()` + iterative `SCAN` with cursor

### Short Term (Phase 3-4)

5. **Split Admin Router** - Priority 2

   ```
   routes/admin/content/boards.ts     - Board CRUD
   routes/admin/content/classes.ts    - Class CRUD
   routes/admin/content/subjects.ts   - Subject CRUD
   routes/admin/content/chapters.ts   - Chapter CRUD + summary/links
   routes/admin/content/exercises.ts  - Exercise CRUD
   routes/admin/content/quizzes.ts    - Quiz CRUD
   routes/admin/content/flashcards.ts - Flashcard CRUD
   routes/admin/users.ts              - User management
   routes/admin/moderation.ts         - Flag resolution
   routes/admin/notifications.ts      - Notification management
   routes/admin/settings.ts           - Settings management
   routes/admin/analytics.ts          - Analytics overview
   routes/admin/forum.ts              - Thread pin/special ops
   routes/admin/jobs.ts               - Job stats/retry
   ```

6. **Add Cache Invalidation** - Priority 2
   - Invalidate `subjectList` cache on board/class/subject CRUD
   - Invalidate `chapterList` cache on chapter CRUD
   - Add `invalidatePattern` calls after mutations

7. **Create Unified Admin Middleware** - Priority 3

   ```typescript
   // lib/middleware/admin.ts
   export const requireAdmin = async (req, res, next) => {
     await requireSession(req, res, () => {
       requireAdminRole(req, res, next);
     });
   };
   ```

8. **Response Shape Standardization** - Priority 3
   - Audit all endpoints for consistent response wrapping
   - Use `successResponse()` wrapper on all success responses
   - Document response conventions in `response.ts`

### Medium Term

9. **Database Indexes** - Priority 2
   - Add index on `forumReplies.threadId`
   - Consider index on `userProgress.userId` for dashboard queries
   - Analyze query plans for forum thread listing

10. **Error Handling Consistency** - Priority 3
    - Ensure all routes use `isHttpError` check pattern
    - Add global error handler middleware for unhandled errors
    - Standardize error codes

11. **Add Request Tracing** - Priority 4
    - Generate request ID at entry point
    - Pass through all service calls
    - Log with correlation ID

---

## Architecture Decisions

### AD-001: Admin Route Decomposition

**Status:** Proposed  
**Context:** The 5,371-line `admin.ts` file is unmaintainable.  
**Decision:** Split into domain-specific routers following the pattern in Recommended Action #5.  
**Alternatives Considered:**

- Keep as-is (rejected - too large for collaboration)
- Split by HTTP method (rejected - doesn't match domain boundaries)
- Single massive controller with switch statement (rejected - same problem)

### AD-002: Worker Initialization Strategy

**Status:** Proposed  
**Context:** Workers currently start eagerly at import time.  
**Decision:** Lazy initialization within app startup, with graceful shutdown handlers.  
**Alternatives Considered:**

- Environment variable to disable workers (adds complexity)
- Separate worker process entirely (good for scale, but adds deployment complexity)
- Keep eager initialization (rejected - causes build-time side effects)

### AD-003: Response Wrapper Strategy

**Status:** Proposed  
**Context:** Inconsistent response shapes across routes.  
**Decision:** Standardize on `successResponse()` wrapper for all success responses. Document conventions.  
**Alternatives Considered:**

- No wrapper, raw objects (rejected - inconsistent)
- Different wrappers for different response types (complex)
- GraphQL (future consideration, out of scope now)

### AD-004: Redis Key Scanning Strategy

**Status:** Proposed  
**Context:** `KEYS` command blocks Redis.  
**Decision:** Use `SCAN` with cursor iteration for production-safe key enumeration.  
**Alternatives Considered:**

- Use `UNLINK` instead of `DEL` (non-blocking, but still needs SCAN)
- Maintain explicit set of session keys (complex)
- Redis-based session storage instead of keys pattern (significant refactor)

---

## File:Line References for Key Issues

| Issue                        | File                                   | Line(s)                 |
| ---------------------------- | -------------------------------------- | ----------------------- |
| TypeScript: session.ts       | `src/lib/session.ts`                   | 66                      |
| TypeScript: forum.repository | `src/repositories/forum.repository.ts` | 252, 274, 278           |
| TypeScript: forum.service    | `src/services/forum.service.ts`        | 240, 264                |
| TypeScript: forum.ts         | `src/routes/forum.ts`                  | 111                     |
| Eager workers                | `src/server.ts`                        | 21-23                   |
| Admin monolith               | `src/routes/admin.ts`                  | 1-5371                  |
| Response inconsistency       | `src/routes/forum.ts`                  | 94-96, 157-163, 190-195 |
| Blocking KEYS                | `src/jobs/cleanup.ts`                  | 10                      |
| Missing cache invalidation   | `src/repositories/learn.repository.ts` | 35, 88                  |
| Worker stubs                 | `src/jobs/analytics.ts`                | 3-10                    |
| Worker stubs                 | `src/jobs/email.ts`                    | 3-10                    |
| Missing forumReplies index   | `src/lib/db/schema.ts`                 | 380-394                 |
| Missing userProgress index   | `src/lib/db/schema.ts`                 | 473-490                 |

---

## Addendum: Deep Architecture Review — NEW Findings

**Date:** 2026-04-02 (Phase 2)
**Reviewer:** Backend Architect
**Scope:** Route architecture, service layer patterns, async workers (BullMQ), caching strategy (Redis), API conventions, error handling patterns, middleware stack design
**Rule:** Findings below are **not duplicated** from the original review above, the code-quality review, or the database review.
