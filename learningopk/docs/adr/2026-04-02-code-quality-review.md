# Code Quality Review

**Date:** 2026-04-02
**Reviewer:** Engineering Senior Developer
**Phase:** Phase 3 - Sidebar/CMS Overhaul

---

## Files Reviewed

### Routes

- `learningopk/backend/src/routes/admin.ts` (5,371 lines - monolithic admin router)
- `learningopk/backend/src/routes/chapter-media.ts` (411 lines)
- `learningopk/backend/src/routes/ai-chat.ts` (416 lines)
- `learningopk/backend/src/routes/quiz.ts` (57 lines)

### Services

- `learningopk/backend/src/services/forum.service.ts` (376 lines)
- `learningopk/backend/src/services/progress.service.ts` (392 lines)
- `learningopk/backend/src/services/xp.service.ts` (264 lines)
- `learningopk/backend/src/services/quiz.service.ts` (274 lines)

### Repositories

- `learningopk/backend/src/repositories/forum.repository.ts` (432 lines)
- `learningopk/backend/src/repositories/progress.repository.ts` (178 lines)
- `learningopk/backend/src/repositories/learn.repository.ts` (210 lines)
- `learningopk/backend/src/repositories/quiz.repository.ts` (71 lines)

### Workers

- `learningopk/backend/src/workers/cleanup.worker.ts` (27 lines)
- `learningopk/backend/src/workers/email.worker.ts` (27 lines)
- `learningopk/backend/src/workers/analytics.worker.ts` (33 lines)

### Libraries

- `learningopk/backend/src/lib/session.ts` (72 lines)
- `learningopk/backend/src/lib/admin.ts` (25 lines)
- `learningopk/backend/src/lib/queue.ts` (79 lines)
- `learningopk/backend/src/lib/errors/index.ts` (90 lines)

---

## Critical Issues (Fix Immediately)

### 1. [forum.repository.ts:252, 274, 278] `HttpError` Used Without Import

**Issue:** The `HttpError` class is thrown in `forum.repository.ts` but is NOT imported. The file only imports `ForbiddenError`, `NotFoundError`, `ServiceUnavailableError`, `ValidationError`, and `isHttpError` from `../lib/errors/index.js`.

**Code:**

```typescript
// Line 252 - HttpError used but not imported
throw new HttpError(500, "Unable to update vote.");

// Line 274
throw new HttpError(404, "Reply not found.");

// Line 278
throw new HttpError(403, "Only the thread author can mark an accepted answer.");
```

**Impact:** Runtime error - `HttpError is not defined` when these code paths are executed.

**Suggested Fix:** Add `HttpError` to the import statement:

```typescript
import {
  ForbiddenError,
  HttpError,
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
  isHttpError,
} from "../lib/errors/index.js";
```

---

### 2. [server.ts:21-23] BullMQ Workers Start Eagerly on Import

**Issue:** Workers are created immediately when `server.ts` is imported:

```typescript
createAnalyticsWorker();
createEmailWorker();
createCleanupWorker();
```

**Impact:**

- Workers connect to Redis immediately on module import
- If Redis isn't ready, connection failures occur
- In test environments, workers may start before they should
- Difficult to test without actual Redis connection

**Suggested Fix:** Implement lazy worker initialization:

```typescript
let analyticsWorker: Worker | null = null;
let emailWorker: Worker | null = null;
let cleanupWorker: Worker | null = null;

const getAnalyticsWorker = () => {
  if (!analyticsWorker) {
    analyticsWorker = createAnalyticsWorker();
  }
  return analyticsWorker;
};
```

Or create workers only when the server actually starts (inside `if (isDirectRun)` block).

---

### 3. [cleanup.ts:10] Redis KEYS Command Performance Issue

**Issue:** The cleanup job uses `redis.keys("session:*")` which is an O(N) operation that blocks Redis:

```typescript
const keys = await redis.keys("session:*");
```

**Impact:** In production with thousands of sessions, this can cause Redis to block and degrade performance for other operations.

**Suggested Fix:** Use `SCAN` command with cursor-based iteration instead:

```typescript
let cursor = "0";
do {
  const [newCursor, batch] = await redis.scan(cursor, "MATCH", "session:*", "COUNT", 100);
  cursor = newCursor;
  // Process batch
} while (cursor !== "0");
```

