import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { Router, type Response } from "express";
import { z } from "zod";

import { consumeForumMutationRateLimit, moderateForumInput } from "../lib/ai-guardrails.js";
import { db } from "../lib/db/index.js";
import { boards, chapters, forumReplies, forumReplyVotes, forumThreads, subjects, users } from "../lib/db/schema.js";
import { getSessionFromRequest, requireSession, type AuthenticatedRequest } from "../lib/session.js";

const createThreadSchema = z.object({
  title: z.string().trim().min(5).max(160),
  body: z.string().trim().min(10),
  subjectId: z.number().int().positive().optional(),
  chapterId: z.number().int().positive().optional()
});

const threadParamsSchema = z.object({
  threadId: z.string().uuid()
});

const replyParamsSchema = z.object({
  replyId: z.string().uuid()
});

const replySchema = z.object({
  body: z.string().trim().min(2),
  parentReplyId: z.string().uuid().optional()
});

const replyVoteSchema = z.object({
  voteType: z.enum(["upvote", "downvote"])
});

const threadFeedQuerySchema = z.object({
  board: z.string().trim().regex(/^[a-z0-9-]+$/).optional(),
  grade: z.enum(["9", "10"]).optional(),
  subjectId: z.coerce.number().int().positive().optional(),
  chapterId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().min(1).max(160).optional(),
  solved: z.enum(["all", "solved", "unsolved"]).optional().default("all"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0)
});

type ThreadFeedFilters = z.infer<typeof threadFeedQuerySchema>;

type ReplyRow = {
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
};

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

const buildForumFilters = (filters: ThreadFeedFilters) => {
  const clauses: SQL[] = [];

  if (filters.board) {
    clauses.push(eq(boards.slug, filters.board));
  }

  if (filters.grade) {
    clauses.push(eq(subjects.grade, filters.grade));
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
};

const shapeThreadReplies = (replyRows: ReplyRow[]): ThreadReply[] => {
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
};

const resolveThreadSubjectId = async (input: { subjectId?: number; chapterId?: number }) => {
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
        } as const
      };
    }

    if (resolvedSubjectId && resolvedSubjectId !== chapterRow.subjectId) {
      return {
        error: {
          status: 400,
          body: { error: "subjectId must match the selected chapter subject." }
        } as const
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
        } as const
      };
    }
  }

  return {
    subjectId: resolvedSubjectId
  } as const;
};

export const forumRouter = Router();

const applyForumMutationRateLimit = async (res: Response, userId: string): Promise<boolean> => {
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
};

forumRouter.get("/filters", async (_req, res) => {
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
      boardId: subjects.boardId
    })
    .from(subjects)
    .orderBy(asc(subjects.boardId), asc(subjects.grade), asc(subjects.name));

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

  res.status(200).json({
    boards: boardRows,
    subjects: subjectRows,
    chapters: chapterRows
  });
});

forumRouter.get("/threads", async (req, res) => {
  const parsed = threadFeedQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid forum feed query parameters",
      details: parsed.error.flatten()
    });
    return;
  }

  const filters = parsed.data;
  const relevanceScoreSql = filters.q
    ? sql<number>`ts_rank(
        to_tsvector('english', coalesce(${forumThreads.title}, '') || ' ' || coalesce(${forumThreads.body}, '')),
        plainto_tsquery('english', ${filters.q})
      )`
    : sql<number>`0`;

  const orderByClauses = filters.q
    ? [desc(relevanceScoreSql), desc(forumThreads.isPinned), desc(forumThreads.createdAt)]
    : [desc(forumThreads.isPinned), desc(forumThreads.createdAt)];

  const threadRows = await db
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
      grade: subjects.grade,
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
    .where(buildForumFilters(filters))
    .orderBy(...orderByClauses)
    .limit(filters.limit)
    .offset(filters.offset);

  res.status(200).json({
    threads: threadRows
  });
});

forumRouter.get("/threads/:threadId", async (req, res) => {
  const parsedParams = threadParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid thread identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const { threadId } = parsedParams.data;
  const session = await getSessionFromRequest(req);
  const viewerUserId = session?.user.id ?? null;

  const updatedRows = await db
    .update(forumThreads)
    .set({
      views: sql`${forumThreads.views} + 1`
    })
    .where(eq(forumThreads.id, threadId))
    .returning({
      id: forumThreads.id
    });

  if (updatedRows.length === 0) {
    res.status(404).json({
      error: "Thread not found"
    });
    return;
  }

  const threadRows = await db
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
      grade: subjects.grade,
      subjectName: subjects.name
    })
    .from(forumThreads)
    .innerJoin(users, eq(forumThreads.userId, users.id))
    .leftJoin(subjects, eq(forumThreads.subjectId, subjects.id))
    .leftJoin(boards, eq(subjects.boardId, boards.id))
    .where(eq(forumThreads.id, threadId))
    .limit(1);

  const thread = threadRows[0];
  if (!thread) {
    res.status(404).json({
      error: "Thread not found"
    });
    return;
  }

  const replyRows = await db
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

  let voteByReplyId = new Map<string, "upvote" | "downvote">();
  if (viewerUserId && replyRows.length > 0) {
    const viewerVotes = await db
      .select({
        replyId: forumReplyVotes.replyId,
        voteType: forumReplyVotes.voteType
      })
      .from(forumReplyVotes)
      .where(and(eq(forumReplyVotes.userId, viewerUserId), inArray(forumReplyVotes.replyId, replyRows.map((row) => row.id))));

    voteByReplyId = new Map(viewerVotes.map((vote) => [vote.replyId, vote.voteType]));
  }

  const replyRowsWithVotes = replyRows.map((row) => ({
    ...row,
    viewerVoteType: voteByReplyId.get(row.id) ?? null
  }));

  res.status(200).json({
    thread: {
      ...thread,
      replies: shapeThreadReplies(replyRowsWithVotes),
      replyCount: replyRowsWithVotes.length
    }
  });
});

