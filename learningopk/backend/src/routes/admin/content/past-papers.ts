import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { requireAdminRole } from "../../../lib/admin.js";
import { db } from "../../../lib/db/index.js";
import { boards, chapters, mockExams, quizzes, subjects } from "../../../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../../../lib/session.js";
import { pastPaperRepository } from "../../../repositories/past-paper.repository.js";
import { persistAuditLog, type AdminAuditScope } from "../shared.js";

const curriculumEntityParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

// Past paper schemas
const pastPaperCreateBodySchema = z.object({
  title: z.string().trim().min(1),
  boardId: z.coerce.number().int().positive(),
  grade: z.enum(["9", "10"]),
  subjectId: z.coerce.number().int().positive(),
  year: z.coerce.number().int().min(2000).max(2099),
  paperContent: z.string().trim().optional(),
  solutionContent: z.string().trim().optional(),
  published: z.boolean().optional().default(false),
  description: z.string().trim().optional(),
  durationMinutes: z.coerce.number().int().min(0).optional().default(60),
  totalMarks: z.coerce.number().int().min(0).optional().default(0),
  exercises: z.array(z.object({
    exerciseId: z.coerce.number().int().positive(),
    orderIndex: z.coerce.number().int().min(0),
    marks: z.coerce.number().int().positive().optional()
  })).optional().default([])
});

const pastPaperUpdateBodySchema = z.object({
  title: z.string().trim().min(1).optional(),
  boardId: z.coerce.number().int().positive().optional(),
  grade: z.enum(["9", "10"]).optional(),
  subjectId: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().min(2000).max(2099).optional(),
  paperContent: z.string().trim().min(1).optional(),
  solutionContent: z.string().trim().optional(),
  published: z.boolean().optional(),
  description: z.string().trim().optional(),
  durationMinutes: z.coerce.number().int().min(0).optional(),
  totalMarks: z.coerce.number().int().min(0).optional()
});

const pastPaperListQuerySchema = z.object({
  boardId: z.coerce.number().int().positive().optional(),
  grade: z.enum(["9", "10"]).optional(),
  subjectId: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().min(2000).max(2099).optional()
});

export const pastPapersAdminRouter = Router();

pastPapersAdminRouter.get("/content/past-papers", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = pastPaperListQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid past paper query",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const conditions: SQL[] = [];
  if (parsedQuery.data.boardId) {
    conditions.push(eq(mockExams.boardId, parsedQuery.data.boardId));
  }
  if (parsedQuery.data.grade) {
    conditions.push(eq(mockExams.grade, parsedQuery.data.grade));
  }
  if (parsedQuery.data.subjectId) {
    conditions.push(eq(mockExams.subjectId, parsedQuery.data.subjectId));
  }
  if (parsedQuery.data.year) {
    conditions.push(eq(mockExams.year, parsedQuery.data.year));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: mockExams.id,
      title: mockExams.title,
      boardId: mockExams.boardId,
      boardName: boards.name,
      grade: mockExams.grade,
      subjectId: mockExams.subjectId,
      subjectName: subjects.name,
      year: mockExams.year,
      durationMinutes: mockExams.durationMinutes,
      totalMarks: mockExams.totalMarks,
      paperContent: mockExams.paperContent,
      solutionContent: mockExams.solutionContent,
      published: mockExams.published,
      description: mockExams.description
    })
    .from(mockExams)
    .innerJoin(boards, eq(mockExams.boardId, boards.id))
    .innerJoin(subjects, eq(mockExams.subjectId, subjects.id))
    .where(whereClause)
    .orderBy(desc(mockExams.year), asc(mockExams.title));

  res.status(200).json({
    data: rows,
    total: rows.length
  });
});

/**
 * POST /api/admin/content/past-papers - Create a past paper with markdown content
 */
