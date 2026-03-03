import { and, asc, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { listSubjectChapterGraph } from "../lib/chapter-graph.js";
import { db } from "../lib/db/index.js";
import { boardClasses, boards, chapters, exercises, flashcards, quizQuestions, quizzes, subjects } from "../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";

const paramsSchema = z.object({
  board: z.string().trim().regex(/^[a-z0-9-]+$/),
  grade: z.string().trim().regex(/^[a-z0-9-]+$/),
  subject: z.string().trim().regex(/^[a-z0-9-]+$/)
});

const chapterParamsSchema = paramsSchema.extend({
  chapter: z.string().trim().regex(/^[a-z0-9-]+$/)
});

export const learnRouter = Router();

const getSubjectRouteRow = async ({ board, grade, subject }: z.infer<typeof paramsSchema>) => {
  const subjectRows = await db
    .select({
      boardId: boards.id,
      boardName: boards.name,
      boardSlug: boards.slug,
      className: boardClasses.name,
      classSlug: boardClasses.slug,
      subjectId: subjects.id,
      subjectName: subjects.name,
      subjectSlug: subjects.slug,
      subjectDescription: subjects.description
    })
    .from(subjects)
    .innerJoin(boards, eq(subjects.boardId, boards.id))
    .leftJoin(boardClasses, eq(subjects.boardClassId, boardClasses.id))
    .where(
      and(
        eq(boards.slug, board),
        eq(subjects.slug, subject),
        sql`coalesce(${boardClasses.slug}, ${subjects.grade}::text) = ${grade}`
      )
    )
    .limit(1);
  return subjectRows[0] ?? null;
};

learnRouter.get("/:board/:grade/:subject", async (req, res) => {
  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid route parameters",
      details: parsed.error.flatten()
    });
    return;
  }

  const grade = parsed.data.grade;
  const subjectRow = await getSubjectRouteRow(parsed.data);

  if (!subjectRow) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  const chapterRows = await db
    .select({
      id: chapters.id,
      chapterNumber: chapters.chapterNumber,
      title: chapters.title,
      slug: chapters.slug,
      isPublished: chapters.isPublished
    })
    .from(chapters)
    .where(and(eq(chapters.subjectId, subjectRow.subjectId), eq(chapters.isPublished, true)))
    .orderBy(asc(chapters.chapterNumber));

  res.status(200).json({
    board: {
      slug: subjectRow.boardSlug,
      name: subjectRow.boardName
    },
    grade,
    class: {
      slug: subjectRow.classSlug ?? grade,
      name: subjectRow.className ?? grade
    },
    subject: {
      id: subjectRow.subjectId,
      slug: subjectRow.subjectSlug,
      name: subjectRow.subjectName,
      description: subjectRow.subjectDescription ?? ""
    },
    chapters: chapterRows
  });
});

learnRouter.get("/:board/:grade/:subject/graph", requireSession, async (req, res) => {
  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid route parameters",
      details: parsed.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  const { board, grade } = parsed.data;
  if (authedReq.session.user.role === "student") {
    if (authedReq.session.user.board && authedReq.session.user.board !== board) {
      res.status(403).json({
        error: "Forbidden"
      });
      return;
    }
    if (authedReq.session.user.class && authedReq.session.user.class !== grade) {
      res.status(403).json({
        error: "Forbidden"
      });
      return;
    }
  }

  const subjectRow = await getSubjectRouteRow(parsed.data);
  if (!subjectRow) {
    res.status(404).json({
      error: "Subject not found"
    });
    return;
  }

  const graph = await listSubjectChapterGraph({
    subjectId: subjectRow.subjectId,
    userId: authedReq.session.user.id
  });

  res.status(200).json({
    graph
  });
});

learnRouter.get("/:board/:grade/:subject/:chapter", async (req, res) => {
  const parsed = chapterParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid route parameters",
      details: parsed.error.flatten()
    });
    return;
  }

  const { board, grade, subject, chapter } = parsed.data;

  const chapterRows = await db
    .select({
      chapterId: chapters.id,
      chapterNumber: chapters.chapterNumber,
      chapterTitle: chapters.title,
      chapterSlug: chapters.slug,
      chapterSummary: chapters.summary,
      boardName: boards.name,
      boardSlug: boards.slug,
      className: boardClasses.name,
      classSlug: boardClasses.slug,
      subjectId: subjects.id,
      subjectName: subjects.name,
      subjectSlug: subjects.slug
    })
    .from(chapters)
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .innerJoin(boards, eq(subjects.boardId, boards.id))
    .leftJoin(boardClasses, eq(subjects.boardClassId, boardClasses.id))
    .where(
      and(
        eq(boards.slug, board),
        sql`coalesce(${boardClasses.slug}, ${subjects.grade}::text) = ${grade}`,
        eq(subjects.slug, subject),
        eq(chapters.slug, chapter),
        eq(chapters.isPublished, true)
      )
    )
    .limit(1);

  const chapterRow = chapterRows[0];
  if (!chapterRow) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  const chapterExercises = await db
    .select({
      id: exercises.id,
      exerciseNumber: exercises.exerciseNumber,
      question: exercises.question,
      solution: exercises.solution,
      difficulty: exercises.difficulty,
      type: exercises.type
    })
    .from(exercises)
    .where(eq(exercises.chapterId, chapterRow.chapterId))
    .orderBy(asc(exercises.id));

  const chapterFlashcards = await db
    .select({
      id: flashcards.id,
      front: flashcards.front,
      back: flashcards.back,
      orderIndex: flashcards.orderIndex
    })
    .from(flashcards)
    .where(eq(flashcards.chapterId, chapterRow.chapterId))
    .orderBy(asc(flashcards.orderIndex));

  const quizRows = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      durationMinutes: quizzes.durationMinutes,
      totalMarks: quizzes.totalMarks,
      type: quizzes.type
    })
    .from(quizzes)
    .where(eq(quizzes.chapterId, chapterRow.chapterId))
    .orderBy(asc(quizzes.id))
    .limit(1);

  const quizRow = quizRows[0];
  const quizQuestionRows = quizRow
    ? await db
        .select({
          id: quizQuestions.id,
          question: quizQuestions.question,
          optionA: quizQuestions.optionA,
          optionB: quizQuestions.optionB,
          optionC: quizQuestions.optionC,
          optionD: quizQuestions.optionD,
          marks: quizQuestions.marks
        })
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, quizRow.id))
        .orderBy(asc(quizQuestions.id))
    : [];

  res.status(200).json({
    board: {
      slug: chapterRow.boardSlug,
      name: chapterRow.boardName
    },
    grade,
    class: {
      slug: chapterRow.classSlug ?? grade,
      name: chapterRow.className ?? grade
    },
    subject: {
      id: chapterRow.subjectId,
      slug: chapterRow.subjectSlug,
      name: chapterRow.subjectName
    },
    chapter: {
      id: chapterRow.chapterId,
      chapterNumber: chapterRow.chapterNumber,
      title: chapterRow.chapterTitle,
      slug: chapterRow.chapterSlug,
      summary: chapterRow.chapterSummary
    },
    exercises: chapterExercises,
    flashcards: chapterFlashcards,
    quiz: quizRow
      ? {
          ...quizRow,
          questions: quizQuestionRows
        }
      : null
  });
});
