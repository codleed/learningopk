import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { requireAdminRole } from "../../../lib/admin.js";
import { CacheKeys, cacheService } from "../../../lib/cache/cache.service.js";
import { db } from "../../../lib/db/index.js";
import { quizQuestions, quizzes } from "../../../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../../../lib/session.js";
import { persistAuditLog, type AdminAuditScope } from "../shared.js";
import { recalculateQuizTotalMarks } from "./quizzes.js";

export const quizQuestionsAdminRouter = Router();

const quizQuestionCreateBodySchema = z.object({
  quizId: z.coerce.number().int().positive(),
  chapterId: z.coerce.number().int().positive().optional(),
  question: z.string().trim().min(1),
  optionA: z.string().trim().min(1),
  optionB: z.string().trim().min(1),
  optionC: z.string().trim().min(1),
  optionD: z.string().trim().min(1),
  correctOption: z.enum(["a", "b", "c", "d"]),
  explanation: z.string().trim().optional(),
  marks: z.coerce.number().int().positive().optional().default(1)
});

const quizQuestionUpdateBodySchema = z.object({
  question: z.string().trim().min(1),
  optionA: z.string().trim().min(1),
  optionB: z.string().trim().min(1),
  optionC: z.string().trim().min(1),
  optionD: z.string().trim().min(1),
  correctOption: z.enum(["a", "b", "c", "d"]),
  explanation: z.string().trim().optional(),
  marks: z.coerce.number().int().positive().optional().default(1)
});

const quizQuestionListQuerySchema = z.object({
  quizId: z.coerce.number().int().positive()
});

const quizQuestionParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

/**
 * POST /api/admin/content/quiz-questions - Add question to quiz
 */