---

## High Priority Issues

### 4. [progress.repository.ts:135-144] Potential N+1 Query Issue

**Issue:** `findChapterQuizTotalMarks()` selects `quizzes.chapterId` and `quizzes.totalMarks` but doesn't join or filter by subject, potentially returning duplicate chapter entries if multiple quizzes exist for a chapter.

**Code:**

```typescript
async findChapterQuizTotalMarks() {
  return db
    .select({
      chapterId: quizzes.chapterId,
      totalMarks: quizzes.totalMarks
    })
    .from(quizzes)
    .where(eq(quizzes.type, "chapter_quiz"))  // No chapterId grouping
    .orderBy(asc(quizzes.id));
}
```

**Suggested Fix:** Add aggregation or distinct query:

```typescript
async findChapterQuizTotalMarks() {
  return db
    .select({
      chapterId: quizzes.chapterId,
      totalMarks: sql<number>`SUM(${quizzes.totalMarks})::int`
    })
    .from(quizzes)
    .where(eq(quizzes.type, "chapter_quiz"))
    .groupBy(quizzes.chapterId);
}
```

---

### 5. [ai-chat.ts:335-341] Potential Duplicate Message Insertion Race Condition

**Issue:** Between checking if the latest stored message matches and inserting a new one, another request could insert a message, causing duplicates:

```typescript
if (latestStoredMessage[0]?.role !== "user" || latestStoredMessage[0]?.content !== latestUserMessage.content) {
  await db.insert(aiMessages).values({...});
}
```

**Impact:** Small but possible race condition under concurrent requests.

**Suggested Fix:** Use database-level unique constraint or upsert pattern, or accept eventual consistency given the small window.

---

### 6. [xp.service.ts:133-184] Race Condition in XP Award

**Issue:** `awardXp` method reads user XP, calculates new XP in application code, then updates. Under concurrent quiz submissions, XP could be awarded incorrectly:

```typescript
const newXp = previousXp + xpAmount; // Calculated in app code
await db.update(users).set({
  xp: sql`${users.xp} + ${xpAmount}`, // But uses SQL increment
  level: newLevel,
});
```

**Impact:** The `level` calculation may be incorrect if another XP award happens between read and write.

**Suggested Fix:** Use database-level atomic operation with proper locking:

```typescript
await db.transaction(async (tx) => {
  // Re-fetch with lock in transaction
  const [user] = await tx
    .select({ xp: users.xp, level: users.level })
    .from(users)
    .where(eq(users.id, userId))
    .for("update");

  const newXp = user.xp + xpAmount;
  const { level: newLevel } = this.calculateLevel(newXp);

  await tx.update(users).set({ xp: newXp, level: newLevel }).where(eq(users.id, userId));
});
```

---

### 7. [quiz.service.ts:199] Time Calculation Could Be Negative

**Issue:** If `startedAt` is in the future (client clock issues), timeSpentSeconds would be negative:

```typescript
const timeSpentSeconds = Math.max(
  0,
  Math.floor((completedAt.getTime() - normalizedStartedAt.getTime()) / 1000)
);
```

**Suggested Fix:** The `Math.max(0, ...)` handles this, but a warning or validation might be better:

```typescript
const timeSpentMs = completedAt.getTime() - normalizedStartedAt.getTime();
const timeSpentSeconds = Math.max(0, Math.floor(timeSpentMs / 1000));
if (timeSpentMs < 0) {
  console.warn(`Quiz ${quizId} submitted with startedAt in future: ${startedAt}`);
}
```

---

## Medium Priority Issues

### 8. [admin.ts:2491, 3374] Physics Chapter Detection by Name String Contains

**Issue:** Detecting physics chapters by name string match is fragile:

```typescript
const isPhysicsChapter = chapter.subjectName.toLowerCase().includes("physics");
```

**Impact:** Could match unintended chapters like "Home Economics" (contains "physics" substring) or miss "Physics (Advanced)".

**Suggested Fix:** Use a dedicated `isPhysics` boolean field on subjects, or use subject ID lookup from a constants file.

---

