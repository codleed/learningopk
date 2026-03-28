import { Router } from "express";
import { z } from "zod";

import { db } from "../lib/db/index.js";
import { mockExams, quizzes, subjects, boards, quizAttempts, quizQuestions, chapters } from "../lib/db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";

const mockExamFiltersSchema = z.object({
  boardId: z.number().int().positive().optional(),
  grade: z.enum(["9", "10"]).optional(),
  subjectId: z.number().int().positive().optional(),
  year: z.number().int().min(2015).max(2024).optional()
});

const mockExamParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val, 10))
});

export const mockExamsRouter = Router();

// Get all mock exams with filters
mockExamsRouter.get("/", async (req, res) => {
  try {
    const parsed = mockExamFiltersSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid filter parameters",
        details: parsed.error.flatten()
      });
      return;
    }

    const { boardId, grade, subjectId, year } = parsed.data;

    const conditions = [];
    if (boardId) conditions.push(eq(mockExams.boardId, boardId));
    if (grade) conditions.push(eq(mockExams.grade, grade));
    if (subjectId) conditions.push(eq(mockExams.subjectId, subjectId));
    if (year) conditions.push(eq(mockExams.year, year));

    const examRows = await db
      .select({
        id: mockExams.id,
        title: mockExams.title,
        year: mockExams.year,
        durationMinutes: mockExams.durationMinutes,
        totalMarks: mockExams.totalMarks,
        boardId: mockExams.boardId,
        boardName: boards.name,
        boardSlug: boards.slug,
        grade: mockExams.grade,
        subjectId: mockExams.subjectId,
        subjectName: subjects.name,
        subjectSlug: subjects.slug,
        quizId: mockExams.quizId
      })
      .from(mockExams)
      .innerJoin(boards, eq(mockExams.boardId, boards.id))
      .innerJoin(subjects, eq(mockExams.subjectId, subjects.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(mockExams.year));

    res.json({ mockExams: examRows });
  } catch (error) {
    console.error("Get mock exams error:", error);
    res.status(500).json({ error: "Failed to fetch mock exams" });
  }
});

// Get mock exam with quiz questions (for view solutions)
mockExamsRouter.get("/:id", async (req, res) => {
  try {
    const parsed = mockExamParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid mock exam ID" });
      return;
    }

    const examRows = await db
      .select({
        id: mockExams.id,
        title: mockExams.title,
        year: mockExams.year,
        durationMinutes: mockExams.durationMinutes,
        totalMarks: mockExams.totalMarks,
        boardId: mockExams.boardId,
        boardName: boards.name,
        boardSlug: boards.slug,
        grade: mockExams.grade,
        subjectId: mockExams.subjectId,
        subjectName: subjects.name,
        subjectSlug: subjects.slug,
        quizId: mockExams.quizId,
        quizTitle: quizzes.title,
        quizType: quizzes.type,
        quizDurationMinutes: quizzes.durationMinutes
      })
      .from(mockExams)
      .innerJoin(boards, eq(mockExams.boardId, boards.id))
      .innerJoin(subjects, eq(mockExams.subjectId, subjects.id))
      .innerJoin(quizzes, eq(mockExams.quizId, quizzes.id))
      .where(eq(mockExams.id, parsed.data.id))
      .limit(1);

    const examRow = examRows[0];
    if (!examRow) {
      res.status(404).json({ error: "Mock exam not found" });
      return;
    }

    res.json({ mockExam: examRow });
  } catch (error) {
    console.error("Get mock exam error:", error);
    res.status(500).json({ error: "Failed to fetch mock exam" });
  }
});

// Get user's attempts for a mock exam (to check if solved)
mockExamsRouter.get("/:id/attempts", requireSession, async (req, res) => {
  try {
    const parsed = mockExamParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid mock exam ID" });
      return;
    }

    const authedReq = req as AuthenticatedRequest;
    const userId = authedReq.session.user.id;

    // First get the quizId for this mock exam
    const examRows = await db
      .select({ quizId: mockExams.quizId })
      .from(mockExams)
      .where(eq(mockExams.id, parsed.data.id))
      .limit(1);

    if (examRows.length === 0) {
      res.status(404).json({ error: "Mock exam not found" });
      return;
    }

    const firstExam = examRows[0];
    if (!firstExam) {
      res.status(404).json({ error: "Mock exam not found" });
      return;
    }

    // Get attempts for this quiz
    const quizId = firstExam.quizId;
    const attemptRows = await db
      .select({
        id: quizAttempts.id,
        score: quizAttempts.score,
        totalMarks: quizAttempts.totalMarks,
        completedAt: quizAttempts.completedAt
      })
      .from(quizAttempts)
      .where(and(
        eq(quizAttempts.userId, userId),
        eq(quizAttempts.quizId, quizId)
      ))
      .orderBy(desc(quizAttempts.completedAt));

    res.json({ attempts: attemptRows });
  } catch (error) {
    console.error("Get mock exam attempts error:", error);
    res.status(500).json({ error: "Failed to fetch mock exam attempts" });
  }
});

// Get quiz questions with correct answers (for view solutions)
mockExamsRouter.get("/:id/questions", requireSession, async (req, res) => {
  try {
    const parsed = mockExamParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid mock exam ID" });
      return;
    }

    // First get the quizId for this mock exam
    const examRows = await db
      .select({ quizId: mockExams.quizId })
      .from(mockExams)
      .where(eq(mockExams.id, parsed.data.id))
      .limit(1);

    if (examRows.length === 0) {
      res.status(404).json({ error: "Mock exam not found" });
      return;
    }

    const firstExam = examRows[0];
    if (!firstExam) {
      res.status(404).json({ error: "Mock exam not found" });
      return;
    }

    // Get quiz questions
    const quizId = firstExam.quizId;
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
        marks: quizQuestions.marks,
        chapterTitle: chapters.title,
        chapterNumber: chapters.chapterNumber
      })
      .from(quizQuestions)
      .leftJoin(chapters, eq(quizQuestions.chapterId, chapters.id))
      .where(eq(quizQuestions.quizId, quizId));

    res.json({ questions: questionRows });
  } catch (error) {
    console.error("Get quiz questions error:", error);
    res.status(500).json({ error: "Failed to fetch quiz questions" });
  }
});

// Get filter options (distinct values for boards, grades, subjects, years)
mockExamsRouter.get("/filters/options", async (_req, res) => {
  try {
    // Get available boards
    const boardRows = await db
      .select({
        id: boards.id,
        name: boards.name,
        slug: boards.slug
      })
      .from(boards)
      .innerJoin(mockExams, eq(boards.id, mockExams.boardId))
      .groupBy(boards.id, boards.name, boards.slug)
      .orderBy(boards.name);

    // Get available grades
    const gradeRows = await db
      .selectDistinct({ grade: mockExams.grade })
      .from(mockExams)
      .orderBy(mockExams.grade);

    // Get available subjects
    const subjectRows = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        slug: subjects.slug
      })
      .from(subjects)
      .innerJoin(mockExams, eq(subjects.id, mockExams.subjectId))
      .groupBy(subjects.id, subjects.name, subjects.slug)
      .orderBy(subjects.name);

    // Get available years
    const yearRows = await db
      .selectDistinct({ year: mockExams.year })
      .from(mockExams)
      .orderBy(desc(mockExams.year));

    res.json({
      filters: {
        boards: boardRows,
        grades: gradeRows.map(r => r.grade),
        subjects: subjectRows,
        years: yearRows.map(r => r.year)
      }
    });
  } catch (error) {
    console.error("Get filter options error:", error);
    res.status(500).json({ error: "Failed to fetch filter options" });
  }
});
