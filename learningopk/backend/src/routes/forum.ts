import { inArray, type SQL } from "drizzle-orm";
import { Router, type Response } from "express";
import { z } from "zod";

import { consumeForumMutationRateLimit, moderateForumInput } from "../lib/ai-guardrails.js";
import { getSessionFromRequest, requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { errorResponse, successResponse } from "../lib/response.js";
import { forumRepository } from "../repositories/forum.repository.js";
import { forumService } from "../services/forum.service.js";
import { isHttpError } from "../lib/errors/index.js";

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
  try {
    const rateLimit = await forumService.checkMutationRateLimit(userId);
    res.setHeader("x-ratelimit-limit", String(rateLimit.limit));
    res.setHeader("x-ratelimit-remaining", String(rateLimit.remaining));
    res.setHeader("x-ratelimit-reset", String(rateLimit.resetSeconds));
    return rateLimit.allowed;
  } catch (error) {
    if (isHttpError(error)) {
      res.status(error.status).json(error.toResponse());
    } else {
      res.status(503).json(errorResponse("Rate limit service unavailable.", "RATE_LIMIT_SERVICE_UNAVAILABLE"));
    }
    return false;
  }
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
    res.status(400).json(errorResponse("Invalid thread identifier", "VALIDATION_ERROR", parsedParams.error.flatten()));
    return;
  }

  const { threadId } = parsedParams.data;
  let viewerUserId: string | null = null;

  try {
    const session = await getSessionFromRequest(req);
    viewerUserId = session?.user.id ?? null;
  } catch (error) {
    // If auth service is unavailable, we can still show the thread (public content) but without personalized info
    // However, per trust boundaries, we should indicate service degradation but not fail the request entirely for public endpoint.
    // We could choose to return 503 if session is required for this endpoint, but it's not. So we continue without viewerUserId.
    console.warn("Auth service unavailable for thread view, proceeding without personalized data:", error);
  }

  // Only increment view count if explicitly requested via query param
  // This prevents inflated counts from SSR, refreshes, and bot requests
  if (req.query.trackView === "true") {
    try {
      await forumRepository.incrementThreadViews(threadId);
    } catch (error) {
      console.error("Failed to increment thread views:", error);
      // Do not fail the request if view increment fails
    }
  }

  const threadRows = await forumRepository.findThreadById(threadId);

  const thread = threadRows[0];
  if (!thread) {
    res.status(404).json(errorResponse("Thread not found", "NOT_FOUND"));
    return;
  }

  const replyRows = await forumRepository.findRepliesByThreadId(threadId);

  let voteByReplyId = new Map<string, "upvote" | "downvote">();
  if (viewerUserId && replyRows.length > 0) {
    const replyIds = replyRows.map((row) => row.id);
    try {
      const viewerVotes = await forumRepository.findVotesByUserAndReplies(viewerUserId, replyIds);
      voteByReplyId = new Map(viewerVotes.map((vote) => [vote.replyId, vote.voteType]));
    } catch (error) {
      // If vote lookup fails (e.g., DB issue), continue without personalized vote info
      console.warn("Failed to fetch user votes for thread replies:", error);
    }
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
    res.status(400).json(errorResponse("Invalid forum thread payload", "VALIDATION_ERROR", parsed.error.flatten()));
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  // Check rate limit first
  if (!(await applyForumMutationRateLimit(res, userId))) {
    return; // Rate limit response already sent by helper if failed
  }

  try {
    const result = await forumService.createThread({
      title: parsed.data.title,
      body: parsed.data.body,
      userId,
      chapterId: parsed.data.chapterId,
      subjectId: parsed.data.subjectId
    });

    res.status(201).json(successResponse({
      thread: {
        ...result.thread,
        userName: authedReq.session.user.name
      }
    }));
  } catch (error) {
    if (isHttpError(error)) {
      res.status(error.status).json(error.toResponse());
    } else {
      console.error("Unexpected error in createThread:", error);
      res.status(500).json(errorResponse("Internal server error", "INTERNAL_ERROR"));
    }
  }
});

forumRouter.post("/threads/:threadId/replies", requireSession, async (req, res) => {
  const parsedParams = threadParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json(errorResponse("Invalid thread identifier", "VALIDATION_ERROR", parsedParams.error.flatten()));
    return;
  }

  const parsed = replySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid forum reply payload", "VALIDATION_ERROR", parsed.error.flatten()));
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

    res.status(201).json(successResponse(result));
  } catch (error) {
    if (isHttpError(error)) {
      res.status(error.status).json(error.toResponse());
    } else {
      console.error("Unexpected error in createReply:", error);
      res.status(500).json(errorResponse("Internal server error", "INTERNAL_ERROR"));
    }
  }
});

forumRouter.post("/replies/:replyId/vote", requireSession, async (req, res) => {
  const parsedParams = replyParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json(errorResponse("Invalid reply identifier", "VALIDATION_ERROR", parsedParams.error.flatten()));
    return;
  }

  const parsedBody = replyVoteSchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json(errorResponse("Invalid vote payload", "VALIDATION_ERROR", parsedBody.error.flatten()));
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
    res.status(200).json(successResponse(result));
  } catch (error) {
    if (isHttpError(error)) {
      res.status(error.status).json(error.toResponse());
    } else {
      console.error("Unexpected error in voteReply:", error);
      res.status(500).json(errorResponse("Internal server error", "INTERNAL_ERROR"));
    }
  }
});

forumRouter.post("/replies/:replyId/accept", requireSession, async (req, res) => {
  const parsedParams = replyParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json(errorResponse("Invalid reply identifier", "VALIDATION_ERROR", parsedParams.error.flatten()));
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
    res.status(200).json(successResponse(result));
  } catch (error) {
    if (isHttpError(error)) {
      res.status(error.status).json(error.toResponse());
    } else {
      console.error("Unexpected error in acceptReply:", error);
      res.status(500).json(errorResponse("Internal server error", "INTERNAL_ERROR"));
    }
  }
});
