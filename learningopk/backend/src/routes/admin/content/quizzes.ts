import { eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { requireAdminRole } from "../../../lib/admin.js";
import { CacheKeys, cacheService } from "../../../lib/cache/cache.service.js";
import { db } from "../../../lib/db/index.js";
import { quizzes, quizQuestions } from "../../../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../../../lib/session.js";
import { persistAuditLog, type AdminAuditScope } from "../shared.js";

export const quizzesAdminRouter = Router();

// Quiz schemas
const quizUpsertBodySchema = z.object({
  chapterId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().positive().optional().default(30),
  type: z.enum(["chapter_quiz", "mock_exam"]).optional().default("chapter_quiz"),
});

const quizUpdateBodySchema = z.object({
  title: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().positive().optional(),
  type: z.enum(["chapter_quiz", "mock_exam"]).optional(),
});

const quizQuerySchema = z.object({
  chapterId: z.coerce.number().int().positive().optional(),
});

const quizParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const recalculateQuizTotalMarks = async (quizId: number): Promise<number> => {
  const questionMarksResult = await db
    .select({
      total: sql<number>`coalesce(sum(${quizQuestions.marks}), 0)::int`,
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId));

  const totalMarks = questionMarksResult[0]?.total ?? 0;

  await db.update(quizzes).set({ totalMarks }).where(eq(quizzes.id, quizId));

  return totalMarks;
};

quizzesAdminRouter.post("/content/quizzes", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = quizUpsertBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid quiz payload",
      details: parsedBody.error.flatten(),
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  // Check if quiz exists for this chapterId
  const existingQuizRows = await db
    .select({
      id: quizzes.id,
      chapterId: quizzes.chapterId,
      title: quizzes.title,
      durationMinutes: quizzes.durationMinutes,
      totalMarks: quizzes.totalMarks,
      type: quizzes.type,
    })
    .from(quizzes)
    .where(eq(quizzes.chapterId, parsedBody.data.chapterId))
    .limit(1);

  const existingQuiz = existingQuizRows[0];

  if (existingQuiz) {
    // UPDATE existing quiz
    const updatedRows = await db
      .update(quizzes)
      .set({
        title: parsedBody.data.title.trim(),
        durationMinutes: parsedBody.data.durationMinutes ?? existingQuiz.durationMinutes,
        type: parsedBody.data.type,
      })
      .where(eq(quizzes.id, existingQuiz.id))
      .returning({
        id: quizzes.id,
        chapterId: quizzes.chapterId,
        title: quizzes.title,
        durationMinutes: quizzes.durationMinutes,
        totalMarks: quizzes.totalMarks,
        type: quizzes.type,
      });

    const updatedQuiz = updatedRows[0];
    if (!updatedQuiz) {
      await persistAuditLog({
        scope: "content",
        action: "Upsert quiz",
        target: `Chapter #${parsedBody.data.chapterId}`,
        status: "failed",
        message: "Quiz update failed",
        actorId,
        actorName,
      });
      res.status(500).json({ error: "Failed to update quiz" });
      return;
    }

    // Invalidate chapter content cache (quiz metadata is part of chapter content)
    await cacheService.delete(CacheKeys.chapterContent(updatedQuiz.chapterId));

    await persistAuditLog({
      scope: "content",
      action: "Update quiz",
      target: `Quiz #${updatedQuiz.id} - ${updatedQuiz.title}`,
      status: "success",
      message: "Updated existing quiz via upsert",
      actorId,
      actorName,
    });

    res.status(200).json({
      data: updatedQuiz,
      created: false,
    });
  } else {
    // CREATE new quiz
    const insertedRows = await db
      .insert(quizzes)
      .values({
        chapterId: parsedBody.data.chapterId,
        title: parsedBody.data.title.trim(),
        durationMinutes: parsedBody.data.durationMinutes ?? 30,
        totalMarks: 0, // Initial totalMarks is 0, will be updated when questions are added
        type: parsedBody.data.type ?? "chapter_quiz",
      })
      .returning({
        id: quizzes.id,
        chapterId: quizzes.chapterId,
        title: quizzes.title,
        durationMinutes: quizzes.durationMinutes,
        totalMarks: quizzes.totalMarks,
        type: quizzes.type,
      });

    const newQuiz = insertedRows[0];
    if (!newQuiz) {
      await persistAuditLog({
        scope: "content",
        action: "Upsert quiz",
        target: `Chapter #${parsedBody.data.chapterId}`,
        status: "failed",
        message: "Quiz creation failed",
        actorId,
        actorName,
      });
      res.status(500).json({ error: "Failed to create quiz" });
      return;
    }

    // Invalidate chapter content cache (quiz metadata is part of chapter content)
    await cacheService.delete(CacheKeys.chapterContent(newQuiz.chapterId));

    await persistAuditLog({
      scope: "content",
      action: "Create quiz",
      target: `Quiz #${newQuiz.id} - ${newQuiz.title}`,
      status: "success",
      message: "Created new quiz via upsert",
      actorId,
      actorName,
    });

    res.status(201).json({
      data: newQuiz,
      created: true,
    });
  }
});