### 9. [admin.ts:2769-2773] Cascade Delete Without FK Validation

**Issue:** The board deletion transaction deletes subjects and classes without checking for existing content:

```typescript
await db.transaction(async (tx) => {
  await tx.delete(subjects).where(eq(subjects.boardId, board.id));
  await tx.delete(boardClasses).where(eq(boardClasses.boardId, board.id));
  await tx.delete(boards).where(eq(boards.id, board.id));
});
```

**Impact:** Could leave orphaned records if FK constraints aren't properly set up, or fail if chapters/exercises exist.

**Suggested Fix:** Add validation that no chapters/exercises exist for this board before deletion, or rely on FK CASCADE DELETE with proper constraint setup.

---

### 10. [forum.repository.ts:284-305] Accept Reply Transaction Could Fail Partially

**Issue:** The `acceptReply` transaction marks all replies as not accepted, then marks one as accepted. If the second update fails, all replies are left unmarked:

```typescript
await db.transaction(async (tx) => {
  await tx
    .update(forumReplies)
    .set({ isAcceptedAnswer: false })
    .where(eq(forumReplies.threadId, reply.threadId));

  await tx
    .update(forumReplies)
    .set({ isAcceptedAnswer: true })
    .where(eq(forumReplies.id, params.replyId));

  await tx.update(forumThreads).set({ isSolved: true }).where(eq(forumThreads.id, reply.threadId));
});
```

**Suggested Fix:** Consider adding a "acceptedReplyId" column to forumThreads table instead, which atomically links the accepted reply without needing multi-step updates.

---

### 11. [session.ts:49] Type Assertion Without Validation

**Issue:** Session is assigned via type assertion without runtime validation:

```typescript
(req as AuthenticatedRequest).session = session;
```

**Impact:** If the session object has unexpected structure, runtime errors could occur later.

**Suggested Fix:** Add explicit type guard or validation:

```typescript
if (session && typeof session === "object" && "user" in session) {
  (req as AuthenticatedRequest).session = session;
} else {
  throw new Error("Invalid session structure");
}
```

---

### 12. [chapter-media.ts] Multiple Similar Chapter Existence Checks

**Issue:** Every endpoint in `chapter-media.ts` duplicates the same chapter existence check:

```typescript
const chapterRows = await db.select({ id: chapters.id })
  .from(chapters).where(eq(chapters.id, chapterId)).limit(1);
if (!chapterRows[0]) { ... }
```

**Impact:** Code duplication, potential for inconsistency if one instance is missed.

**Suggested Fix:** Extract to a helper function:

```typescript
const validateChapterExists = async (chapterId: number): Promise<boolean> => {
  const rows = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  return rows[0] !== undefined;
};
```

---

### 13. [progress.service.ts:269] Status Color Logic Magic Numbers

**Issue:** Hardcoded threshold for quiz status colors:

```typescript
const status = quizAttempted ? (bestScorePercent > 70 ? "green" : "yellow") : "grey";
```

**Suggested Fix:** Extract to constants:

```typescript
const PASS_THRESHOLD_PERCENT = 70;
const status = quizAttempted
  ? bestScorePercent > PASS_THRESHOLD_PERCENT
    ? "green"
    : "yellow"
  : "grey";
```

---

## Low Priority / Code Smell

### 14. [admin.ts:500-537] Large Function Should Be Split

**Issue:** `resolveWikiLinks` is 72 lines and handles multiple concerns (parsing links, building maps, resolving candidates).

**Suggested Fix:** Split into smaller functions:

- `extractUniqueLinkTargets()` - parse and deduplicate links
- `buildCandidateMap()` - build chapter/alias lookup
- `resolveLinks()` - resolve links to chapters

---

### 15. [ai-chat.ts:42-73] Tokenization Logic Duplicated

**Issue:** The `tokenize` function could be reused elsewhere if similar text processing is needed.

**Code Smell:** Duplicated tokenization logic may exist elsewhere.

---

### 16. [forum.service.ts:86-178] `shapeThreadReplies` Complex Nested Type

**Issue:** The function defines nested types inline and has complex nested loop logic. The nested `ThreadReply` and `NestedReply` types should be extracted.

---

