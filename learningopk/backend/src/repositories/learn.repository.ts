import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { boardClasses, boards, chapters, exercises, flashcards, mockExams, quizQuestions, quizzes, subjects } from "../lib/db/schema.js";
import { CacheKeys, cacheService } from "../lib/cache/cache.service.js";
import { quizRepository } from "./quiz.repository.js";

export class LearnRepository {
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
    }>>(cacheKey);
    if (cached) return cached;

    const result = await db
      .select({
        id: chapters.id,
        chapterNumber: chapters.chapterNumber,
        title: chapters.title,
        slug: chapters.slug,
        isPublished: chapters.isPublished
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
    // Get quiz by chapter ID and enhance with mock exam duration
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
      .where(eq(quizzes.chapterId, chapterId))
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
}

export const learnRepository = new LearnRepository();