pastPapersAdminRouter.post("/content/past-papers", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = pastPaperCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid past paper payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  // We need a dummy quiz for the NOT NULL quizId constraint.
  // Find the first chapter for this subject to use as chapterId.
  const chapterRows = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(eq(chapters.subjectId, parsedBody.data.subjectId))
    .limit(1);

  const firstChapter = chapterRows[0];
  if (!firstChapter) {
    await persistAuditLog({
      scope: "content",
      action: "Create past paper",
      target: `Subject #${parsedBody.data.subjectId}`,
      status: "failed",
      message: "No chapters found for subject — needed for placeholder quiz",
      actorId,
      actorName
    });
    res.status(400).json({ error: "Subject must have at least one chapter before adding a past paper" });
    return;
  }

  // Create a placeholder quiz that won't be used for the markdown-based past paper.
  const placeholderQuizRows = await db
    .insert(quizzes)
    .values({
      title: `[Past Paper] ${parsedBody.data.title}`,
      chapterId: firstChapter.id,
      type: "mock_exam",
      durationMinutes: 0,
      totalMarks: 0
    })
    .returning({ id: quizzes.id });

  const placeholderQuiz = placeholderQuizRows[0];
  if (!placeholderQuiz) {
    await persistAuditLog({
      scope: "content",
      action: "Create past paper",
      target: `Subject #${parsedBody.data.subjectId}`,
      status: "failed",
      message: "Failed to create placeholder quiz for past paper",
      actorId,
      actorName
    });
    res.status(500).json({ error: "Failed to create past paper" });
    return;
  }

  const insertedRows = await db
    .insert(mockExams)
    .values({
      title: parsedBody.data.title.trim(),
      boardId: parsedBody.data.boardId,
      grade: parsedBody.data.grade,
      subjectId: parsedBody.data.subjectId,
      year: parsedBody.data.year,
      quizId: placeholderQuiz.id,
      durationMinutes: parsedBody.data.durationMinutes ?? 60,
      totalMarks: parsedBody.data.totalMarks ?? 0,
      paperContent: parsedBody.data.paperContent?.trim() ?? null,
      solutionContent: parsedBody.data.solutionContent?.trim() ?? null,
      published: parsedBody.data.published ?? false,
      description: parsedBody.data.description?.trim() ?? null
    })
    .returning({
      id: mockExams.id,
      title: mockExams.title,
      boardId: mockExams.boardId,
      grade: mockExams.grade,
      subjectId: mockExams.subjectId,
      year: mockExams.year,
      durationMinutes: mockExams.durationMinutes,
      totalMarks: mockExams.totalMarks,
      paperContent: mockExams.paperContent,
      solutionContent: mockExams.solutionContent,
      published: mockExams.published,
      description: mockExams.description
    });

  const newPaper = insertedRows[0];
  if (!newPaper) {
    await persistAuditLog({
      scope: "content",
      action: "Create past paper",
      target: `Subject #${parsedBody.data.subjectId}`,
      status: "failed",
      message: "Past paper creation failed",
      actorId,
      actorName
    });
    res.status(500).json({ error: "Failed to create past paper" });
    return;
  }

  await persistAuditLog({
    scope: "content",
    action: "Create past paper",
    target: `Past Paper #${newPaper.id}`,
    status: "success",
    message: `Created past paper "${newPaper.title}" for year ${newPaper.year}`,
    actorId,
    actorName
  });

  // Link exercises if provided
  for (const ex of parsedBody.data.exercises) {
    await pastPaperRepository.linkExercise(newPaper.id, ex.exerciseId, ex.orderIndex, ex.marks);
  }

  res.status(201).json({
    data: newPaper
  });
});

/**
 * POST /api/admin/content/past-papers/:id/update - Update a past paper
 */
pastPapersAdminRouter.post("/content/past-papers/:id/update", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid past paper identifier",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = pastPaperUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid past paper payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;

  // Check if past paper exists
  const existingRows = await db
    .select({ id: mockExams.id })
    .from(mockExams)
    .where(eq(mockExams.id, parsedParams.data.id))
    .limit(1);

  const existing = existingRows[0];
  if (!existing) {
    await persistAuditLog({
      scope: "content",
      action: "Update past paper",
      target: `Past Paper #${parsedParams.data.id}`,
      status: "failed",
      message: "Past paper not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Past paper not found" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsedBody.data.title !== undefined) updateData.title = parsedBody.data.title.trim();
  if (parsedBody.data.boardId !== undefined) updateData.boardId = parsedBody.data.boardId;
  if (parsedBody.data.grade !== undefined) updateData.grade = parsedBody.data.grade;
  if (parsedBody.data.subjectId !== undefined) updateData.subjectId = parsedBody.data.subjectId;
  if (parsedBody.data.year !== undefined) updateData.year = parsedBody.data.year;
  if (parsedBody.data.paperContent !== undefined) updateData.paperContent = parsedBody.data.paperContent.trim();
  if (parsedBody.data.solutionContent !== undefined) updateData.solutionContent = parsedBody.data.solutionContent.trim();
  if (parsedBody.data.published !== undefined) updateData.published = parsedBody.data.published;
  if (parsedBody.data.description !== undefined) updateData.description = parsedBody.data.description?.trim() ?? null;
  if (parsedBody.data.durationMinutes !== undefined) updateData.durationMinutes = parsedBody.data.durationMinutes;
  if (parsedBody.data.totalMarks !== undefined) updateData.totalMarks = parsedBody.data.totalMarks;

  const updatedRows = await db
    .update(mockExams)
    .set(updateData)
    .where(eq(mockExams.id, existing.id))
    .returning({
      id: mockExams.id,
      title: mockExams.title,
      boardId: mockExams.boardId,
      grade: mockExams.grade,
      subjectId: mockExams.subjectId,
      year: mockExams.year,
      durationMinutes: mockExams.durationMinutes,
      totalMarks: mockExams.totalMarks,
      paperContent: mockExams.paperContent,
      solutionContent: mockExams.solutionContent,
      published: mockExams.published,
      description: mockExams.description
    });

  const updatedPaper = updatedRows[0];
  if (!updatedPaper) {
    await persistAuditLog({
      scope: "content",
      action: "Update past paper",
      target: `Past Paper #${existing.id}`,
      status: "failed",
      message: "Past paper update failed",
      actorId,
      actorName
    });
    res.status(500).json({ error: "Failed to update past paper" });
    return;
  }

  await persistAuditLog({
    scope: "content",
    action: "Update past paper",
    target: `Past Paper #${updatedPaper.id}`,
    status: "success",
    message: `Updated past paper "${updatedPaper.title}"`,
    actorId,
    actorName
  });

  res.status(200).json({
    data: updatedPaper
  });
});

/**
 * POST /api/admin/content/past-papers/:id/delete - Delete a past paper
 */
pastPapersAdminRouter.post("/content/past-papers/:id/delete", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid past paper identifier",
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

  const paperRows = await db
    .select({
      id: mockExams.id,
      title: mockExams.title,
      quizId: mockExams.quizId,
      subjectId: mockExams.subjectId
    })
    .from(mockExams)
    .where(eq(mockExams.id, parsedParams.data.id))
    .limit(1);

  const paper = paperRows[0];
  if (!paper) {
    await persistAuditLog({
      scope: "content",
      action: "Delete past paper",
      target: `Past Paper #${parsedParams.data.id}`,
      status: "failed",
      message: "Past paper not found",
      actorId,
      actorName
    });
    res.status(404).json({ error: "Past paper not found" });
    return;
  }

  // Delete the mock exam (cascade will handle quiz via quizId FK)
  await db.delete(mockExams).where(eq(mockExams.id, paper.id));

  await persistAuditLog({
    scope: "content",
    action: "Delete past paper",
    target: `Past Paper #${paper.id} "${paper.title}"`,
    status: "success",
    message: `Deleted past paper from subject ${paper.subjectId}`,
    actorId,
    actorName
  });

  res.status(200).json({
    success: true,
    deletedId: paper.id
  });
});

