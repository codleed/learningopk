import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { withOptionalDbFallback } from "../lib/db-schema-compat.js";
import {
  boardClasses,
  boards,
  chapterSubparts,
  chapters,
  exercises,
  flashcards,
  mockExams,
  quizQuestions,
  quizzes,
  revisionNotes,
  subjects
} from "../lib/db/schema.js";
import { CacheKeys, cacheService } from "../lib/cache/cache.service.js";
import { quizRepository } from "./quiz.repository.js";

export class LearnRepository {
  async findAllBoards() {
    const cacheKey = "learn:boards";
    const cached = await cacheService.get<Array<{
      id: number;
      name: string;
      slug: string;
    }>>(cacheKey);
    if (cached) return cached;

    const result = await db
      .select({
        id: boards.id,
        name: boards.name,
        slug: boards.slug
      })
      .from(boards)
      .orderBy(asc(boards.name));

    await cacheService.set(cacheKey, result, { ttlSeconds: 3600 });
    return result;
  }

  async findAllBoardClasses() {
    const cacheKey = "learn:boardClasses";
    const cached = await cacheService.get<Array<{
      id: number;
      boardId: number;
      name: string;
      slug: string;
    }>>(cacheKey);
    if (cached) return cached;

    const result = await db
      .select({
        id: boardClasses.id,
        boardId: boardClasses.boardId,
        name: boardClasses.name,
        slug: boardClasses.slug
      })
      .from(boardClasses)
      .orderBy(asc(boardClasses.boardId), asc(boardClasses.name));

    await cacheService.set(cacheKey, result, { ttlSeconds: 3600 });
    return result;
  }