forumRouter.post("/threads", requireSession, async (req, res) => {
  const parsed = createThreadSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid forum thread payload",
      details: parsed.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;
  const { title, body, chapterId } = parsed.data;
  if (!(await applyForumMutationRateLimit(res, userId))) {
    return;
  }

  const moderation = moderateForumInput(`${title}\n${body}`);
  if (moderation.blocked) {
    res.status(422).json({
      error: "Forum content blocked by safety checks.",
      reason: moderation.reason
    });
    return;
  }

  const subjectResolution = await resolveThreadSubjectId({
    ...(parsed.data.subjectId ? { subjectId: parsed.data.subjectId } : {}),
    ...(chapterId ? { chapterId } : {})
  });

  if ("error" in subjectResolution) {
    res.status(subjectResolution.error.status).json(subjectResolution.error.body);
    return;
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
    res.status(500).json({
      error: "Unable to create thread."
    });
    return;
  }

  res.status(201).json({
    thread: {
      ...insertedThread,
      userName: authedReq.session.user.name,
      boardSlug: null,
      boardName: null,
      grade: null,
      subjectName: null,
      replyCount: 0
    }
  });
});

forumRouter.post("/threads/:threadId/replies", requireSession, async (req, res) => {
  const parsedParams = threadParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid thread identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsed = replySchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid forum reply payload",
      details: parsed.error.flatten()
    });
    return;
  }

  const { threadId } = parsedParams.data;
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;
  if (!(await applyForumMutationRateLimit(res, userId))) {
    return;
  }

  const moderation = moderateForumInput(parsed.data.body);
  if (moderation.blocked) {
    res.status(422).json({
      error: "Forum content blocked by safety checks.",
      reason: moderation.reason
    });
    return;
  }

  const threadRows = await db
    .select({
      id: forumThreads.id
    })
    .from(forumThreads)
    .where(eq(forumThreads.id, threadId))
    .limit(1);

  if (threadRows.length === 0) {
    res.status(404).json({
      error: "Thread not found"
    });
    return;
  }

  const parentReplyId = parsed.data.parentReplyId ?? null;
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
      res.status(404).json({
        error: "Parent reply not found"
      });
      return;
    }

    if (parentReply.threadId !== threadId) {
      res.status(400).json({
        error: "Parent reply does not belong to this thread."
      });
      return;
    }

    if (parentReply.parentReplyId) {
      res.status(400).json({
        error: "Only one level of nested replies is allowed."
      });
      return;
    }
  }

  const insertedRows = await db
    .insert(forumReplies)
    .values({
      threadId,
      userId,
      parentReplyId,
      body: parsed.data.body
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
    res.status(500).json({
      error: "Unable to create reply."
    });
    return;
  }

  res.status(201).json({
    reply: {
      ...insertedReply,
      userName: authedReq.session.user.name
    }
  });
});

forumRouter.post("/replies/:replyId/vote", requireSession, async (req, res) => {
  const parsedParams = replyParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid reply identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = replyVoteSchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid vote payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const { replyId } = parsedParams.data;
  const { voteType } = parsedBody.data;
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;
  if (!(await applyForumMutationRateLimit(res, userId))) {
    return;
  }

  const replyRows = await db
    .select({
      id: forumReplies.id
    })
    .from(forumReplies)
    .where(eq(forumReplies.id, replyId))
    .limit(1);

  if (replyRows.length === 0) {
    res.status(404).json({
      error: "Reply not found"
    });
    return;
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
    res.status(500).json({
      error: "Unable to update vote."
    });
    return;
  }

  res.status(200).json({
    replyId,
    voteType,
    upvotes: updatedUpvotes
  });
});

forumRouter.post("/replies/:replyId/accept", requireSession, async (req, res) => {
  const parsedParams = replyParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid reply identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const { replyId } = parsedParams.data;
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;
  if (!(await applyForumMutationRateLimit(res, userId))) {
    return;
  }

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
    res.status(404).json({
      error: "Reply not found"
    });
    return;
  }

  if (reply.threadAuthorId !== userId) {
    res.status(403).json({
      error: "Only the thread author can mark an accepted answer."
    });
    return;
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

  res.status(200).json({
    replyId,
    threadId: reply.threadId,
    isAcceptedAnswer: true,
    isSolved: true
  });
});