### 17. [xp.service.ts:28] Magic Number for Streak Freeze Cooldown

**Issue:** `STREAK_FREEZE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000` should be a constant with explanation comment.

---

### 18. [admin.ts] 5,371 Line Monolithic Router

**Issue:** The entire admin router is in a single file with 5,371 lines. This makes the file:

- Difficult to navigate
- Hard to review changes
- Impossible to tree-shake unused routes
- Error-prone to modify

**Suggested Fix:** Split into multiple route files:

- `routes/admin/content.ts` - curriculum CRUD
- `routes/admin/quizzes.ts` - quiz and question management
- `routes/admin/flashcards.ts` - flashcard management
- `routes/admin/users.ts` - user management
- `routes/admin/forum.ts` - forum moderation
- `routes/admin/settings.ts` - settings and notifications
- `routes/admin/analytics.ts` - analytics endpoints

---

## Pre-existing TypeScript Errors

### 19. [session.ts] TypeScript Errors Exist (Pre-existing)

**Issue:** The file `session.ts` has pre-existing TypeScript errors as noted in the task description. The `SessionResult` type uses `Awaited<ReturnType<typeof auth.api.getSession>>` which may have compatibility issues with the `better-auth` library version.

**Status:** These errors are NOT introduced by current changes - they exist in the pre-existing codebase.

---

## Zod Version Mismatch

### 20. [packages/shared vs backend] Zod 3 vs Zod 4 Incompatibility

**Issue:**

- Backend: `"zod": "^4.1.12"` (Zod 4)
- Shared package: `"zod": "^3.23.8"` (Zod 3)

**Impact:**

- Shared validators built with Zod 3 may not work correctly with Zod 4
- Breaking changes between versions could cause runtime errors
- Type inference differences between versions

**Suggested Fix:** Align versions - either:

1. Downgrade backend to Zod 3
2. Upgrade shared package to Zod 4 (requires review of all shared validators)

---

## Security Issues

### 21. [admin.ts:616-620] LIKE Patterns with User Input

**Issue:** Audit log search uses `ilike` with user-provided search term:

```typescript
const searchPredicate = or(
  ilike(adminAuditLogs.action, `%${searchTerm}%`),
  ilike(adminAuditLogs.target, `%${searchTerm}%`),
  ilike(adminAuditLogs.message, `%${searchTerm}%`),
  ilike(adminAuditLogs.actorName, `%${searchTerm}%`)
);
```

**Note:** While Drizzle ORM parameterizes these values (preventing SQL injection), very large search terms could cause performance issues (ReDoS on LIKE patterns).

**Suggested Fix:** Add length limit to search term validation:

```typescript
const searchTerm = q?.trim() ?? "";
if (searchTerm.length > 100) {
  // Reject or truncate
}
```

---

### 22. [admin.ts:2491] Insufficient Input Validation

**Issue:** Physics chapter detection by string contains is easily bypassed:

```typescript
const isPhysicsChapter = chapter.subjectName.toLowerCase().includes("physics");
```

**Impact:** A malicious admin could create a chapter with name containing "physics" in a non-physics subject and gain access to numerical exercise features.

**Suggested Fix:** Use subject ID validation against a configured physics subject ID list.

---

## Summary Statistics

| Category                  | Count  |
| ------------------------- | ------ |
| Critical Issues           | 3      |
| High Priority Issues      | 5      |
| Medium Priority Issues    | 6      |
| Low Priority / Code Smell | 6      |
| Pre-existing Issues       | 2      |
| **Total**                 | **22** |

---

## Recommendations

### Immediate Actions (Before Next Phase)

1. Fix `HttpError` import in `forum.repository.ts` - this will cause runtime failures
2. Implement lazy worker initialization in `server.ts`
3. Replace `redis.keys()` with `SCAN` in cleanup job

### Short-term Actions (This Phase)

4. Add proper transaction isolation to XP award operations
5. Fix the duplicate quiz total marks query
6. Align Zod versions between packages

### Medium-term Actions (Technical Debt)

7. Split the 5,371-line admin router into smaller modules
8. Extract shared helper functions for chapter validation
9. Add proper database indexes for audit log queries

---

_Review completed by EngineeringSeniorDeveloper on 2026-04-02_
