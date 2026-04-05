import { Router } from "express";
import { z } from "zod";

import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { learnRepository } from "../repositories/learn.repository.js";
import { listSubjectChapterGraph } from "../lib/chapter-graph.js";

const paramsSchema = z.object({
  board: z.string().trim().regex(/^[a-z0-9-]+$/),
  grade: z.string().trim().regex(/^[a-z0-9-]+$/),
  subject: z.string().trim().regex(/^[a-z0-9-]+$/)
});

const chapterParamsSchema = paramsSchema.extend({
  chapter: z.string().trim().regex(/^[a-z0-9-]+$/)
});

export const learnRouter = Router();

learnRouter.get("/boards", async (_req, res) => {
  const [boardRows, classRows] = await Promise.all([
    learnRepository.findAllBoards(),
    learnRepository.findAllBoardClasses()
  ]);

  res.status(200).json({
    boards: boardRows,
    classes: classRows
  });
});

learnRouter.get("/subjects", async (_req, res) => {
  const subjectRows = await learnRepository.findAllSubjectsWithBoard();

  res.status(200).json({
    subjects: subjectRows
  });
});

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
  const subjectRows = await learnRepository.findSubjectByRoute(parsed.data);
  const subjectRow = subjectRows[0] ?? null;

  if (!subjectRow) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  const chapterRows = await learnRepository.findChaptersBySubject(subjectRow.subjectId);

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

  const subjectRows = await learnRepository.findSubjectByRoute(parsed.data);
  const subjectRow = subjectRows[0] ?? null;
  if (!subjectRow) {
    res.status(404).json({
      error: "Subject not found"
    });
    return;
  }

  const graph = await listSubjectChapterGraph({ subjectId: subjectRow.subjectId, userId: authedReq.session.user.id });

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

  const chapterRows = await learnRepository.findChapterBySlug({ board, grade, subject, chapter });
  const chapterRow = chapterRows[0] ?? null;
  if (!chapterRow) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  const [chapterExercises, chapterFlashcards, quizRows] = await Promise.all([
    learnRepository.findExercisesByChapter(chapterRow.chapterId),
    learnRepository.findFlashcardsByChapter(chapterRow.chapterId),
    learnRepository.findQuizByChapter(chapterRow.chapterId)
  ]);

  const quizRow = quizRows[0] ?? null;
  let quiz = null;
  if (quizRow) {
    const quizQuestions = await learnRepository.findQuizQuestions(quizRow.id);
    quiz = { ...quizRow, questions: quizQuestions };
  }

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
    quiz: quiz
  });
});
