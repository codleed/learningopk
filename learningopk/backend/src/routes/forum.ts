import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { Router, type Response } from "express";
import { z } from "zod";

import { consumeForumMutationRateLimit, moderateForumInput } from "../lib/ai-guardrails.js";
import { db } from "../lib/db/index.js";
import { boardClasses, boards, chapters, forumReplies, forumReplyVotes, forumThreads, subjects, users } from "../lib/db/schema.js";
import { getSessionFromRequest, requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { forumService } from "../services/forum.service.js";

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
  grade: z.string().trim().regex(/^[a-z0-9-]+$/).optional(),
  subjectId: z.coerce.number().int().positive().optional(),
  chapterId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().min(1).max(160).optional(),
  solved: z.enum(["all", "solved", "unsolved"]).optional().default("all"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0)
});

type ThreadFeedFilters = z.infer<typeof threadFeedQuerySchema>;

export const forumRouter = Router();

const applyForumMutationRateLimit = async (res: Response, userId: string): Promise<boolean> => {
  return forumService.checkMutationRateLimit(res, userId);
};

forumRouter.get("/filters", async (_req, res) => {
  const { boards: boardRows, subjects: subjectRows, chapters: chapterRows, classes: classRows } = await forumService.getFilters
    ? { boards: [], subjects: [], chapters: [], classes: [] }
    : { boards: [], subjects: [], chapters: [], classes: [] };

  const filters = await db
    .select({
      id: boards.id,
      name: boards.name,
      slug: boards.slug
    })
    .from(boards)
    .orderBy(asc(boards.name));

  const subjectRowsData = await db
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

  const chapterRowsData = await db
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

  const classRowsData = await db
    .select({
      id: boardClasses.id,
      boardId: boardClasses.boardId,
      name: boardClasses.name,
      slug: boardClasses.slug
    })
    .from(boardClasses)
    .orderBy(asc(boardClasses.boardId), asc(boardClasses.name));

  res.status(200).json({
    boards: filters,
    classes: classRowsData,
    subjects: subjectRowsData,
    chapters: chapterRowsData
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

  const whereClause = forumService.buildFilters(filters);

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
    .where(whereClause)
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
      replies: forumService.shapeThreadReplies(replyRowsWithVotes),
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

  try {
    const result = await forumService.createThread({
      title,
      body,
      userId,
      chapterId,
      subjectId: parsed.data.subjectId
    });

    res.status(201).json({
      thread: {
        ...result.thread,
        userName: authedReq.session.user.name
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("blocked by safety checks")) {
      res.status(422).json({
        error: "Forum content blocked by safety checks.",
        reason: message
      });
      return;
    }
    res.status(500).json({ error: message });
  }
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

  try {
    const result = await forumService.createReply({
      body: parsed.data.body,
      parentReplyId: parsed.data.parentReplyId,
      threadId,
      userId
    }, authedReq.session.user.name);

    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("blocked by safety checks")) {
      res.status(422).json({
        error: "Forum content blocked by safety checks.",
        reason: message
      });
      return;
    }
    if (message.includes("not found")) {
      res.status(404).json({ error: message });
      return;
    }
    if (message.includes("does not belong") || message.includes("Only one level")) {
      res.status(400).json({ error: message });
      return;
    }
    res.status(500).json({ error: message });
  }
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

  try {
    const result = await forumService.voteReply({ replyId, voteType, userId });
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      res.status(404).json({ error: message });
      return;
    }
    res.status(500).json({ error: message });
  }
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

  try {
    const result = await forumService.acceptReply(replyId, userId);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      res.status(404).json({ error: message });
      return;
    }
    if (message.includes("Only the thread author")) {
      res.status(403).json({ error: message });
      return;
    }
    res.status(500).json({ error: message });
  }
});
