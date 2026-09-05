# Forum Service Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor ForumService to use ForumRepository for all DB operations while keeping pure functions in service for abstraction.

**Architecture:** Move DB queries/mutations to repository, service orchestrates business logic and keeps pure functions. Routes import from service which uses repository.

**Tech Stack:** TypeScript, Drizzle ORM, Express

---

## Analysis Summary

### Service Methods with DB (to move to repository):

- `resolveThreadSubjectId` - queries chapters + subjects
- `createThread` - inserts forumThreads
- `createReply` - validates + inserts forumReplies
- `voteReply` - transaction with votes + reply updates
- `acceptReply` - transaction with replies + thread updates

### Pure Functions to KEEP in service:

- `buildFilters` - SQL building (no DB)
- `shapeThreadReplies` - data transformation (no DB)
- `checkMutationRateLimit` - rate limiting logic

### Missing Repository Methods (need to add):

- `findChapterById` / `findSubjectById` - for subject resolution
- `createThread` / `createReply` - for inserts
- `findThreadByIdSimple` / `findReplyByIdWithThread` - for validation
- `voteReplyTransaction` / `acceptReplyTransaction` - for mutations

---

## Task 1: Add missing repository methods

**Files:**

- Modify: `learningopk/backend/src/repositories/forum.repository.ts`

**Step 1: Add new methods to repository**

Add these methods to ForumRepository class (after line 189):

```typescript
async findChapterById(chapterId: number) {
  return db
    .select({
      id: chapters.id,
      subjectId: chapters.subjectId
    })
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
}

async findSubjectById(subjectId: number) {
  return db
    .select({
      id: subjects.id
    })
    .from(subjects)
    .where(eq(subjects.id, subjectId))
    .limit(1);
}

async createThread(values: {
  userId: string;
  title: string;
  body: string;
  subjectId: number | null;
  chapterId: string | null;
}) {
  const insertedRows = await db
    .insert(forumThreads)
    .values(values)
    .returning({
      id: forumThreads.id,
      title: forumThreads.title,
      body: forumThreads.body,
      userId: forumThreads.userId,
      subjectId: forumThreads.subjectId,
      chapterId: forumThreads.chapterId,
      isPinned: forumThreads.isPinned,
      isSolved: forumThreads.isSolved,
      views: forumThreads.views,
      createdAt: forumThreads.createdAt,
      updatedAt: forumThreads.updatedAt
    });
  return insertedRows[0];
}

async findThreadByIdSimple(threadId: string) {
  return db
    .select({ id: forumThreads.id })
    .from(forumThreads)
    .where(eq(forumThreads.id, threadId))
    .limit(1);
}

async findReplyByIdWithParent(replyId: string) {
  return db
    .select({
      id: forumReplies.id,
      threadId: forumReplies.threadId,
      parentReplyId: forumReplies.parentReplyId
    })
    .from(forumReplies)
    .where(eq(forumReplies.id, replyId))
    .limit(1);
}

async createReply(values: {
  threadId: string;
  userId: string;
  parentReplyId: string | null;
  body: string;
}) {
  const insertedRows = await db
    .insert(forumReplies)
    .values(values)
    .returning({
      id: forumReplies.id,
      threadId: forumReplies.threadId,
      userId: forumReplies.userId,
      parentReplyId: forumReplies.parentReplyId,
      body: forumReplies.body,
      isAcceptedAnswer: forumReplies.isAcceptedAnswer,
      upvotes: forumReplies.upvotes,
      createdAt: forumReplies.createdAt,
      updatedAt: forumReplies.updatedAt
    });
  return insertedRows[0];
}

async findReplyByIdSimple(replyId: string) {
  return db
    .select({ id: forumReplies.id })
    .from(forumReplies)
    .where(eq(forumReplies.id, replyId))
    .limit(1);
}

async findReplyWithThread(replyId: string) {
  return db
    .select({
      replyId: forumReplies.id,
      threadId: forumReplies.threadId,
      threadAuthorId: forumThreads.userId
    })
    .from(forumReplies)
    .innerJoin(forumThreads, eq(forumReplies.threadId, forumThreads.id))
    .where(eq(forumReplies.id, replyId))
    .limit(1);
}

async voteReplyTransaction(userId: string, replyId: string, voteType: "upvote" | "downvote") {
  return db.transaction(async (tx) => {
    const existingVotes = await tx
      .select({
        id: forumReplyVotes.id,
        voteType: forumReplyVotes.voteType
      })
      .from(forumReplyVotes)
      .where(and(eq(forumReplyVotes.userId, userId), eq(forumReplyVotes.replyId, replyId)))
      .limit(1);
    const existingVote = existingVotes[0];

    let delta = 0;
    if (!existingVote) {
      await tx.insert(forumReplyVotes).values({
        userId,
        replyId,
        voteType
      });
      delta = voteType === "upvote" ? 1 : -1;
    } else if (existingVote.voteType !== voteType) {
      await tx.update(forumReplyVotes).set({ voteType }).where(eq(forumReplyVotes.id, existingVote.id));
      delta = voteType === "upvote" ? 2 : -2;
    }

    if (delta !== 0) {
      const updatedReplyRows = await tx
        .update(forumReplies)
        .set({
          upvotes: sql`${forumReplies.upvotes} + ${delta}`
        })
        .where(eq(forumReplies.id, replyId))
        .returning({
          upvotes: forumReplies.upvotes
        });
      return updatedReplyRows[0]?.upvotes ?? null;
    }

    const sameVoteReplyRows = await tx
      .select({
        upvotes: forumReplies.upvotes
      })
      .from(forumReplies)
      .where(eq(forumReplies.id, replyId))
      .limit(1);
    return sameVoteReplyRows[0]?.upvotes ?? null;
  });
}

async acceptReplyTransaction(replyId: string, threadId: string) {
  await db.transaction(async (tx) => {
    await tx
      .update(forumReplies)
      .set({
        isAcceptedAnswer: false
      })
      .where(eq(forumReplies.threadId, threadId));

    await tx
      .update(forumReplies)
      .set({
        isAcceptedAnswer: true
      })
      .where(eq(forumReplies.id, replyId));

    await tx
      .update(forumThreads)
      .set({
        isSolved: true
      })
      .where(eq(forumThreads.id, threadId));
  });
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd learningopk/backend && pnpm lint`
Expected: No errors

