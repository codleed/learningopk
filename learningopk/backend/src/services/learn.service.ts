import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { boardClasses, boards, chapters, exercises, flashcards, quizQuestions, quizzes, subjects } from "../lib/db/schema.js";
import { listSubjectChapterGraph } from "../lib/chapter-graph.js";

export interface SubjectRow {
  boardId: number;
  boardName: string;
  boardSlug: string;
  className: string | null;
  classSlug: string | null;
  subjectId: number;
  subjectName: string;
  subjectSlug: string;
  subjectDescription: string | null;
}

export interface ChapterRow {
  id: number;
  chapterNumber: number;
  title: string;
  slug: string;
  isPublished: boolean;
}

export interface ChapterDetailRow {
  chapterId: number;
  chapterNumber: number;
  chapterTitle: string;
  chapterSlug: string;
  chapterSummary: string | null;
  boardName: string;
  boardSlug: string;
  className: string | null;
  classSlug: string | null;
  subjectId: number;
  subjectName: string;
  subjectSlug: string;
}

export class LearnService {
  async getSubjectByRoute(params: { board: string; grade: string; subject: string }): Promise<SubjectRow | null> {
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
          eq(boards.slug, params.board),
          eq(subjects.slug, params.subject),
          sql`coalesce(${boardClasses.slug}, ${subjects.grade}::text) = ${params.grade}`
        )
      )
      .limit(1);
    return subjectRows[0] ?? null;
  }

  async getChaptersBySubject(subjectId: number): Promise<ChapterRow[]> {
    return db
      .select({
        id: chapters.id,
        chapterNumber: chapters.chapterNumber,
        title: chapters.title,
        slug: chapters.slug,
        isPublished: chapters.isPublished
      })
      .from(chapters)
      .where(and(eq(chapters.subjectId, subjectId), eq(chapters.isPublished, true)))
      .orderBy(asc(chapters.chapterNumber));
  }

  async getSubjectChapterGraph(subjectId: number, userId: string) {
    return listSubjectChapterGraph({ subjectId, userId });
  }

  async getChapterDetail(params: { board: string; grade: string; subject: string; chapter: string }): Promise<ChapterDetailRow | null> {
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
          eq(boards.slug, params.board),
          sql`coalesce(${boardClasses.slug}, ${subjects.grade}::text) = ${params.grade}`,
          eq(subjects.slug, params.subject),
          eq(chapters.slug, params.chapter),
          eq(chapters.isPublished, true)
        )
      )
      .limit(1);

    return chapterRows[0] ?? null;
  }

  async getChapterExercises(chapterId: number) {
    return db
      .select({
        id: exercises.id,
        exerciseNumber: exercises.exerciseNumber,
        question: exercises.question,
        solution: exercises.solution,
        difficulty: exercises.difficulty,
        type: exercises.type
      })
      .from(exercises)
      .where(eq(exercises.chapterId, chapterId))
      .orderBy(asc(exercises.id));
  }

  async getChapterFlashcards(chapterId: number) {
    return db
      .select({
        id: flashcards.id,
        front: flashcards.front,
        back: flashcards.back,
        orderIndex: flashcards.orderIndex
      })
      .from(flashcards)
      .where(eq(flashcards.chapterId, chapterId))
      .orderBy(asc(flashcards.orderIndex));
  }

  async getChapterQuiz(chapterId: number) {
    const quizRows = await db
      .select({
        id: quizzes.id,
        title: quizzes.title,
        durationMinutes: quizzes.durationMinutes,
        totalMarks: quizzes.totalMarks,
        type: quizzes.type
      })
      .from(quizzes)
      .where(eq(quizzes.chapterId, chapterId))
      .orderBy(asc(quizzes.id))
      .limit(1);

    const quizRow = quizRows[0];
    if (!quizRow) {
      return null;
    }

    const quizQuestionRows = await db
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
      .orderBy(asc(quizQuestions.id));

    return {
      ...quizRow,
      questions: quizQuestionRows
    };
  }
}

export const learnService = new LearnService();