  async findAllSubjectsWithBoard() {
    const cacheKey = "learn:subjectsWithBoard";
    const cached = await cacheService.get<Array<{
      id: number;
      name: string;
      slug: string;
      grade: string | null;
      className: string | null;
      classSlug: string | null;
      boardClassId: number | null;
      boardId: number;
      boardName: string;
      boardSlug: string;
      coverImageUrl: string | null;
    }>>(cacheKey);
    if (cached) return cached;

    const result = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        slug: subjects.slug,
        grade: subjects.grade,
        className: sql<string | null>`coalesce(${boardClasses.name}, case when ${subjects.grade} is not null then concat(${subjects.grade}::text, 'th') else null end)`,
        classSlug: sql<string | null>`coalesce(${boardClasses.slug}, ${subjects.grade}::text)`,
        boardClassId: subjects.boardClassId,
        boardId: subjects.boardId,
        boardName: boards.name,
        boardSlug: boards.slug,
        coverImageUrl: subjects.coverImageUrl
      })
      .from(subjects)
      .innerJoin(boards, eq(subjects.boardId, boards.id))
      .leftJoin(boardClasses, eq(subjects.boardClassId, boardClasses.id))
      .orderBy(asc(subjects.boardId), asc(sql`coalesce(${boardClasses.name}, ${subjects.grade}::text)`), asc(subjects.name));

    await cacheService.set(cacheKey, result, { ttlSeconds: 3600 });
    return result;
  }

  async findAllSubjects() {
    const cacheKey = CacheKeys.subjectList();
    const cached = await cacheService.get<Array<{
      id: number;
      boardId: number;
      grade: string | null;
      name: string;
      slug: string;
      icon: string | null;
      description: string | null;
    }>>(cacheKey);
    if (cached) return cached;

    const result = await db
      .select({
        id: subjects.id,
        boardId: subjects.boardId,
        grade: subjects.grade,
        name: subjects.name,
        slug: subjects.slug,
        icon: subjects.icon,
        description: subjects.description
      })
      .from(subjects)
      .orderBy(asc(subjects.name));

    await cacheService.set(cacheKey, result, { ttlSeconds: 3600 });
    return result;
  }

  async findSubjectByRoute(params: { board: string; grade: string; subject: string }) {
    return db
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
  }

  async findChaptersBySubject(subjectId: number, isPublished = true) {
    const cacheKey = CacheKeys.chapterList(subjectId);
    const cached = await cacheService.get<Array<{
      id: number;
      chapterNumber: number;
      title: string;
      slug: string;
      isPublished: boolean;
      coverImageUrl: string | null;
    }>>(cacheKey);
    if (cached) return cached;

    const result = await db
      .select({
        id: chapters.id,
        chapterNumber: chapters.chapterNumber,
        title: chapters.title,
        slug: chapters.slug,
        isPublished: chapters.isPublished,
        coverImageUrl: chapters.coverImageUrl
      })
      .from(chapters)
      .where(and(eq(chapters.subjectId, subjectId), isPublished ? eq(chapters.isPublished, true) : undefined))
      .orderBy(asc(chapters.chapterNumber));

    await cacheService.set(cacheKey, result, { ttlSeconds: 3600 });
    return result;
  }

  async findChapterBySlug(params: { board: string; grade: string; subject: string; chapter: string }) {
    return db
      .select({
        chapterId: chapters.id,
        chapterNumber: chapters.chapterNumber,
        chapterTitle: chapters.title,
        chapterSlug: chapters.slug,
        chapterSummary: chapters.summary,
        chapterCoverImageUrl: chapters.coverImageUrl,
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
  }

  async findChapterSubparts(chapterId: number) {
    return db
      .select({
        id: chapterSubparts.id,
        chapterId: chapterSubparts.chapterId,
        orderIndex: chapterSubparts.orderIndex,
        heading: chapterSubparts.heading,
        content: chapterSubparts.content
      })
      .from(chapterSubparts)
      .where(eq(chapterSubparts.chapterId, chapterId))
      .orderBy(asc(chapterSubparts.orderIndex), asc(chapterSubparts.id));
  }

  async findExercisesByChapter(chapterId: number) {
    return db
      .select({
        id: exercises.id,
        exerciseNumber: exercises.exerciseNumber,
        question: exercises.question,
        solution: exercises.solution,
        difficulty: exercises.difficulty,
        type: exercises.type,
        visualizationHtml: exercises.visualizationHtml,
        blanksAnswer: exercises.blanksAnswer
      })
      .from(exercises)
      .where(eq(exercises.chapterId, chapterId))
      .orderBy(asc(exercises.id));
  }

  async findFlashcardsByChapter(chapterId: number) {
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

  async findQuizByChapter(chapterId: number) {
    // Get chapter quiz by chapter ID for chapter challenge screens.
    const quizzesData = await db
      .select({
        id: quizzes.id,
        chapterId: quizzes.chapterId,
        title: quizzes.title,
        durationMinutes: quizzes.durationMinutes,
        totalMarks: quizzes.totalMarks,
        type: quizzes.type
      })
      .from(quizzes)
      .where(and(eq(quizzes.chapterId, chapterId), eq(quizzes.type, "chapter_quiz")))
      .orderBy(asc(quizzes.id))
      .limit(1);

    const quiz = quizzesData[0];
    if (!quiz) {
      return [];
    }

    // Check if there's a mock exam with custom duration
    const mockExamData = await db
      .select({
        durationMinutes: mockExams.durationMinutes
      })
      .from(mockExams)
      .where(eq(mockExams.quizId, quiz.id))
      .limit(1);

    const mockExam = mockExamData[0];
    // For mock exams, use duration from mock_exams table (120 min) instead of quizzes table (90 min)
    const durationMinutes = mockExam?.durationMinutes ?? quiz.durationMinutes;

    return [{
      id: quiz.id,
      title: quiz.title,
      durationMinutes,
      totalMarks: quiz.totalMarks,
      type: quiz.type
    }];
  }

  async findQuizQuestions(quizId: number) {
    // Use QuizRepository for quiz questions to avoid duplication
    const questions = await quizRepository.findQuestionsByQuizId(quizId);
    return questions.map(q => ({
      id: q.id,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      marks: q.marks
    }));
  }

  async findRevisionNotesByChapter(chapterId: number) {
    return withOptionalDbFallback(
      "revision_notes",
      async () => {
        const rows = await db
          .select({
            keyFormulas: revisionNotes.keyFormulas,
            keyDefinitions: revisionNotes.keyDefinitions,
            commonMistakes: revisionNotes.commonMistakes,
            examTips: revisionNotes.examTips
          })
          .from(revisionNotes)
          .where(eq(revisionNotes.chapterId, chapterId))
          .limit(1);

        return rows[0] ?? null;
      },
      () => null
    );
  }
}

export const learnRepository = new LearnRepository();
