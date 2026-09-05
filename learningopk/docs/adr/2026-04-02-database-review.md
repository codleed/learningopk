# Database Architecture Review

**Date**: 2026-04-02
**Reviewer**: Data Engineer
**Phase**: Phase 3 - Sidebar/CMS Overhaul
**Database**: PostgreSQL 16
**ORM**: Drizzle ORM

---

## Schema Overview

The LearningoPK database follows a typical relational model for an educational platform with:

- **User Management**: `users`, `sessions`, `accounts`, `verifications`
- **Curriculum Structure**: `boards`, `boardClasses`, `subjects`, `chapters`
- **Learning Content**: `exercises`, `flashcards`, `quizzes`, `quizQuestions`, `contentSources`
- **Media Storage**: `chapterSummaryMedia` (Phase 3 focus)
- **AI Features**: `aiChatSessions`, `aiMessages`, `aiUsageLogs`
- **Forum**: `forumThreads`, `forumReplies`, `forumReplyVotes`
- **Progress Tracking**: `userProgress`, `quizAttempts`
- **Admin Features**: `moderationFlags`, `adminAuditLogs`, `adminNotifications`, `adminSettings`

**Primary Key Strategy**: Mixed - `uuid` for user-facing/forum entities, `serial` for internal curriculum entities.

---

## Critical Issues

### 1. `forum.repository.ts:91-95` - N+1 Query in Thread Reply Count

```typescript
replyCount: sql<number>`(
  select count(*)::int
  from forum_replies
  where forum_replies.thread_id = ${forumThreads.id}
)`;
```

**Problem**: Correlated subquery executed for EVERY row in `findThreads()`. With 100 threads, this executes 100 additional queries.
**Impact**: O(n) query complexity, severe performance degradation at scale.
**Recommended Fix**: Use a window function or join with a pre-aggregated subquery:

```typescript
replyCount: sql<number>`count(${forumReplies.id}) OVER (PARTITION BY ${forumReplies.threadId})`;
```

### 2. `schema.ts:226-246` - `chapterSummaryMedia.objectUrl` Data Redundancy

**Problem**: `objectUrl` is stored as a separate column when it can always be derived from `objectKey` using `buildPublicObjectUrl()`. This creates:

- Data redundancy (two sources of truth)
- Potential drift if URL format changes
- Wasted storage
  **Recommended Fix**: Remove `objectUrl` column. Compute it on read via `buildPublicObjectUrl({ objectKey })`.

### 3. `schema.ts:473-490` - `userProgress` Missing Index on `visitedAt`

**Problem**: `findRecentChapterVisits()` (progress.repository.ts:78-93) orders by `visitedAt` but no index exists.
**Impact**: Full table scan on `userProgress` for recent visit queries.
**Recommended Fix**: Add index `(userId, visitedAt DESC)` for the query pattern.

### 4. `schema.ts:380-394` - `forumReplies` Missing Index on `threadId`

**Problem**: `findRepliesByThreadId()` (forum.repository.ts:150-169) filters by `threadId` but only has an implicit index from the FK constraint.
**Impact**: Sequential scan for thread reply lookups.
**Recommended Fix**: Add explicit index `forum_replies(thread_id)` for the filter pattern.

---

## High Priority Issues

### 5. `schema.ts:355-378` - `forumThreads` Missing Index on `userId`

**Problem**: No index on `forumThreads.userId` even though UI likely shows "My Threads" functionality.
**Impact**: Full table scan for user-specific thread queries.
**Recommended Fix**: Add index `(user_id, created_at DESC)`.

### 6. `schema.ts:304-318` - `quizAttempts` Missing Index on `quizId`

**Problem**: `findQuizHistory()` (progress.repository.ts:115-133) joins through `quizAttempts.quizId`, but no index exists.
**Impact**: Nested loop join performs full scans on quiz attempts.
**Recommended Fix**: Add index `(quiz_id)` or composite `(user_id, completed_at DESC)`.

### 7. `chapter-media.ts:260` - No Validation of Presigned Upload Completion

**Problem**: `POST /chapters/:chapterId/media/confirm` (line 227-302) accepts the upload confirmation without verifying the object actually exists in MinIO.
**Impact**: Orphaned database records if:

- Client never completed the presigned PUT
- Network failure mid-upload
- Client sends false confirmation
  **Recommended Fix**: In `confirmUploadBodySchema`, either:

1. Add `expectedSha256` and validate after PUT, or
2. Call `minioClient.statObject()` to verify existence before inserting DB record.

### 8. `chapter-media.ts:52-156` - Buffer Upload Inconsistency

