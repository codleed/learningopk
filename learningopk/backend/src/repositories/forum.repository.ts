import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { boardClasses, boards, chapters, forumReplies, forumReplyVotes, forumThreads, subjects, users } from "../lib/db/schema.js";
import { CacheKeys, cacheService } from "../lib/cache/cache.service.js";

export class ForumRepository {
  async findFilters() {
    const boardRows = await db
      .select({
        id: boards.id,
        name: boards.name,
        slug: boards.slug
      })
      .from(boards)
      .orderBy(asc(boards.name));

    const subjectRows = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        slug: subjects.slug,
        grade: subjects.grade,
        className: sql<string | null>`coalesce(${boardClasses.name}, case when ${subjects.grade} is not null then concat(${subjects.grade}::text, 'th') else null end)`,
        classSlug: sql<string | null>`coalesce(${boardClasses.slug}, ${subjects.grade}::text)`,
        boardClassId: subjects.boardClassId,
        boardId: subjects.boardId
      })
      .from(subjects)
      .leftJoin(boardClasses, eq(subjects.boardClassId, boardClasses.id))
      .orderBy(asc(subjects.boardId), asc(sql`coalesce(${boardClasses.name}, ${subjects.grade}::text)`), asc(subjects.name));

    const chapterRows = await db
      .select({
        id: chapters.id,
        title: chapters.title,
        slug: chapters.slug,
        chapterNumber: chapters.chapterNumber,
        subjectId: chapters.subjectId
      })
      .from(chapters)
      .where(eq(chapters.isPublished, true))
      .orderBy(asc(chapters.subjectId), asc(chapters.chapterNumber));

    const classRows = await db
      .select({
        id: boardClasses.id,
        boardId: boardClasses.boardId,
        name: boardClasses.name,
        slug: boardClasses.slug
      })
      .from(boardClasses)
      .orderBy(asc(boardClasses.boardId), asc(boardClasses.name));

    return { boards: boardRows, subjects: subjectRows, chapters: chapterRows, classes: classRows };
  }

  async findThreads(filters: SQL | undefined, limit: number, offset: number, q?: string) {
    const relevanceScoreSql = q
      ? sql<number>`ts_rank(
          to_tsvector('english', coalesce(${forumThreads.title}, '') || ' ' || coalesce(${forumThreads.body}, '')),
          plainto_tsquery('english', ${q})
        )`
      : sql<number>`0`;

    const orderByClauses = q
      ? [desc(relevanceScoreSql), desc(forumThreads.isPinned), desc(forumThreads.createdAt)]
      : [desc(forumThreads.isPinned), desc(forumThreads.createdAt)];

    return db
      .select({
        id: forumThreads.id,
        title: forumThreads.title,
        body: forumThreads.body,
        userId: forumThreads.userId,
        userName: users.name,
        subjectId: forumThreads.subjectId,
        chapterId: forumThreads.chapterId,
        isPinned: forumThreads.isPinned,
        isSolved: forumThreads.isSolved,
        views: forumThreads.views,
        createdAt: forumThreads.createdAt,
        updatedAt: forumThreads.updatedAt,
        boardSlug: boards.slug,
        boardName: boards.name,
        grade: sql<string | null>`coalesce(${boardClasses.slug}, ${subjects.grade}::text)`,
        className: sql<string | null>`coalesce(${boardClasses.name}, case when ${subjects.grade} is not null then concat(${subjects.grade}::text, 'th') else null end)`,
        subjectName: subjects.name,
        relevance: relevanceScoreSql,
        replyCount: sql<number>`(
          select count(*)::int
          from forum_replies
          where forum_replies.thread_id = ${forumThreads.id}
        )`
      })
      .from(forumThreads)
      .innerJoin(users, eq(forumThreads.userId, users.id))
      .leftJoin(subjects, eq(forumThreads.subjectId, subjects.id))
      .leftJoin(boards, eq(subjects.boardId, boards.id))
      .leftJoin(boardClasses, eq(subjects.boardClassId, boardClasses.id))
      .where(filters)
      .orderBy(...orderByClauses)
      .limit(limit)
      .offset(offset);
  }

  async incrementThreadViews(threadId: string) {
    return db
      .update(forumThreads)
      .set({
        views: sql`${forumThreads.views} + 1`
      })
      .where(eq(forumThreads.id, threadId))
      .returning({
        id: forumThreads.id
      });
  }

  async findThreadById(threadId: string) {
    return db
      .select({
        id: forumThreads.id,
        title: forumThreads.title,
        body: forumThreads.body,
        userId: forumThreads.userId,
        userName: users.name,
        subjectId: forumThreads.subjectId,
        chapterId: forumThreads.chapterId,
        isPinned: forumThreads.isPinned,
        isSolved: forumThreads.isSolved,
        views: forumThreads.views,
        createdAt: forumThreads.createdAt,
        updatedAt: forumThreads.updatedAt,
        boardSlug: boards.slug,
        boardName: boards.name,
        grade: sql<string | null>`coalesce(${boardClasses.slug}, ${subjects.grade}::text)`,
        className: sql<string | null>`coalesce(${boardClasses.name}, case when ${subjects.grade} is not null then concat(${subjects.grade}::text, 'th') else null end)`,
        subjectName: subjects.name
      })
      .from(forumThreads)
      .innerJoin(users, eq(forumThreads.userId, users.id))
      .leftJoin(subjects, eq(forumThreads.subjectId, subjects.id))
      .leftJoin(boards, eq(subjects.boardId, boards.id))
      .leftJoin(boardClasses, eq(subjects.boardClassId, boardClasses.id))
      .where(eq(forumThreads.id, threadId))
      .limit(1);
  }

  async findRepliesByThreadId(threadId: string) {
    return db
      .select({
        id: forumReplies.id,
        threadId: forumReplies.threadId,
        userId: forumReplies.userId,
        userName: users.name,
        parentReplyId: forumReplies.parentReplyId,
        body: forumReplies.body,
        isAcceptedAnswer: forumReplies.isAcceptedAnswer,
        upvotes: forumReplies.upvotes,
        viewerVoteType: sql<"upvote" | "downvote" | null>`null`,
        createdAt: forumReplies.createdAt,
        updatedAt: forumReplies.updatedAt
      })
      .from(forumReplies)
      .innerJoin(users, eq(forumReplies.userId, users.id))
      .where(eq(forumReplies.threadId, threadId))
      .orderBy(asc(forumReplies.createdAt), asc(forumReplies.id));
  }

  async findVotesByUserAndReplies(userId: string, replyIds: string[]) {
    if (replyIds.length === 0) return [];
    return db
      .select({
        replyId: forumReplyVotes.replyId,
        voteType: forumReplyVotes.voteType
      })
      .from(forumReplyVotes)
      .where(and(eq(forumReplyVotes.userId, userId), inArray(forumReplyVotes.replyId, replyIds)));
  }

  async findReplyById(replyId: string) {
    return db
      .select({
        id: forumReplies.id,
        threadId: forumReplies.threadId
      })
      .from(forumReplies)
      .where(eq(forumReplies.id, replyId))
      .limit(1);
  }

  async voteReply(params: { replyId: string; userId: string; voteType: "upvote" | "downvote" }) {
    const replyRows = await db
      .select({ id: forumReplies.id })
      .from(forumReplies)
      .where(eq(forumReplies.id, params.replyId))
      .limit(1);

    if (replyRows.length === 0) {
      throw new Error("Reply not found");
    }

    const updatedUpvotes = await db.transaction(async (tx) => {
      const existingVotes = await tx
        .select({
          id: forumReplyVotes.id,
          voteType: forumReplyVotes.voteType
        })
        .from(forumReplyVotes)
        .where(and(eq(forumReplyVotes.userId, params.userId), eq(forumReplyVotes.replyId, params.replyId)))
        .limit(1);
      const existingVote = existingVotes[0];

      let delta = 0;
      if (!existingVote) {
        await tx.insert(forumReplyVotes).values({
          userId: params.userId,
          replyId: params.replyId,
          voteType: params.voteType
        });
        delta = params.voteType === "upvote" ? 1 : -1;
      } else if (existingVote.voteType !== params.voteType) {
        await tx.update(forumReplyVotes).set({ voteType: params.voteType }).where(eq(forumReplyVotes.id, existingVote.id));
        delta = params.voteType === "upvote" ? 2 : -2;
      }

      if (delta !== 0) {
        const updatedReplyRows = await tx
          .update(forumReplies)
          .set({
            upvotes: sql`${forumReplies.upvotes} + ${delta}`
          })
          .where(eq(forumReplies.id, params.replyId))
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
        .where(eq(forumReplies.id, params.replyId))
        .limit(1);
      return sameVoteReplyRows[0]?.upvotes ?? null;
    });

    if (updatedUpvotes === null) {
      throw new Error("Unable to update vote.");
    }

    return { replyId: params.replyId, voteType: params.voteType, upvotes: updatedUpvotes };
  }

  async acceptReply(params: { replyId: string; userId: string }) {
    const replyRows = await db
      .select({
        replyId: forumReplies.id,
        threadId: forumReplies.threadId,
        threadAuthorId: forumThreads.userId
      })
      .from(forumReplies)
      .innerJoin(forumThreads, eq(forumReplies.threadId, forumThreads.id))
      .where(eq(forumReplies.id, params.replyId))
      .limit(1);

    const reply = replyRows[0];
    if (!reply) {
      throw new Error("Reply not found");
    }

    if (reply.threadAuthorId !== params.userId) {
      throw new Error("Only the thread author can mark an accepted answer.");
    }

    await db.transaction(async (tx) => {
      await tx
        .update(forumReplies)
        .set({
          isAcceptedAnswer: false
        })
        .where(eq(forumReplies.threadId, reply.threadId));

      await tx
        .update(forumReplies)
        .set({
          isAcceptedAnswer: true
        })
        .where(eq(forumReplies.id, params.replyId));

      await tx
        .update(forumThreads)
        .set({
          isSolved: true
        })
        .where(eq(forumThreads.id, reply.threadId));
    });

    return {
      replyId: params.replyId,
      threadId: reply.threadId,
      isAcceptedAnswer: true,
      isSolved: true
    };
  }

  async createThread(data: { userId: string; title: string; body: string; subjectId: number | null; chapterId: number | null }) {
    const insertedRows = await db
      .insert(forumThreads)
      .values({
        userId: data.userId,
        title: data.title,
        body: data.body,
        subjectId: data.subjectId,
        chapterId: data.chapterId
      })
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

    const insertedThread = insertedRows[0];
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

  async createReply(data: { userId: string; body: string; parentReplyId: string | null; threadId: string }) {
    const insertedRows = await db
      .insert(forumReplies)
      .values({
        threadId: data.threadId,
        userId: data.userId,
        parentReplyId: data.parentReplyId,
        body: data.body
      })
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

    const insertedReply = insertedRows[0];
    if (!insertedReply) {
      throw new Error("Unable to create reply.");
    }

    return { reply: insertedReply };
  }

  async findThreadByIdForReply(threadId: string) {
    return db
      .select({ id: forumThreads.id })
      .from(forumThreads)
      .where(eq(forumThreads.id, threadId))
      .limit(1);
  }

  async findReplyParent(replyId: string) {
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
}

export const forumRepository = new ForumRepository();
