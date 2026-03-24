import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { boardClasses, boards, chapters, forumReplies, forumReplyVotes, forumThreads, subjects, users } from "../lib/db/schema.js";

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
}

export const forumRepository = new ForumRepository();