**Problem**: The buffer upload path (line 55) generates `objectKey` with a random UUID via `buildChapterSummaryObjectKey`, but the presigned URL path (line 200-204) also generates a new UUID. If the client uploads to the presigned URL but confirms with mismatched `objectKey`, data inconsistency occurs.
**Impact**: Broken media references if `objectKey` mismatch occurs.
**Recommended Fix**: Return the `objectKey` from the presigned-upload endpoint and require exact match in confirm body, or generate `objectKey` server-side in confirm and ignore client's `objectKey`.

### 9. `schema.ts:40-59` - `users` Table Missing `NOT NULL` on `createdAt`

**Problem**: `users.createdAt` is defined without `.notNull()` while essentially all other timestamp columns are NOT NULL.
**Impact**: Inconsistency - `createdAt` can be null but schema suggests it shouldn't be.
**Recommended Fix**: Add `.notNull().defaultNow()` to match other tables.

### 10. `schema.ts:510-512` - `institutes` Table Isolate

**Problem**: `institutes` table (line 510-512) has no foreign keys and no relationships to any other table.
**Impact**: Orphaned table - unclear if it's used or will be used.
**Recommended Fix**: Document intended use or remove if unnecessary.

---

## Index Recommendations

| Table           | Column(s)                      | Query Pattern                  | Priority |
| --------------- | ------------------------------ | ------------------------------ | -------- |
| `forum_replies` | `(thread_id)`                  | `findRepliesByThreadId` filter | HIGH     |
| `forum_threads` | `(user_id, created_at DESC)`   | User's threads + "My Threads"  | HIGH     |
| `user_progress` | `(user_id, visited_at DESC)`   | `findRecentChapterVisits` sort | HIGH     |
| `quiz_attempts` | `(quiz_id)`                    | Quiz history joins             | MEDIUM   |
| `quiz_attempts` | `(user_id, completed_at DESC)` | `findQuizHistory` sort         | MEDIUM   |
| `chapters`      | `(subject_id, is_published)`   | Subject chapter listing        | MEDIUM   |
| `exercises`     | `(chapter_id)`                 | Chapter exercises listing      | MEDIUM   |
| `flashcards`    | `(chapter_id, order_index)`    | Flashcard ordering             | LOW      |
| `users`         | `(role)`                       | Admin filtering                | LOW      |

---

## Query Performance Issues

### 11. `learn.repository.ts:152-193` - Sequential Queries Instead of JOIN

```typescript
const quizzesData = await db.select(...).from(quizzes).where(...);
const mockExamData = await db.select(...).from(mockExams).where(eq(mockExams.quizId, quiz.id));
```

**Problem**: Two sequential queries when a LEFT JOIN would suffice.
**Impact**: 2x round-trip latency for every quiz lookup.
**Recommended Fix**: Use a single query with LEFT JOIN to `mockExams`.

### 12. `forum.repository.ts:193-256` - `voteReply` Multiple Round-trips

```typescript
const replyRows = await db.select({ id: forumReplies.id })...  // Query 1
const existingVotes = await tx.select(...)...  // Query 2 inside transaction
await tx.insert(forumReplyVotes)...  // Query 3
await tx.update(forumReplies)...  // Query 4
await tx.select({ upvotes })...  // Query 5
```

**Problem**: Up to 5 queries in a transaction that could be reduced.
**Impact**: Higher latency and more connection pool pressure.
**Recommended Fix**: Use `INSERT ... ON CONFLICT DO UPDATE` (upsert) and single `UPDATE ... RETURNING`.

### 13. `progress.repository.ts:37-53` - `findChaptersBySubject` Missing Pagination

```typescript
.from(chapters)
.leftJoin(userProgress, ...)
.orderBy(asc(chapters.chapterNumber))
// No LIMIT/OFFSET
```

**Problem**: Returns all chapters for a subject with no pagination.
**Impact**: Memory pressure and network transfer for subjects with many chapters.
**Recommended Fix**: Add optional `limit` and `offset` parameters.

### 14. `forum.repository.ts:59-106` - `findThreads` Offset Pagination

```typescript
.limit(limit).offset(offset)
```

**Problem**: Offset-based pagination becomes slower as offset grows (O(offset) scan).
**Impact**: Page 100 takes 10x longer than page 1.
**Recommended Fix**: Use keyset/cursor pagination with `WHERE id < $last_seen_id`.

---

## Data Integrity Concerns

### 15. `chapter-media.ts:74-85` - Race Condition on Chapter Validation

```typescript
const chapterRows = await db.select({ id: chapters.id }).from(chapters)... // Query 1
if (!chapterRows[0]) { ... }
```

**Problem**: Between checking chapter existence and inserting media, the chapter could be deleted.
**Impact**: Media inserted for non-existent chapter (FK constraint would catch this, but the error message would be confusing).
**Recommended Fix**: Use `FOR UPDATE` lock or handle FK violation specifically.