// GET /api/admin/content/past-papers/:id/exercises
pastPapersAdminRouter.get("/content/past-papers/:id/exercises", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "Invalid paper ID", details: parsedParams.error.flatten() });
    return;
  }
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) return;

  const exerciseRows = await pastPaperRepository.getPaperExercises(parsedParams.data.id);
  res.status(200).json({ data: exerciseRows });
});

// POST /api/admin/content/past-papers/:id/exercises
pastPapersAdminRouter.post("/content/past-papers/:id/exercises", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "Invalid paper ID", details: parsedParams.error.flatten() });
    return;
  }
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) return;

  const linkSchema = z.object({
    exercises: z.array(z.object({
      exerciseId: z.coerce.number().int().positive(),
      orderIndex: z.coerce.number().int().min(0),
      marks: z.coerce.number().int().positive().optional()
    }))
  });

  const parsedBody = linkSchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "Invalid payload", details: parsedBody.error.flatten() });
    return;
  }

  for (const ex of parsedBody.data.exercises) {
    await pastPaperRepository.linkExercise(parsedParams.data.id, ex.exerciseId, ex.orderIndex, ex.marks);
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  await persistAuditLog({
    scope: "content",
    action: "Link exercises to past paper",
    target: `Past Paper #${parsedParams.data.id}`,
    status: "success",
    message: `Linked ${parsedBody.data.exercises.length} exercises`,
    actorId,
    actorName
  });

  res.status(200).json({ success: true, count: parsedBody.data.exercises.length });
});

// POST /api/admin/content/past-papers/:id/exercises/:exerciseId/remove
pastPapersAdminRouter.post("/content/past-papers/:id/exercises/:exerciseId/remove", requireSession, async (req, res) => {
  const paramsSchema = z.object({
    id: z.coerce.number().int().positive(),
    exerciseId: z.coerce.number().int().positive()
  });
  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid parameters", details: parsed.error.flatten() });
    return;
  }
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) return;

  await pastPaperRepository.unlinkExercise(parsed.data.id, parsed.data.exerciseId);
  res.status(200).json({ success: true });
});

// POST /api/admin/content/past-papers/:id/publish
pastPapersAdminRouter.post("/content/past-papers/:id/publish", requireSession, async (req, res) => {
  const parsedParams = curriculumEntityParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "Invalid paper ID", details: parsedParams.error.flatten() });
    return;
  }
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) return;

  try {
    const published = await pastPaperRepository.togglePublish(parsedParams.data.id);

    await persistAuditLog({
      scope: "content",
      action: published ? "Publish past paper" : "Unpublish past paper",
      target: `Past Paper #${parsedParams.data.id}`,
      status: "success",
      message: published ? "Published" : "Unpublished",
      actorId: authedReq.session.user.id,
      actorName: authedReq.session.user.name
    });

    res.status(200).json({ data: { published } });
  } catch (err) {
    res.status(404).json({ error: "Past paper not found" });
  }
});