---

## Task 2: Refactor service to use repository

**Files:**

- Modify: `learningopk/backend/src/services/forum.service.ts`

**Step 1: Add repository import at top**

After existing imports, add:

```typescript
import { forumRepository } from "../repositories/forum.repository.js";
```

**Step 2: Update resolveThreadSubjectId to use repository**

Replace the method body (lines 171-226):

```typescript
async resolveThreadSubjectId(input: { subjectId?: number; chapterId?: number }): Promise<{ subjectId: number | null } | { error: { status: number; body: { error: string } } }> {
  let resolvedSubjectId = input.subjectId ?? null;

  if (input.chapterId) {
    const chapterRows = await forumRepository.findChapterById(input.chapterId);
    const chapterRow = chapterRows[0];

    if (!chapterRow) {
      return {
        error: {
          status: 404,
          body: { error: "Chapter not found." }
        }
      };
    }

    if (resolvedSubjectId && resolvedSubjectId !== chapterRow.subjectId) {
      return {
        error: {
          status: 400,
          body: { error: "subjectId must match the selected chapter subject." }
        }
      };
    }

    resolvedSubjectId = resolvedSubjectId ?? chapterRow.subjectId;
  }

  if (resolvedSubjectId) {
    const subjectRows = await forumRepository.findSubjectById(resolvedSubjectId);

    if (subjectRows.length === 0) {
      return {
        error: {
          status: 404,
          body: { error: "Subject not found." }
        }
      };
    }
  }

  return { subjectId: resolvedSubjectId };
}
```

**Step 3: Update createThread to use repository**

Replace method body (lines 256-313):

```typescript
async createThread(input: CreateThreadInput): Promise<{ thread: Record<string, unknown> }> {
  const { title, body, userId, chapterId } = input;

  const moderation = moderateForumInput(`${title}\n${body}`);
  if (moderation.blocked) {
    throw new Error(`Forum content blocked by safety checks.`);
  }

  const subjectResolution = await this.resolveThreadSubjectId({
    ...(input.subjectId ? { subjectId: input.subjectId } : {}),
    ...(chapterId ? { chapterId } : {})
  });

  if ("error" in subjectResolution) {
    throw new Error(subjectResolution.error.body.error);
  }

  const insertedThread = await forumRepository.createThread({
    userId,
    title,
    body,
    subjectId: subjectResolution.subjectId,
    chapterId: chapterId ? String(chapterId) : null
  });

  if (!insertedThread) {
    throw new Error("Unable to create thread.");
  }

  return {
    thread: {
      ...insertedThread,
      userName: null,
      boardSlug: null,
      boardName: null,
      grade: null,
      className: null,
      subjectName: null,
      replyCount: 0
    }
  };
}
```

