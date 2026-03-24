import { Router } from "express";
import { z } from "zod";

import { requireSession } from "../lib/session.js";
import type { AuthenticatedRequest } from "../lib/session.js";
import { progressService } from "../services/progress.service.js";

export const progressEventSchema = z.discriminatedUnion("eventType", [
  z.object({
    eventType: z.literal("chapter_visit"),
    chapterId: z.number().int().positive()
  }),
  z.object({
    eventType: z.literal("exercise_view"),
    chapterId: z.number().int().positive()
  }),
  z.object({
    eventType: z.literal("flashcard_complete"),
    chapterId: z.number().int().positive()
  }),
  z.object({
    eventType: z.literal("quiz_submit"),
    chapterId: z.number().int().positive(),
    score: z.number().int().nonnegative()
  })
]);
export const subjectParamSchema = z.object({
  subject: z.string().trim().regex(/^[a-z0-9-]+$/)
});

export const progressRouter = Router();

progressRouter.post("/events", requireSession, async (req, res) => {
  const parsed = progressEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid progress event payload",
      details: parsed.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;

  try {
    const result = await progressService.recordProgressEvent({
      ...parsed.data,
      userId: authedReq.session.user.id
    });

    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

progressRouter.get("/dashboard", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  try {
    const dashboard = await progressService.getDashboard(userId, authedReq.session.user.name);
    res.status(200).json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

progressRouter.get("/dashboard/:subject", requireSession, async (req, res) => {
  const params = subjectParamSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({
      error: "Invalid subject route parameter",
      details: params.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  try {
    const subjectDashboard = await progressService.getSubjectDashboard(userId, params.data.subject);
    if (!subjectDashboard) {
      res.status(404).json({ error: "Subject not found" });
      return;
    }
    res.status(200).json(subjectDashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});
