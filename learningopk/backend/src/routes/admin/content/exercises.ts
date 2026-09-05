import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { requireAdminRole } from "../../../lib/admin.js";
import { CacheKeys, cacheService } from "../../../lib/cache/cache.service.js";
import { db } from "../../../lib/db/index.js";
import { chapters, exercises, subjects } from "../../../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../../../lib/session.js";
import { persistAuditLog, type AdminAuditScope } from "../shared.js";

export const exercisesAdminRouter = Router();

const curriculumEntityParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const blankStatementSchema = z.object({
  text: z.string().trim().min(1, "Statement text is required"),
  blanksAnswer: z
    .array(z.string().trim().min(1))
    .min(1, "At least one answer per statement is required"),
});

export const curriculumExerciseCreateBodySchema = z
  .object({
    chapterId: z.coerce.number().int().positive(),
    exerciseNumber: z.string().trim().min(1),
    question: z.string().trim().optional(),
    solution: z.string().trim().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
    type: z
      .enum(["mcq", "short", "long", "numerical", "fill_in_blanks"])
      .optional()
      .default("short"),
    problemMarkdown: z.string().trim().optional(),
    solutionCode: z.string().trim().optional(),
    visualizationHtml: z.string().trim().optional(),
    blanksAnswer: z.array(z.string()).optional(),
    statements: z.array(blankStatementSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.type !== "fill_in_blanks") {
        return data.question !== undefined && data.question.trim().length > 0;
      }
      return true;
    },
    {
      message: "Question is required",
      path: ["question"],
    }
  )
  .refine(
    (data) => {
      if (data.type !== "fill_in_blanks") {
        return data.solution !== undefined && data.solution.trim().length > 0;
      }
      return true;
    },
    {
      message: "Solution is required",
      path: ["solution"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "numerical") {
        return data.problemMarkdown !== undefined && data.problemMarkdown.trim().length > 0;
      }
      return true;
    },
    {
      message: "problemMarkdown is required when type is 'numerical'",
      path: ["problemMarkdown"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "numerical") {
        return data.solutionCode !== undefined && data.solutionCode.trim().length > 0;
      }
      return true;
    },
    {
      message: "solutionCode is required when type is 'numerical'",
      path: ["solutionCode"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "fill_in_blanks") {
        const hasStatements = data.statements !== undefined && data.statements.length > 0;
        const hasLegacyBlanks = data.blanksAnswer !== undefined && data.blanksAnswer.length > 0;
        return hasStatements || hasLegacyBlanks;
      }
      return true;
    },
    {
      message: "statements or blanksAnswer is required when type is 'fill_in_blanks'",
      path: ["statements"],
    }
  );

export const curriculumExerciseUpdateBodySchema = z
  .object({
    exerciseNumber: z.string().trim().min(1),
    question: z.string().trim().optional(),
    solution: z.string().trim().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
    type: z
      .enum(["mcq", "short", "long", "numerical", "fill_in_blanks"])
      .optional()
      .default("short"),
    problemMarkdown: z.string().trim().optional(),
    solutionCode: z.string().trim().optional(),
    visualizationHtml: z.string().trim().optional(),
    blanksAnswer: z.array(z.string()).optional(),
    statements: z.array(blankStatementSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.type !== "fill_in_blanks") {
        return data.question !== undefined && data.question.trim().length > 0;
      }
      return true;
    },
    {
      message: "Question is required",
      path: ["question"],
    }
  )
  .refine(
    (data) => {
      if (data.type !== "fill_in_blanks") {
        return data.solution !== undefined && data.solution.trim().length > 0;
      }
      return true;
    },
    {
      message: "Solution is required",
      path: ["solution"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "numerical") {
        return data.problemMarkdown !== undefined && data.problemMarkdown.trim().length > 0;
      }
      return true;
    },
    {
      message: "problemMarkdown is required when type is 'numerical'",
      path: ["problemMarkdown"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "numerical") {
        return data.solutionCode !== undefined && data.solutionCode.trim().length > 0;
      }
      return true;
    },
    {
      message: "solutionCode is required when type is 'numerical'",
      path: ["solutionCode"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "fill_in_blanks") {
        const hasStatements = data.statements !== undefined && data.statements.length > 0;
        const hasLegacyBlanks = data.blanksAnswer !== undefined && data.blanksAnswer.length > 0;
        return hasStatements || hasLegacyBlanks;
      }
      return true;
    },
    {
      message: "statements or blanksAnswer is required when type is 'fill_in_blanks'",
      path: ["statements"],
    }
  );

