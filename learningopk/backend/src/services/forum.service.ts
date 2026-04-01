import { and, asc, eq, sql, type SQL } from "drizzle-orm";

import { consumeForumMutationRateLimit, moderateForumInput } from "../lib/ai-guardrails.js";
import { boardClasses, boards, chapters, forumReplies, forumReplyVotes, forumThreads, subjects } from "../lib/db/schema.js";
import { db } from "../lib/db/index.js";
import { forumRepository } from "../repositories/forum.repository.js";
import { xpService } from "./xp.service.js";
import type { Response } from "express";
import {
  ForbiddenError,
  ModerationError,
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
  isHttpError
} from "../lib/errors/index.js";

export interface ThreadFeedFilters {
  board?: string | undefined;
  grade?: string | undefined;
  subjectId?: number | undefined;
  chapterId?: number | undefined;
  q?: string | undefined;
  solved?: "all" | "solved" | "unsolved" | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface CreateThreadInput {
  title: string;
  body: string;
  subjectId?: number | undefined;
  chapterId?: number | undefined;
  userId: string;
}

export interface CreateReplyInput {
  body: string;
  parentReplyId?: string | undefined;
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

  async resolveThreadSubjectId(input: { subjectId?: number; chapterId?: number }): Promise<{ subjectId: number }> {
    let resolvedSubjectId = input.subjectId ?? null;

    if (input.chapterId) {
      const chapterRows = await forumRepository.findChapterById(input.chapterId);
      const chapterRow = chapterRows[0];

      if (!chapterRow) {
        throw new NotFoundError("Chapter not found.");
      }

      // Validate chapter is published
      if (!chapterRow.isPublished) {
        throw new ValidationError("Cannot create thread in an unpublished chapter.");
      }

      if (resolvedSubjectId && resolvedSubjectId !== chapterRow.subjectId) {
        throw new ValidationError("subjectId must match the selected chapter subject.");
      }

      resolvedSubjectId = resolvedSubjectId ?? chapterRow.subjectId;
    }

    if (resolvedSubjectId) {
      const subjectRows = await forumRepository.findSubjectById(resolvedSubjectId);

      if (subjectRows.length === 0) {
        throw new NotFoundError("Subject not found.");
      }
    }

    if (resolvedSubjectId === null) {
      throw new ValidationError("Either subjectId or chapterId must be provided.");
    }

    return { subjectId: resolvedSubjectId };
  }

  async checkMutationRateLimit(userId: string): Promise<{ allowed: boolean; limit: number; remaining: number; resetSeconds: number }> {
    let rateLimit: Awaited<ReturnType<typeof consumeForumMutationRateLimit>>;
    try {
      rateLimit = await consumeForumMutationRateLimit(userId);
    } catch (error) {
      console.error("Forum mutation rate limit check failed:", error);
      throw new ServiceUnavailableError("Forum mutation rate limiting is temporarily unavailable.");
    }

    return {
      allowed: rateLimit.allowed,
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      resetSeconds: rateLimit.resetSeconds
    };
  }

  async createThread(input: CreateThreadInput): Promise<{ thread: Record<string, unknown> }> {
    const { title, body, userId, chapterId } = input;

    const moderation = moderateForumInput(`${title}\n${body}`);
    if (moderation.blocked) {
      throw new ModerationError("Forum content blocked by safety checks.", moderation.reason ?? undefined);
    }

    const subjectResolution = await this.resolveThreadSubjectId({
      ...(input.subjectId ? { subjectId: input.subjectId } : {}),
      ...(chapterId ? { chapterId } : {})
    });

    const result = await forumRepository.createThread({
      userId,
      title,
      body,
      subjectId: subjectResolution.subjectId,
      chapterId: chapterId ?? null
    });

    return result;
  }

  async createReply(input: CreateReplyInput, userName: string): Promise<{ reply: Record<string, unknown> }> {
    const { body, parentReplyId, threadId, userId } = input;

    const moderation = moderateForumInput(body);
    if (moderation.blocked) {
      throw new ModerationError("Forum content blocked by safety checks.", moderation.reason ?? undefined);
    }

    const threadRows = await forumRepository.findThreadByIdForReply(threadId);
    if (threadRows.length === 0) {
      throw new NotFoundError("Thread not found.");
    }

    const resolvedParentId = parentReplyId ?? null;
    if (parentReplyId) {
      const parentReplyRows = await forumRepository.findReplyParent(parentReplyId);
      const parentReply = parentReplyRows[0];

      if (!parentReply) {
        throw new NotFoundError("Parent reply not found.");
      }

      if (parentReply.threadId !== threadId) {
        throw new ValidationError("Parent reply does not belong to this thread.");
      }

      if (parentReply.parentReplyId) {
        throw new ValidationError("Only one level of nested replies is allowed.");
      }
    }

    const result = await forumRepository.createReply({
      userId,
      body,
      parentReplyId: resolvedParentId,
      threadId
    });

    return {
      reply: {
        ...result.reply,
        userName
      }
    };
  }

  async voteReply(input: VoteInput): Promise<{ replyId: string; voteType: string; upvotes: number }> {
    const replyRows = await forumRepository.findReplyById(input.replyId);
    if (replyRows.length === 0) {
      throw new NotFoundError("Reply not found.");
    }

    try {
      return await forumRepository.voteReply({
        replyId: input.replyId,
        userId: input.userId,
        voteType: input.voteType
      });
    } catch (error) {
      if (isHttpError(error)) {
        throw error;
      }
      throw new Error("Unable to update vote.");
    }
  }

  async acceptReply(replyId: string, userId: string): Promise<{ 
    replyId: string; 
    threadId: string; 
    isAcceptedAnswer: boolean; 
    isSolved: boolean; 
    replyAuthorId?: string; 
    xpAwarded?: boolean; 
    xp?: { xpAwarded: number; newXp: number; level: number; levelName: string; leveledUp: boolean };
    xpFailed?: boolean 
  }> {
    try {
      const result = await forumRepository.acceptReply({ replyId, userId });

      // Award XP if this is a new acceptance
      if (result.xpAwarded && result.replyAuthorId) {
        try {
          const xpResult = await xpService.awardForumAnswerAcceptedXp(result.replyAuthorId);
          return {
            ...result,
            xp: {
              xpAwarded: xpResult.xpAwarded,
              newXp: xpResult.newXp,
              level: xpResult.level,
              levelName: xpResult.levelName,
              leveledUp: xpResult.leveledUp
            }
          };
        } catch (error) {
          console.error("Failed to award XP for accepted forum answer:", error);
          return {
            ...result,
            xpFailed: true
          };
        }
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          throw new NotFoundError(error.message);
        }
        if (error.message.includes("Only the thread author")) {
          throw new ForbiddenError(error.message);
        }
      }
      throw error;
    }
  }
}

export const forumService = new ForumService();
