import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { boards, chapters, quizAttempts, quizzes, subjects, userProgress } from "../lib/db/schema.js";

export class ProgressRepository {
  async findChapterById(chapterId: number) {
    return db
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.id, chapterId))
      .limit(1);
  }

  async findSubjectBySlug(boardSlug: string, grade: "9" | "10", subjectSlug: string) {
    return db
      .select({
        subjectId: subjects.id,
        subjectSlug: subjects.slug,
        subjectName: subjects.name,
        grade: subjects.grade,
        boardName: boards.name,
        boardSlug: boards.slug
      })
      .from(subjects)
      .innerJoin(boards, eq(subjects.boardId, boards.id))
      .where(
        and(
          eq(boards.slug, boardSlug),
          eq(subjects.grade, grade),
          eq(subjects.slug, subjectSlug)
        )
      );
  }

  async findChaptersBySubject(subjectId: number, userId: string) {
    return db
      .select({
        chapterId: chapters.id,
        chapterNumber: chapters.chapterNumber,
        chapterTitle: chapters.title,
        chapterSlug: chapters.slug,
        visitedAt: userProgress.visitedAt,
        exercisesViewed: userProgress.exercisesViewed,
        quizAttemptsCount: userProgress.quizAttemptsCount,
        quizBestScore: userProgress.quizBestScore
      })
      .from(chapters)
      .leftJoin(userProgress, and(eq(userProgress.chapterId, chapters.id), eq(userProgress.userId, userId)))
      .where(and(eq(chapters.subjectId, subjectId), eq(chapters.isPublished, true)))
      .orderBy(asc(chapters.chapterNumber));
  }

  async findQuizTotalMarksBySubject(subjectId: number) {
    return db
      .select({
        chapterId: quizzes.chapterId,
        totalMarks: quizzes.totalMarks
      })
      .from(quizzes)
      .innerJoin(chapters, eq(quizzes.chapterId, chapters.id))
      .where(and(eq(chapters.subjectId, subjectId), eq(quizzes.type, "chapter_quiz")))
      .orderBy(asc(quizzes.id));
  }

  async findProgressByUserId(userId: string) {
    return db
      .select({
        activityAt: userProgress.visitedAt,
        exercisesViewed: userProgress.exercisesViewed,
        quizAttemptsCount: userProgress.quizAttemptsCount
      })
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
  }

  async findRecentChapterVisits(userId: string, limit = 5) {
    return db
      .select({
        visitedAt: userProgress.visitedAt,
        subjectSlug: subjects.slug,
        subjectName: subjects.name,
        chapterSlug: chapters.slug,
        chapterTitle: chapters.title
      })
      .from(userProgress)
      .innerJoin(chapters, eq(userProgress.chapterId, chapters.id))
      .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
      .where(eq(userProgress.userId, userId))
      .orderBy(desc(userProgress.visitedAt))
      .limit(limit);
  }

  async findRecentQuizAttempts(userId: string, limit = 5) {
    return db
      .select({
        completedAt: quizAttempts.completedAt,
        score: quizAttempts.score,
        totalMarks: quizAttempts.totalMarks,
        subjectSlug: subjects.slug,
        subjectName: subjects.name,
        chapterSlug: chapters.slug,
        chapterTitle: chapters.title
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .innerJoin(chapters, eq(quizzes.chapterId, chapters.id))
      .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
      .where(eq(quizAttempts.userId, userId))
      .orderBy(desc(quizAttempts.completedAt))
      .limit(limit);
  }

  async findQuizHistory(userId: string, limit = 20) {
    return db
      .select({
        completedAt: quizAttempts.completedAt,
        score: quizAttempts.score,
        totalMarks: quizAttempts.totalMarks,
        subjectSlug: subjects.slug,
        subjectName: subjects.name,
        chapterSlug: chapters.slug,
        chapterTitle: chapters.title
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .innerJoin(chapters, eq(quizzes.chapterId, chapters.id))
      .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
      .where(eq(quizAttempts.userId, userId))
      .orderBy(desc(quizAttempts.completedAt))
      .limit(limit);
  }

  async findChapterQuizTotalMarks() {
    return db
      .select({
        chapterId: quizzes.chapterId,
        totalMarks: quizzes.totalMarks
      })
      .from(quizzes)
      .where(eq(quizzes.type, "chapter_quiz"))
      .orderBy(asc(quizzes.id));
  }

  async findQuizTotalMarksByChapter(chapterId: number) {
    return db
      .select({
        chapterId: quizzes.chapterId,
        totalMarks: quizzes.totalMarks
      })
      .from(quizzes)
      .where(and(eq(quizzes.chapterId, chapterId), eq(quizzes.type, "chapter_quiz")))
      .limit(1);
  }

  async findSubjectProgress(userId: string) {
    return db
      .select({
        subjectId: subjects.id,
        subjectSlug: subjects.slug,
        subjectName: subjects.name,
        grade: subjects.grade,
        boardName: boards.name,
        boardSlug: boards.slug,
        chapterId: chapters.id,
        visitedAt: userProgress.visitedAt,
        quizBestScore: userProgress.quizBestScore
      })
      .from(subjects)
      .innerJoin(boards, eq(subjects.boardId, boards.id))
      .innerJoin(chapters, and(eq(chapters.subjectId, subjects.id), eq(chapters.isPublished, true)))
      .leftJoin(userProgress, and(eq(userProgress.chapterId, chapters.id), eq(userProgress.userId, userId)))
      .orderBy(asc(subjects.name), asc(chapters.chapterNumber));
  }
}

export const progressRepository = new ProgressRepository();
