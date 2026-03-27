import { inArray, type SQL } from "drizzle-orm";
import { Router, type Response } from "express";
import { z } from "zod";

import { consumeForumMutationRateLimit } from "../lib/ai-guardrails.js";
import { getSessionFromRequest, requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { forumRepository } from "../repositories/forum.repository.js";
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
  const filtersData = await forumRepository.findFilters();

  res.status(200).json({
    boards: filtersData.boards,
    classes: filtersData.classes,
    subjects: filtersData.subjects,
    chapters: filtersData.chapters
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
  const whereClause = forumService.buildFilters(filters);

  const threadRows = await forumRepository.findThreads(whereClause, filters.limit, filters.offset, filters.q);

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

  await forumRepository.incrementThreadViews(threadId);

  const threadRows = await forumRepository.findThreadById(threadId);

  const thread = threadRows[0];
  if (!thread) {
    res.status(404).json({
      error: "Thread not found"
    });
    return;
  }

  const replyRows = await forumRepository.findRepliesByThreadId(threadId);

  let voteByReplyId = new Map<string, "upvote" | "downvote">();
  if (viewerUserId && replyRows.length > 0) {
    const replyIds = replyRows.map((row) => row.id);
    const viewerVotes = await forumRepository.findVotesByUserAndReplies(viewerUserId, replyIds);
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
