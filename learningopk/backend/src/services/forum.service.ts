import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";

import { consumeForumMutationRateLimit, moderateForumInput } from "../lib/ai-guardrails.js";
import { db } from "../lib/db/index.js";
import { boardClasses, boards, chapters, forumReplies, forumReplyVotes, forumThreads, subjects, users } from "../lib/db/schema.js";
import type { Response } from "express";

export interface ThreadFeedFilters {
  board?: string;
  grade?: string;
  subjectId?: number;
  chapterId?: number;
  q?: string;
  solved?: "all" | "solved" | "unsolved";
  limit?: number;
  offset?: number;
}

export interface CreateThreadInput {
  title: string;
  body: string;
  subjectId?: number;
  chapterId?: number;
  userId: string;
}

export interface CreateReplyInput {
  body: string;
  parentReplyId?: string;
  threadId: string;
  userId: string;
}

export interface VoteInput {
  replyId: string;
  voteType: "upvote" | "downvote";
  userId: string;
}

export class ForumService {
  buildFilters(filters: ThreadFeedFilters): SQL | undefined {
    const clauses: SQL[] = [];

    if (filters.board) {
      clauses.push(eq(boards.slug, filters.board));
    }

    if (filters.grade) {
      clauses.push(sql`coalesce(${boardClasses.slug}, ${subjects.grade}::text) = ${filters.grade}`);
    }

    if (filters.subjectId) {
      clauses.push(eq(forumThreads.subjectId, filters.subjectId));
    }

    if (filters.chapterId) {
      clauses.push(eq(forumThreads.chapterId, filters.chapterId));
    }

    if (filters.q) {
      clauses.push(
        sql`to_tsvector('english', coalesce(${forumThreads.title}, '') || ' ' || coalesce(${forumThreads.body}, '')) @@ plainto_tsquery('english', ${filters.q})`
      );
    }

    if (filters.solved === "solved") {
      clauses.push(eq(forumThreads.isSolved, true));
    }

    if (filters.solved === "unsolved") {
      clauses.push(eq(forumThreads.isSolved, false));
    }

    return clauses.length > 0 ? and(...clauses) : undefined;
  }

  shapeThreadReplies(replyRows: Array<{
    id: string;
    threadId: string;
    userId: string;
    userName: string;
    parentReplyId: string | null;
    body: string;
    isAcceptedAnswer: boolean;
    upvotes: number;
    viewerVoteType: "upvote" | "downvote" | null;
    createdAt: Date;
    updatedAt: Date;
  }>) {
    type NestedReply = {
      id: string;
      threadId: string;
      userId: string;
      userName: string;
      parentReplyId: string;
      body: string;
      isAcceptedAnswer: boolean;
      upvotes: number;
      viewerVoteType: "upvote" | "downvote" | null;
      createdAt: Date;
      updatedAt: Date;
    };

    type ThreadReply = {
      id: string;
      threadId: string;
      userId: string;
      userName: string;
      parentReplyId: null;
      body: string;
      isAcceptedAnswer: boolean;
      upvotes: number;
      viewerVoteType: "upvote" | "downvote" | null;
      createdAt: Date;
      updatedAt: Date;
      replies: NestedReply[];
    };

    const topLevelReplies: ThreadReply[] = [];
    const topLevelById = new Map<string, ThreadReply>();

    for (const row of replyRows) {
      if (row.parentReplyId === null) {
        const topLevelReply: ThreadReply = {
          id: row.id,
          threadId: row.threadId,
          userId: row.userId,
          userName: row.userName,
          parentReplyId: null,
          body: row.body,
          isAcceptedAnswer: row.isAcceptedAnswer,
          upvotes: row.upvotes,
          viewerVoteType: row.viewerVoteType,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          replies: []
        };
        topLevelById.set(row.id, topLevelReply);
        topLevelReplies.push(topLevelReply);
      }
    }

    for (const row of replyRows) {
      if (!row.parentReplyId) {
        continue;
      }

      const parent = topLevelById.get(row.parentReplyId);
      if (!parent) {
        continue;
      }

      parent.replies.push({
        id: row.id,
        threadId: row.threadId,
        userId: row.userId,
        userName: row.userName,
        parentReplyId: row.parentReplyId,
        body: row.body,
        isAcceptedAnswer: row.isAcceptedAnswer,
        upvotes: row.upvotes,
        viewerVoteType: row.viewerVoteType,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      });
    }

    return topLevelReplies;
  }

