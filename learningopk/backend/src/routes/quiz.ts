import { Router } from "express";
import { z } from "zod";

import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { quizService } from "../services/quiz.service.js";

export const submitQuizSchema = z.object({
  quizId: z.number().int().positive(),
  answers: z.record(z.string().regex(/^\d+$/), z.enum(["a", "b", "c", "d"])),
  startedAt: z.string().datetime().optional()
});

export const quizRouter = Router();

quizRouter.post("/submit", requireSession, async (req, res) => {
  const parsed = submitQuizSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid quiz submission payload",
      details: parsed.error.flatten()
    });
    return;
  }

  const { quizId, answers, startedAt } = parsed.data;
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  try {
    const result = await quizService.submitQuiz({
      quizId,
      answers,
      startedAt,
      userId
    });

    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Quiz not found") {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }
    if (message === "Quiz has no questions to score") {
      res.status(422).json({ error: "Quiz has no questions to score." });
      return;
    }
    if (message.includes("Answers include question IDs")) {
      res.status(400).json({
        error: "Answers include question IDs that do not belong to this quiz."
      });
      return;
    }
    res.status(500).json({ error: message });
  }
});