const curriculumExerciseListQuerySchema = z.object({
  chapterId: z.coerce.number().int().positive().optional(),
});

exercisesAdminRouter.post("/content/exercises", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = curriculumExerciseCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid exercise payload",
      details: parsedBody.error.flatten(),
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const exerciseNumber = parsedBody.data.exerciseNumber.trim();

  const chapterRows = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      subjectId: chapters.subjectId,
      subjectName: subjects.name,
    })
    .from(chapters)
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(eq(chapters.id, parsedBody.data.chapterId))
    .limit(1);

  const chapter = chapterRows[0];
  if (!chapter) {
    await persistAuditLog({
      scope: "content",
      action: "Create exercise",
      target: `Chapter #${parsedBody.data.chapterId} / ${exerciseNumber}`,
      status: "failed",
      message: "Chapter not found",
      actorId,
      actorName,
    });
    res.status(404).json({
      error: "Chapter not found",
    });
    return;
  }

  const isPhysicsChapter = chapter.subjectName.toLowerCase().includes("physics");
  if (parsedBody.data.type === "numerical" && !isPhysicsChapter) {
    await persistAuditLog({
      scope: "content",
      action: "Create exercise",
      target: `${chapter.subjectName} / ${chapter.title} / ${exerciseNumber}`,
      status: "failed",
      message: "Numerical exercises are only allowed for Physics chapters",
      actorId,
      actorName,
    });
    res.status(400).json({
      error: "Numerical problems are only allowed for Physics chapters",
    });
    return;
  }

  try {
    const insertedRows = await db
      .insert(exercises)
      .values({
        chapterId: chapter.id,
        exerciseNumber,
        question: parsedBody.data.question?.trim() || "Fill in the Blanks",
        solution: parsedBody.data.solution?.trim() || "See statements below",
        difficulty: parsedBody.data.difficulty,
        type: parsedBody.data.type,
        problemMarkdown: parsedBody.data.problemMarkdown?.trim() || null,
        solutionCode: parsedBody.data.solutionCode?.trim() || null,
        visualizationHtml:
          parsedBody.data.type === "numerical"
            ? parsedBody.data.visualizationHtml?.trim() || null
            : null,
        blanksAnswer:
          parsedBody.data.type === "fill_in_blanks" ? (parsedBody.data.blanksAnswer ?? null) : null,
        statements:
          parsedBody.data.type === "fill_in_blanks" ? (parsedBody.data.statements ?? null) : null,
      })
      .returning({
        id: exercises.id,
        chapterId: exercises.chapterId,
        exerciseNumber: exercises.exerciseNumber,
        question: exercises.question,
        solution: exercises.solution,
        difficulty: exercises.difficulty,
        type: exercises.type,
        problemMarkdown: exercises.problemMarkdown,
        solutionCode: exercises.solutionCode,
        visualizationHtml: exercises.visualizationHtml,
        blanksAnswer: exercises.blanksAnswer,
        statements: exercises.statements,
      });

    const exercise = insertedRows[0];
    if (!exercise) {
      res.status(500).json({
        error: "Failed to create exercise",
      });
      return;
    }

    // Invalidate chapter content cache (exercises are part of chapter content)
    await cacheService.delete(CacheKeys.chapterContent(chapter.id));

    await persistAuditLog({
      scope: "content",
      action: "Create exercise",
      target: `${chapter.subjectName} / ${chapter.title} / ${exercise.exerciseNumber}`,
      status: "success",
      message: `Created ${exercise.type} exercise`,
      actorId,
      actorName,
    });

    res.status(201).json({
      exercise,
    });
  } catch {
    await persistAuditLog({
      scope: "content",
      action: "Create exercise",
      target: `${chapter.subjectName} / ${chapter.title} / ${exerciseNumber}`,
      status: "failed",
      message: "Exercise create failed",
      actorId,
      actorName,
    });
    res.status(409).json({
      error: "Exercise already exists for chapter",
    });
  }
});

