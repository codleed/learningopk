import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { db } from "../lib/db/index.js";
import { quizAttempts, quizQuestions, quizzes } from "../lib/db/schema.js";
import { getInvalidAnswerQuestionIds, scoreQuizSubmission } from "../lib/quiz-scoring.js";
import { applyProgressEvent } from "../lib/progress.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";

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

  const quizRows = await db
    .select({
      id: quizzes.id,
      chapterId: quizzes.chapterId,
      totalMarks: quizzes.totalMarks,
      type: quizzes.type
    })
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);

  const quizRow = quizRows[0];
  if (!quizRow) {
    res.status(404).json({
      error: "Quiz not found"
    });
    return;
  }

  const questionRows = await db
    .select({
      id: quizQuestions.id,
      question: quizQuestions.question,
      optionA: quizQuestions.optionA,
      optionB: quizQuestions.optionB,
      optionC: quizQuestions.optionC,
      optionD: quizQuestions.optionD,
      correctOption: quizQuestions.correctOption,
      explanation: quizQuestions.explanation,
      marks: quizQuestions.marks
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId));

  if (questionRows.length === 0) {
    res.status(422).json({
      error: "Quiz has no questions to score."
    });
    return;
  }

  const invalidAnswerQuestionIds = getInvalidAnswerQuestionIds(questionRows, answers);
  if (invalidAnswerQuestionIds.length > 0) {
    res.status(400).json({
      error: "Answers include question IDs that do not belong to this quiz.",
      invalidQuestionIds: invalidAnswerQuestionIds
    });
    return;
  }

  const { questionResults, score, totalMarks, percentage } = scoreQuizSubmission({
    questionRows,
    answers,
    configuredTotalMarks: quizRow.totalMarks
  });

  const completedAt = new Date();
  const startedAtDate = startedAt ? new Date(startedAt) : completedAt;
  if (Number.isNaN(startedAtDate.getTime())) {
    res.status(400).json({
      error: "Invalid startedAt timestamp."
    });
    return;
  }
  const normalizedStartedAt = startedAtDate <= completedAt ? startedAtDate : completedAt;

  const insertedAttemptRows = await db
    .insert(quizAttempts)
    .values({
      userId,
      quizId,
      answers,
      score,
      totalMarks,
      startedAt: normalizedStartedAt,
      completedAt
    })
    .returning({
      id: quizAttempts.id,
      completedAt: quizAttempts.completedAt
    });

  const insertedAttempt = insertedAttemptRows[0];
  if (!insertedAttempt) {
    res.status(500).json({
      error: "Could not save quiz attempt."
    });
    return;
  }

  await applyProgressEvent({
    eventType: "quiz_submit",
    userId,
    chapterId: quizRow.chapterId,
    score,
    occurredAt: completedAt
  });

  const timeSpentSeconds = Math.max(0, Math.floor((completedAt.getTime() - normalizedStartedAt.getTime()) / 1000));

  res.status(200).json({
    attemptId: insertedAttempt.id,
    quizId,
    quizType: quizRow.type,
    score,
    totalMarks,
    percentage,
    timeSpentSeconds,
    completedAt: insertedAttempt.completedAt.toISOString(),
    questionResults
  });
});