  async resolveThreadSubjectId(input: { subjectId?: number; chapterId?: number }): Promise<{ subjectId: number | null } | { error: { status: number; body: { error: string } } }> {
    let resolvedSubjectId = input.subjectId ?? null;

    if (input.chapterId) {
      const chapterRows = await db
        .select({
          id: chapters.id,
          subjectId: chapters.subjectId
        })
        .from(chapters)
        .where(eq(chapters.id, input.chapterId))
        .limit(1);
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
      const subjectRows = await db
        .select({
          id: subjects.id
        })
        .from(subjects)
        .where(eq(subjects.id, resolvedSubjectId))
        .limit(1);

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

  async checkMutationRateLimit(res: Response, userId: string): Promise<boolean> {
    let rateLimit: Awaited<ReturnType<typeof consumeForumMutationRateLimit>>;
    try {
      rateLimit = await consumeForumMutationRateLimit(userId);
    } catch (error) {
      console.error("Forum mutation rate limit check failed:", error);
      res.status(503).json({
        error: "Forum mutation rate limiting is temporarily unavailable."
      });
      return false;
    }

    res.setHeader("x-ratelimit-limit", String(rateLimit.limit));
    res.setHeader("x-ratelimit-remaining", String(rateLimit.remaining));
    res.setHeader("x-ratelimit-reset", String(rateLimit.resetSeconds));

    if (!rateLimit.allowed) {
      res.setHeader("retry-after", String(rateLimit.resetSeconds));
      res.status(429).json({
        error: "Forum mutation rate limit exceeded.",
        retryAfterSeconds: rateLimit.resetSeconds
      });
      return false;
    }

    return true;
  }

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

    const insertedRows = await db
      .insert(forumThreads)
      .values({
        userId,
        title,
        body,
        subjectId: subjectResolution.subjectId,
        chapterId: chapterId ?? null
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

  async createReply(input: CreateReplyInput, userName: string): Promise<{ reply: Record<string, unknown> }> {
    const { body, parentReplyId, threadId, userId } = input;

    const moderation = moderateForumInput(body);
    if (moderation.blocked) {
      throw new Error("Forum content blocked by safety checks.");
    }

    const threadRows = await db
      .select({ id: forumThreads.id })
      .from(forumThreads)
      .where(eq(forumThreads.id, threadId))
      .limit(1);

    if (threadRows.length === 0) {
      throw new Error("Thread not found");
    }

    const resolvedParentId = parentReplyId ?? null;
    if (parentReplyId) {
      const parentReplyRows = await db
        .select({
          id: forumReplies.id,
          threadId: forumReplies.threadId,
          parentReplyId: forumReplies.parentReplyId
        })
        .from(forumReplies)
        .where(eq(forumReplies.id, parentReplyId))
        .limit(1);
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

    const insertedRows = await db
      .insert(forumReplies)
      .values({
        threadId,
        userId,
        parentReplyId: resolvedParentId,
        body
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

    return {
      reply: {
        ...insertedReply,
        userName
      }
    };
  }

  async voteReply(input: VoteInput): Promise<{ replyId: string; voteType: string; upvotes: number }> {
    const { replyId, voteType, userId } = input;

    const replyRows = await db
      .select({ id: forumReplies.id })
      .from(forumReplies)
      .where(eq(forumReplies.id, replyId))
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

    if (updatedUpvotes === null) {
      throw new Error("Unable to update vote.");
    }

    return { replyId, voteType, upvotes: updatedUpvotes };
  }

  async acceptReply(replyId: string, userId: string): Promise<{ replyId: string; threadId: string; isAcceptedAnswer: boolean; isSolved: boolean }> {
    const replyRows = await db
      .select({
        replyId: forumReplies.id,
        threadId: forumReplies.threadId,
        threadAuthorId: forumThreads.userId
      })
      .from(forumReplies)
      .innerJoin(forumThreads, eq(forumReplies.threadId, forumThreads.id))
      .where(eq(forumReplies.id, replyId))
      .limit(1);

    const reply = replyRows[0];
    if (!reply) {
      throw new Error("Reply not found");
    }

    if (reply.threadAuthorId !== userId) {
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
        .where(eq(forumReplies.id, replyId));

      await tx
        .update(forumThreads)
        .set({
          isSolved: true
        })
        .where(eq(forumThreads.id, reply.threadId));
    });

    return {
      replyId,
      threadId: reply.threadId,
      isAcceptedAnswer: true,
      isSolved: true
    };
  }
}

export const forumService = new ForumService();