exercisesAdminRouter.get("/content/exercises", requireSession, async (req, res) => {
  const parsedQuery = curriculumExerciseListQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid exercise query",
      details: parsedQuery.error.flatten(),
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const exerciseRows = await db
    .select({
      id: exercises.id,
      chapterId: exercises.chapterId,
      chapterTitle: chapters.title,
      subjectName: subjects.name,
      exerciseNumber: exercises.exerciseNumber,
      question: exercises.question,
      solution: exercises.solution,
      difficulty: exercises.difficulty,
      type: exercises.type,
      problemMarkdown: exercises.problemMarkdown,
      solutionCode: exercises.solutionCode,
      visualizationHtml: exercises.visualizationHtml,
      blanksAnswer: exercises.blanksAnswer,
      statements: exercises.statements,
    })
    .from(exercises)
    .innerJoin(chapters, eq(exercises.chapterId, chapters.id))
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(
      parsedQuery.data.chapterId ? eq(exercises.chapterId, parsedQuery.data.chapterId) : undefined
    )
    .orderBy(asc(exercises.chapterId), asc(exercises.exerciseNumber));

  res.status(200).json({
    exercises: exerciseRows,
  });
});

exercisesAdminRouter.post("/content/exercises/:id/update", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid exercise identifier",
      details: parsedParams.error.flatten(),
    });
    return;
  }

  const parsedBody = curriculumExerciseUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid exercise payload",
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
  const action = "Update exercise";
  const fallbackTarget = `Exercise #${parsedParams.data.id}`;

  const exerciseRows = await db
    .select({
      id: exercises.id,
      chapterId: exercises.chapterId,
      exerciseNumber: exercises.exerciseNumber,
      question: exercises.question,
      solution: exercises.solution,
      difficulty: exercises.difficulty,
      type: exercises.type,
      problemMarkdown: exercises.problemMarkdown,
      solutionCode: exercises.solutionCode,
      visualizationHtml: exercises.visualizationHtml,
      blanksAnswer: exercises.blanksAnswer,
      statements: exercises.statements,
      chapterTitle: chapters.title,
      subjectName: subjects.name,
    })
    .from(exercises)
    .innerJoin(chapters, eq(exercises.chapterId, chapters.id))
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(eq(exercises.id, parsedParams.data.id))
    .limit(1);
  const exercise = exerciseRows[0];
  if (!exercise) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Exercise not found",
      actorId,
      actorName,
    });
    res.status(404).json({
      error: "Exercise not found",
    });
    return;
  }

  const isPhysicsChapter = exercise.subjectName.toLowerCase().includes("physics");
  if (parsedBody.data.type === "numerical" && !isPhysicsChapter) {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${exercise.subjectName} / ${exercise.chapterTitle} / ${exercise.exerciseNumber}`,
      status: "failed",
      message: "Numerical exercises are only allowed for Physics chapters",
      actorId,
      actorName,
    });
    res.status(400).json({
      error: "Numerical problems are only allowed for Physics chapters",
    });
    return;
  }

  try {
    // Determine if we need to clear type-specific fields
    // If changing FROM 'numerical' to another type, clear numerical fields
    // If changing FROM 'fill_in_blanks' to another type, clear blanks fields
    const isChangingFromNumerical =
      exercise.type === "numerical" && parsedBody.data.type !== "numerical";
    const isChangingFromBlanks =
      exercise.type === "fill_in_blanks" && parsedBody.data.type !== "fill_in_blanks";

    const updatedRows = await db
      .update(exercises)
      .set({
        exerciseNumber: parsedBody.data.exerciseNumber.trim(),
        question: parsedBody.data.question?.trim() || exercise.question,
        solution: parsedBody.data.solution?.trim() || exercise.solution,
        difficulty: parsedBody.data.difficulty,
        type: parsedBody.data.type,
        // Clear if changing away from numerical, otherwise set to new values
        problemMarkdown: isChangingFromNumerical
          ? null
          : parsedBody.data.problemMarkdown?.trim() || null,
        solutionCode: isChangingFromNumerical ? null : parsedBody.data.solutionCode?.trim() || null,
        visualizationHtml: isChangingFromNumerical
          ? null
          : parsedBody.data.type === "numerical"
            ? parsedBody.data.visualizationHtml?.trim() || null
            : null,
        blanksAnswer: isChangingFromBlanks
          ? null
          : parsedBody.data.type === "fill_in_blanks"
            ? (parsedBody.data.blanksAnswer ?? null)
            : null,
        statements: isChangingFromBlanks
          ? null
          : parsedBody.data.type === "fill_in_blanks"
            ? (parsedBody.data.statements ?? null)
            : null,
      })
      .where(eq(exercises.id, exercise.id))
      .returning({
        id: exercises.id,
        chapterId: exercises.chapterId,
        exerciseNumber: exercises.exerciseNumber,
        question: exercises.question,
        solution: exercises.solution,
        difficulty: exercises.difficulty,
        type: exercises.type,
        problemMarkdown: exercises.problemMarkdown,
        solutionCode: exercises.solutionCode,
        visualizationHtml: exercises.visualizationHtml,
        blanksAnswer: exercises.blanksAnswer,
        statements: exercises.statements,
      });
    const updatedExercise = updatedRows[0];
    if (!updatedExercise) {
      await persistAuditLog({
        scope: "content",
        action,
        target: `${exercise.subjectName} / ${exercise.chapterTitle} / ${exercise.exerciseNumber}`,
        status: "failed",
        message: "Exercise not found",
        actorId,
        actorName,
      });
      res.status(404).json({
        error: "Exercise not found",
      });
      return;
    }

    // Invalidate chapter content cache (exercises are part of chapter content)
    await cacheService.delete(CacheKeys.chapterContent(exercise.chapterId));

    await persistAuditLog({
      scope: "content",
      action,
      target: `${exercise.subjectName} / ${exercise.chapterTitle} / ${exercise.exerciseNumber}`,
      status: "success",
      message: `Updated exercise to ${updatedExercise.exerciseNumber}`,
      actorId,
      actorName,
    });
    res.status(200).json({
      exercise: updatedExercise,
      timestamp: new Date().toISOString(),
    });
  } catch {
    await persistAuditLog({
      scope: "content",
      action,
      target: `${exercise.subjectName} / ${exercise.chapterTitle} / ${exercise.exerciseNumber}`,
      status: "failed",
      message: "Exercise update failed",
      actorId,
      actorName,
    });
    res.status(409).json({
      error: "Exercise already exists for chapter",
    });
  }
});

exercisesAdminRouter.post("/content/exercises/:id/delete", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid exercise identifier",
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
  const action = "Delete exercise";
  const fallbackTarget = `Exercise #${parsedParams.data.id}`;

  const exerciseRows = await db
    .select({
      id: exercises.id,
      chapterId: exercises.chapterId,
      exerciseNumber: exercises.exerciseNumber,
      question: exercises.question,
      solution: exercises.solution,
      difficulty: exercises.difficulty,
      type: exercises.type,
      chapterTitle: chapters.title,
      subjectName: subjects.name,
    })
    .from(exercises)
    .innerJoin(chapters, eq(exercises.chapterId, chapters.id))
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(eq(exercises.id, parsedParams.data.id))
    .limit(1);
  const exercise = exerciseRows[0];
  if (!exercise) {
    await persistAuditLog({
      scope: "content",
      action,
      target: fallbackTarget,
      status: "failed",
      message: "Exercise not found",
      actorId,
      actorName,
    });
    res.status(404).json({
      error: "Exercise not found",
    });
    return;
  }

  await db.delete(exercises).where(eq(exercises.id, exercise.id));

  // Invalidate chapter content cache (exercises are part of chapter content)
  await cacheService.delete(CacheKeys.chapterContent(exercise.chapterId));

  await persistAuditLog({
    scope: "content",
    action,
    target: `${exercise.subjectName} / ${exercise.chapterTitle} / ${exercise.exerciseNumber}`,
    status: "success",
    message: `Deleted exercise ${exercise.exerciseNumber}`,
    actorId,
    actorName,
  });

  res.status(200).json({
    exercise: {
      id: exercise.id,
      chapterId: exercise.chapterId,
      exerciseNumber: exercise.exerciseNumber,
      question: exercise.question,
      solution: exercise.solution,
      difficulty: exercise.difficulty,
      type: exercise.type,
    },
    timestamp: new Date().toISOString(),
  });
});