quizQuestionsAdminRouter.post("/content/quiz-questions", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = quizQuestionCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    console.error("[quiz-questions POST] Validation failed:", {
      body: req.body,
      errors: parsedBody.error.flatten()
    });
    res.status(400).json({
      error: "Invalid quiz question payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  // Verify quiz exists
  const quizRows = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      chapterId: quizzes.chapterId
    })
    .from(quizzes)
    .where(eq(quizzes.id, parsedBody.data.quizId))
    .limit(1);

  const quiz = quizRows[0];
  if (!quiz) {
    await persistAuditLog({
      scope: "content",
      action: "Add quiz question",
      target: `Quiz #${parsedBody.data.quizId}`,
      status: "failed",
      message: "Quiz not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  const insertedRows = await db
    .insert(quizQuestions)
    .values({
      quizId: parsedBody.data.quizId,
      chapterId: parsedBody.data.chapterId ?? quiz.chapterId,
      question: parsedBody.data.question.trim(),
      optionA: parsedBody.data.optionA.trim(),
      optionB: parsedBody.data.optionB.trim(),
      optionC: parsedBody.data.optionC.trim(),
      optionD: parsedBody.data.optionD.trim(),
      correctOption: parsedBody.data.correctOption,
      explanation: parsedBody.data.explanation?.trim() ?? null,
      marks: parsedBody.data.marks ?? 1
    })
    .returning({
      id: quizQuestions.id,
      quizId: quizQuestions.quizId,
      chapterId: quizQuestions.chapterId,
      question: quizQuestions.question,
      optionA: quizQuestions.optionA,
      optionB: quizQuestions.optionB,
      optionC: quizQuestions.optionC,
      optionD: quizQuestions.optionD,
      correctOption: quizQuestions.correctOption,
      explanation: quizQuestions.explanation,
      marks: quizQuestions.marks
    });

  const newQuestion = insertedRows[0];
  if (!newQuestion) {
    await persistAuditLog({
      scope: "content",
      action: "Add quiz question",
      target: `Quiz #${quiz.id}`,
      status: "failed",
      message: "Failed to add quiz question",
      actorId,
      actorName
    });
    res.status(500).json({ error: "Failed to add quiz question" });
    return;
  }

  // Recalculate quiz totalMarks
  const newTotalMarks = await recalculateQuizTotalMarks(quiz.id);

  // Invalidate quiz questions cache + chapter content cache
  await cacheService.delete(CacheKeys.quizQuestions(quiz.id));
  await cacheService.delete(CacheKeys.chapterContent(quiz.chapterId));

  await persistAuditLog({
    scope: "content",
    action: "Add quiz question",
    target: `Quiz #${quiz.id} - ${quiz.title}`,
    status: "success",
    message: `Added question to quiz (new total marks: ${newTotalMarks})`,
    actorId,
    actorName
  });

  res.status(201).json({
    data: newQuestion
  });
});

/**
 * GET /api/admin/content/quiz-questions?quizId=N - List questions for a quiz
 */
quizQuestionsAdminRouter.get("/content/quiz-questions", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = quizQuestionListQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid quiz question query",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const questionRows = await db
    .select({
      id: quizQuestions.id,
      quizId: quizQuestions.quizId,
      chapterId: quizQuestions.chapterId,
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
    .where(eq(quizQuestions.quizId, parsedQuery.data.quizId))
    .orderBy(asc(quizQuestions.id));

  res.status(200).json({
    data: questionRows
  });
});

/**
 * POST /api/admin/content/quiz-questions/:id/update - Update question
 */
quizQuestionsAdminRouter.post("/content/quiz-questions/:id/update", requireSession, async (req, res) => {
  const parsedParams = quizQuestionParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid quiz question identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = quizQuestionUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid quiz question payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Update quiz question";
  const fallbackTarget = `Quiz Question #${parsedParams.data.id}`;

  const questionRows = await db
    .select({
      id: quizQuestions.id,
      quizId: quizQuestions.quizId,
      question: quizQuestions.question
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.id, parsedParams.data.id))
    .limit(1);

  const question = questionRows[0];
  if (!question) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Quiz question not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Quiz question not found" });
    return;
  }

  const updatedRows = await db
    .update(quizQuestions)
    .set({
      question: parsedBody.data.question.trim(),
      optionA: parsedBody.data.optionA.trim(),
      optionB: parsedBody.data.optionB.trim(),
      optionC: parsedBody.data.optionC.trim(),
      optionD: parsedBody.data.optionD.trim(),
      correctOption: parsedBody.data.correctOption,
      explanation: parsedBody.data.explanation?.trim() ?? null,
      marks: parsedBody.data.marks ?? 1
    })
    .where(eq(quizQuestions.id, question.id))
    .returning({
      id: quizQuestions.id,
      quizId: quizQuestions.quizId,
      chapterId: quizQuestions.chapterId,
      question: quizQuestions.question,
      optionA: quizQuestions.optionA,
      optionB: quizQuestions.optionB,
      optionC: quizQuestions.optionC,
      optionD: quizQuestions.optionD,
      correctOption: quizQuestions.correctOption,
      explanation: quizQuestions.explanation,
      marks: quizQuestions.marks
    });

  const updatedQuestion = updatedRows[0];
  if (!updatedQuestion) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Quiz question not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Quiz question not found" });
    return;
  }

  // Recalculate quiz totalMarks
  await recalculateQuizTotalMarks(question.quizId);

  // Invalidate quiz questions cache
  await cacheService.delete(CacheKeys.quizQuestions(question.quizId));

  await persistAuditLog({
    scope: "content",
    action,
    target: `Quiz Question #${updatedQuestion.id}`,
    status: "success",
    message: "Updated quiz question",
    actorId,
    actorName
  });

  res.status(200).json({
    data: updatedQuestion
  });
});

/**
 * POST /api/admin/content/quiz-questions/:id/delete - Delete question
 */
quizQuestionsAdminRouter.post("/content/quiz-questions/:id/delete", requireSession, async (req, res) => {
  const parsedParams = quizQuestionParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid quiz question identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Delete quiz question";
  const fallbackTarget = `Quiz Question #${parsedParams.data.id}`;

  const questionRows = await db
    .select({
      id: quizQuestions.id,
      quizId: quizQuestions.quizId,
      question: quizQuestions.question
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.id, parsedParams.data.id))
    .limit(1);

  const question = questionRows[0];
  if (!question) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Quiz question not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Quiz question not found" });
    return;
  }

  await db.delete(quizQuestions).where(eq(quizQuestions.id, question.id));

  // Recalculate quiz totalMarks after deletion
  await recalculateQuizTotalMarks(question.quizId);

  // Invalidate quiz questions cache
  await cacheService.delete(CacheKeys.quizQuestions(question.quizId));

  await persistAuditLog({
    scope: "content",
    action,
    target: `Quiz Question #${question.id}`,
    status: "success",
    message: "Deleted quiz question",
    actorId,
    actorName
  });

  res.status(200).json({
    success: true,
    deletedId: question.id
  });
});