**Step 4: Update createReply to use repository**

Replace method body (lines 315-390):

```typescript
async createReply(input: CreateReplyInput, userName: string): Promise<{ reply: Record<string, unknown> }> {
  const { body, parentReplyId, threadId, userId } = input;

  const moderation = moderateForumInput(body);
  if (moderation.blocked) {
    throw new Error("Forum content blocked by safety checks.");
  }

  const threadRows = await forumRepository.findThreadByIdSimple(threadId);

  if (threadRows.length === 0) {
    throw new Error("Thread not found");
  }

  const resolvedParentId = parentReplyId ?? null;
  if (parentReplyId) {
    const parentReplyRows = await forumRepository.findReplyByIdWithParent(parentReplyId);
    const parentReply = parentReplyRows[0];

    if (!parentReply) {
      throw new Error("Parent reply not found");
    }

    if (parentReply.threadId !== threadId) {
      throw new Error("Parent reply does not belong to this thread.");
    }

    if (parentReply.parentReplyId) {
      throw new Error("Only one level of nested replies is allowed.");
    }
  }

  const insertedReply = await forumRepository.createReply({
    threadId,
    userId,
    parentReplyId: resolvedParentId,
    body
  });

  if (!insertedReply) {
    throw new Error("Unable to create reply.");
  }

  return {
    reply: {
      ...insertedReply,
      userName
    }
  };
}
```

**Step 5: Update voteReply to use repository**

Replace method body (lines 392-457):

```typescript
async voteReply(input: VoteInput): Promise<{ replyId: string; voteType: string; upvotes: number }> {
  const { replyId, voteType, userId } = input;

  const replyRows = await forumRepository.findReplyByIdSimple(replyId);

  if (replyRows.length === 0) {
    throw new Error("Reply not found");
  }

  const updatedUpvotes = await forumRepository.voteReplyTransaction(userId, replyId, voteType);

  if (updatedUpvotes === null) {
    throw new Error("Unable to update vote.");
  }

  return { replyId, voteType, upvotes: updatedUpvotes };
}
```

**Step 6: Update acceptReply to use repository**

Replace method body (lines 459-509):

```typescript
async acceptReply(replyId: string, userId: string): Promise<{ replyId: string; threadId: string; isAcceptedAnswer: boolean; isSolved: boolean }> {
  const replyRows = await forumRepository.findReplyWithThread(replyId);

  const reply = replyRows[0];
  if (!reply) {
    throw new Error("Reply not found");
  }

  if (reply.threadAuthorId !== userId) {
    throw new Error("Only the thread author can mark an accepted answer.");
  }

  await forumRepository.acceptReplyTransaction(replyId, reply.threadId);

  return {
    replyId,
    threadId: reply.threadId,
    isAcceptedAnswer: true,
    isSolved: true
  };
}
```

**Step 7: Remove unused imports from service**

Remove `db` import since service no longer calls it directly:

- Remove: `import { db } from "../lib/db/index.js";`

Remove unused schema imports (if any remain unused):

- Keep: `import { boardClasses, boards, chapters, forumReplies, forumReplyVotes, forumThreads, subjects, users } from "../lib/db/schema.js";`
- Actually these are still needed for types in some places. Let's verify after changes.

**Step 8: Verify TypeScript compiles**

Run: `cd learningopk/backend && pnpm lint`
Expected: No errors

---

## Task 3: Run verification

**Step 1: Start backend and test forum endpoints**

Run: `cd learningopk/backend && pnpm dev`
Expected: Server starts without errors

**Step 2: Test with curl or verify service works**

Test that the forum service still works:

```bash
curl http://localhost:3001/api/forum/filters
```

Expected: Returns boards, subjects, chapters

---

## Summary of Changes

| File                  | Change                                                                                                                                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `forum.repository.ts` | Added 10 new methods: findChapterById, findSubjectById, createThread, findThreadByIdSimple, findReplyByIdWithParent, createReply, findReplyByIdSimple, findReplyWithThread, voteReplyTransaction, acceptReplyTransaction                        |
| `forum.service.ts`    | Updated 5 methods (resolveThreadSubjectId, createThread, createReply, voteReply, acceptReply) to use repository instead of direct db calls. Removed db import. Kept 3 pure functions (buildFilters, shapeThreadReplies, checkMutationRateLimit) |
| `forum.ts`            | No changes needed - already imports from forumService                                                                                                                                                                                           |

**Result:** Service now delegates all DB operations to repository while keeping pure functions for useful abstraction.