/**
 * GET /api/admin/content/quizzes?chapterId=N - Get quiz by chapter
 */
quizzesAdminRouter.get("/content/quizzes", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = quizQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid quiz query",
      details: parsedQuery.error.flatten(),
    });
    return;
  }

  if (!parsedQuery.data.chapterId) {
    res.status(400).json({
      error: "chapterId is required",
    });
    return;
  }

  const quizRows = await db
    .select({
      id: quizzes.id,
      chapterId: quizzes.chapterId,
      title: quizzes.title,
      durationMinutes: quizzes.durationMinutes,
      totalMarks: quizzes.totalMarks,
      type: quizzes.type,
    })
    .from(quizzes)
    .where(eq(quizzes.chapterId, parsedQuery.data.chapterId))
    .limit(1);

  const quiz = quizRows[0] ?? null;

  res.status(200).json({
    data: quiz,
  });
});

/**
 * POST /api/admin/content/quizzes/:id/update - Update quiz metadata
 */
quizzesAdminRouter.post("/content/quizzes/:id/update", requireSession, async (req, res) => {
  const parsedParams = quizParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid quiz identifier",
      details: parsedParams.error.flatten(),
    });
    return;
  }

  const parsedBody = quizUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid quiz payload",
      details: parsedBody.error.flatten(),
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Update quiz";
  const fallbackTarget = `Quiz #${parsedParams.data.id}`;

  const quizRows = await db
    .select({
      id: quizzes.id,
      chapterId: quizzes.chapterId,
      title: quizzes.title,
      durationMinutes: quizzes.durationMinutes,
      totalMarks: quizzes.totalMarks,
      type: quizzes.type,
    })
    .from(quizzes)
    .where(eq(quizzes.id, parsedParams.data.id))
    .limit(1);

  const quiz = quizRows[0];
  if (!quiz) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Quiz not found",
      actorId,
      actorName,
    });
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  const updatedRows = await db
    .update(quizzes)
    .set({
      title: parsedBody.data.title.trim(),
      ...(parsedBody.data.durationMinutes !== undefined && {
        durationMinutes: parsedBody.data.durationMinutes,
      }),
      ...(parsedBody.data.type !== undefined && { type: parsedBody.data.type }),
    })
    .where(eq(quizzes.id, quiz.id))
    .returning({
      id: quizzes.id,
      chapterId: quizzes.chapterId,
      title: quizzes.title,
      durationMinutes: quizzes.durationMinutes,
      totalMarks: quizzes.totalMarks,
      type: quizzes.type,
    });

  const updatedQuiz = updatedRows[0];
  if (!updatedQuiz) {
    await persistAuditLog({
      scope: "content",
      action,
      target: `Quiz #${quiz.id}`,
      status: "failed",
      message: "Quiz not found",
      actorId,
      actorName,
    });
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  // Invalidate chapter content cache (quiz metadata is part of chapter content)
  await cacheService.delete(CacheKeys.chapterContent(updatedQuiz.chapterId));

  await persistAuditLog({
    scope: "content",
    action,
    target: `Quiz #${updatedQuiz.id} - ${updatedQuiz.title}`,
    status: "success",
    message: "Updated quiz metadata",
    actorId,
    actorName,
  });

  res.status(200).json({
    data: updatedQuiz,
  });
});

/**
 * POST /api/admin/content/quizzes/:id/delete - Delete quiz (cascade via FK)
 */
quizzesAdminRouter.post("/content/quizzes/:id/delete", requireSession, async (req, res) => {
  const parsedParams = quizParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid quiz identifier",
      details: parsedParams.error.flatten(),
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const action = "Delete quiz";
  const fallbackTarget = `Quiz #${parsedParams.data.id}`;

  const quizRows = await db
    .select({
      id: quizzes.id,
      chapterId: quizzes.chapterId,
      title: quizzes.title,
      durationMinutes: quizzes.durationMinutes,
      totalMarks: quizzes.totalMarks,
      type: quizzes.type,
    })
    .from(quizzes)
    .where(eq(quizzes.id, parsedParams.data.id))
    .limit(1);

  const quiz = quizRows[0];
  if (!quiz) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Quiz not found",
      actorId,
      actorName,
    });
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  await db.delete(quizzes).where(eq(quizzes.id, quiz.id));

  // Invalidate chapter content cache + quiz questions cache
  await cacheService.delete(CacheKeys.chapterContent(quiz.chapterId));
  await cacheService.delete(CacheKeys.quizQuestions(quiz.id));

  await persistAuditLog({
    scope: "content",
    action,
    target: `Quiz #${quiz.id} - ${quiz.title}`,
    status: "success",
    message: "Deleted quiz (questions cascade via FK)",
    actorId,
    actorName,
  });

  res.status(200).json({
    success: true,
    deletedId: quiz.id,
  });
});
