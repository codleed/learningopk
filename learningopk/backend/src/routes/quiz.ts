import { Router } from "express";
import { z } from "zod";

import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { quizService } from "../services/quiz.service.js";
import { isHttpError } from "../lib/errors/index.js";
import { errorResponse } from "../lib/response.js";

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
    if (isHttpError(error)) {
      res.status(error.status).json(error.toResponse());
    } else {
      console.error("Unexpected error in submitQuiz:", error);
      res.status(500).json(errorResponse("Internal server error", "INTERNAL_ERROR"));
    }
  }
});