### 16. `schema.ts:226-246` - `chapterSummaryMedia` No `updatedAt`

**Problem**: Media records have no `updatedAt` timestamp.
**Impact**: Cannot track when media was modified; no audit trail.
**Recommended Fix**: Add `updatedAt` column for consistency with other entities.

### 17. `schema.ts:226-246` - `chapterSummaryMedia` No Soft Delete

**Problem**: Media is hard-deleted (line 402-404 in chapter-media.ts).
**Impact**: No recovery option if admin deletes wrong media.
**Recommended Fix**: Consider soft delete with `deletedAt` column if recovery is important.

### 18. `forum.repository.ts:258-315` - `acceptReply` Race Condition

```typescript
// Check thread ownership
if (reply.threadAuthorId !== params.userId) { ... }
// Then update
await tx.update(forumReplies).set({ isAcceptedAnswer: false }).where(...);
```

**Problem**: Between the ownership check and the UPDATE, thread ownership could change.
**Impact**: Accept answer on a thread you no longer own.
**Recommended Fix**: Add `FOR UPDATE` on thread row inside transaction.

---

## Pre-existing Issues

### 19. `schema.ts:40-59` - `users.id` is `text`, not `uuid`

**Issue**: `users.id` uses `text` primary key while most other tables use `serial`. Forum tables use `uuid`.
**Impact**: Inconsistency in ID types across the platform. Auth system (Better Auth) likely generates UUID strings.
**Note**: This is an architectural decision made at project start. Not introducing a change, but worth documenting.

### 20. `schema.ts:187-207` - `chapterSummaryLinks` Self-Referential with Complex Logic

**Issue**: The table links chapters to themselves (or other chapters) with title matching logic.
**Impact**: Complex join patterns in `chapterSummaryMedia`-related queries.
**Note**: Pre-existing design pattern, not introduced by Phase 3.

### 21. `schema.ts:355-378` - GIN Index on `forumThreads` Without Supporting Query

**Issue**: `forum_threads_search_idx` GIN index for full-text search exists, but `findThreads` uses `plainto_tsquery` which may not use the index optimally.
**Impact**: Full-text search may be slower than expected.
**Note**: Pre-existing, recommend verifying `EXPLAIN ANALYZE` on forum search queries.

### 22. `schema.ts:17-38` - Enums Not Checked Against Application Usage

**Issue**: Multiple PostgreSQL enums defined but no validation they match actual Zod schemas in the application.
**Impact**: Enum values in DB might not match application expectations.
**Note**: Pre-existing, recommend cross-checking `gradeEnum`, `difficultyEnum`, `exerciseTypeEnum` with Zod schemas.

---

## Migration Safety Notes

### Patterns Already Used Safely

- `ON DELETE CASCADE` for parent-child relationships ✓
- `ON DELETE SET NULL` for optional references ✓
- Adding columns with defaults (e.g., `boardClasses` migration) ✓
- Multi-statement migrations with `statement-breakpoint` ✓

### Patterns to Avoid

1. **Adding NOT NULL columns without defaults** to existing tables with data - causes table rewrites
2. **Dropping columns** - causes table rewrites, risks data loss
3. **Adding columns with CHECK constraints** - validate data first
4. **Renaming columns** - breaks application code, use backward-compatible approach

### Safe Migration for Indexes (No Downtime)

Adding indexes in PostgreSQL 16 with `CREATE INDEX CONCURRENTLY` is safe for production:

```sql
CREATE INDEX CONCURRENTLY forum_replies_thread_id_idx ON forum_replies(thread_id);
```

---

## Summary of Recommended Actions

| Priority | Action                                         | Files Affected              |
| -------- | ---------------------------------------------- | --------------------------- |
| CRITICAL | Fix N+1 correlated subquery in `findThreads`   | forum.repository.ts:91-95   |
| CRITICAL | Add missing indexes for progress queries       | schema.ts                   |
| HIGH     | Remove redundant `objectUrl` column            | schema.ts, chapter-media.ts |
| HIGH     | Add presigned upload validation                | chapter-media.ts            |
| HIGH     | Fix objectKey consistency between upload flows | chapter-media.ts            |
| MEDIUM   | Add `updatedAt` to `chapterSummaryMedia`       | schema.ts                   |
| MEDIUM   | Add `userId` index to `forumThreads`           | schema.ts                   |
| MEDIUM   | Use JOIN instead of sequential queries         | learn.repository.ts         |
| MEDIUM   | Implement cursor pagination for forum          | forum.repository.ts         |
| LOW      | Add soft delete consideration                  | chapter-media.ts            |
| LOW      | Document or remove `institutes` table          | schema.ts                   |

---

_Review completed by Data Engineer for Phase 3 CMS overhaul._
