import { Router } from "express";
import { z } from "zod";

import { errorResponse } from "../lib/response.js";
import { requireSession } from "../lib/session.js";
import type { AuthenticatedRequest } from "../lib/session.js";
import { progressService } from "../services/progress.service.js";
import { studyGroupsService } from "../services/study-groups.service.js";

export const progressEventSchema = z.discriminatedUnion("eventType", [
  z.object({
    eventType: z.literal("chapter_visit"),
    chapterId: z.number().int().positive(),
  }),
  z.object({
    eventType: z.literal("summary_read"),
    chapterId: z.number().int().positive(),
  }),
  z.object({
    eventType: z.literal("subpart_read"),
    chapterId: z.number().int().positive(),
    subpartId: z.number().int().positive(),
  }),
  z.object({
    eventType: z.literal("exercise_view"),
    chapterId: z.number().int().positive(),
  }),
  z.object({
    eventType: z.literal("flashcard_complete"),
    chapterId: z.number().int().positive(),
  }),
  z.object({
    eventType: z.literal("quiz_submit"),
    chapterId: z.number().int().positive(),
    score: z.number().int().nonnegative(),
  }),
]);
export const subjectDashboardParamSchema = z.object({
  boardSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/),
  grade: z.enum(["9", "10"]),
  subjectSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/),
});
export const streakWagerSchema = z.object({
  amount: z.number().int().min(25).max(100),
});
export const todaysFocusCompletionSchema = z.object({});

export const progressRouter = Router();

progressRouter.post("/events", requireSession, async (req, res) => {
  const parsed = progressEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid progress event payload",
      details: parsed.error.flatten(),
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;

  try {
    const result = await progressService.recordProgressEvent({
      ...parsed.data,
      userId: authedReq.session.user.id,
    });

    if (parsed.data.eventType === "chapter_visit") {
      await studyGroupsService.recordChapterCompletion({
        userId: authedReq.session.user.id,
        chapterId: parsed.data.chapterId,
      });
    }

    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

progressRouter.get("/dashboard", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;
  const userBoard = authedReq.session.user.board;
  const userClass = authedReq.session.user.class;

  try {
    const dashboard = await progressService.getDashboard(
      userId,
      authedReq.session.user.name,
      userBoard ?? "",
      userClass ?? ""
    );
    res.status(200).json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json(errorResponse(message, "INTERNAL_ERROR"));
  }
});

progressRouter.get(
  "/dashboard/:boardSlug/:grade/:subjectSlug",
  requireSession,
  async (req, res) => {
    const params = subjectDashboardParamSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({
        error: "Invalid subject route parameters",
        details: params.error.flatten(),
      });
      return;
    }

    const authedReq = req as AuthenticatedRequest;
    const userId = authedReq.session.user.id;

    try {
      const subjectDashboard = await progressService.getSubjectDashboard(
        userId,
        params.data.boardSlug,
        params.data.grade,
        params.data.subjectSlug
      );
      if (!subjectDashboard) {
        res.status(404).json({ error: "Subject not found" });
        return;
      }
      res.status(200).json(subjectDashboard);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  }
);

progressRouter.post("/streak-wager", requireSession, async (req, res) => {
  const parsed = streakWagerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid streak wager payload",
      details: parsed.error.flatten(),
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;

  try {
    await progressService.placeStreakWager(authedReq.session.user.id, parsed.data.amount);
    res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

progressRouter.post("/streak-wager/recover", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;

  try {
    await progressService.recoverBrokenStreakWager(authedReq.session.user.id);
    res.status(200).json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

progressRouter.post("/todays-focus/complete", requireSession, async (req, res) => {
  const parsed = todaysFocusCompletionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid today's focus completion payload",
      details: parsed.error.flatten(),
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  const userBoard = authedReq.session.user.board;
  const userClass = authedReq.session.user.class;

  if (!userBoard) {
    res
      .status(400)
      .json(
        errorResponse(
          "User board not set. Complete onboarding to view your dashboard.",
          "VALIDATION_ERROR"
        )
      );
    return;
  }
  if (!userClass) {
    res
      .status(400)
      .json(
        errorResponse(
          "User class not set. Complete onboarding to view your dashboard.",
          "VALIDATION_ERROR"
        )
      );
    return;
  }

  try {
    const result = await progressService.completeTodaysFocus(
      authedReq.session.user.id,
      userBoard,
      userClass
    );
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json(errorResponse(message, "INTERNAL_ERROR"));
  }
});
