import { and, asc, desc, eq, gte, inArray, lt, sql, type SQL } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { withOptionalDbFallback } from "../lib/db-schema-compat.js";
import {
  boardClasses,
  boards,
  chapters,
  exercises,
  quizAttempts,
  quizQuestions,
  quizzes,
  subjects,
  userActivityLog,
  userDailyMomentumGoals,
  userProgress,
} from "../lib/db/schema.js";

export class ProgressRepository {
  async findChapterById(chapterId: number) {
    return db.select({ id: chapters.id }).from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  }

  async findSubjectBySlug(boardSlug: string, grade: "9" | "10", subjectSlug: string) {
    return withOptionalDbFallback(
      "subjects.exam_date.findSubjectBySlug",
      () =>
        db
          .select({
            subjectId: subjects.id,
            subjectSlug: subjects.slug,
            subjectName: subjects.name,
            grade: subjects.grade,
            boardName: boards.name,
            boardSlug: boards.slug,
            examDate: subjects.examDate,
          })
          .from(subjects)
          .innerJoin(boards, eq(subjects.boardId, boards.id))
          .where(
            and(
              eq(boards.slug, boardSlug),
              eq(subjects.grade, grade),
              eq(subjects.slug, subjectSlug)
            )
          ),
      () =>
        db
          .select({
            subjectId: subjects.id,
            subjectSlug: subjects.slug,
            subjectName: subjects.name,
            grade: subjects.grade,
            boardName: boards.name,
            boardSlug: boards.slug,
            examDate: sql<Date | null>`null`,
          })
          .from(subjects)
          .innerJoin(boards, eq(subjects.boardId, boards.id))
          .where(
            and(
              eq(boards.slug, boardSlug),
              eq(subjects.grade, grade),
              eq(subjects.slug, subjectSlug)
            )
          )
    );
  }

  async findChaptersBySubject(subjectId: number, userId: string) {
    return withOptionalDbFallback(
      "subjects.exam_date.findChaptersBySubject",
      () =>
        db
          .select({
            chapterId: chapters.id,
            chapterNumber: chapters.chapterNumber,
            chapterTitle: chapters.title,
            chapterSlug: chapters.slug,
            visitedAt: userProgress.visitedAt,
            exercisesViewed: userProgress.exercisesViewed,
            quizAttemptsCount: userProgress.quizAttemptsCount,
            quizBestScore: userProgress.quizBestScore,
            examDate: subjects.examDate,
          })
          .from(chapters)
          .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
          .leftJoin(
            userProgress,
            and(eq(userProgress.chapterId, chapters.id), eq(userProgress.userId, userId))
          )
          .where(and(eq(chapters.subjectId, subjectId), eq(chapters.isPublished, true)))
          .orderBy(asc(chapters.chapterNumber)),
      () =>
        db
          .select({
            chapterId: chapters.id,
            chapterNumber: chapters.chapterNumber,
            chapterTitle: chapters.title,
            chapterSlug: chapters.slug,
            visitedAt: userProgress.visitedAt,
            exercisesViewed: userProgress.exercisesViewed,
            quizAttemptsCount: userProgress.quizAttemptsCount,
            quizBestScore: userProgress.quizBestScore,
            examDate: sql<Date | null>`null`,
          })
          .from(chapters)
          .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
          .leftJoin(
            userProgress,
            and(eq(userProgress.chapterId, chapters.id), eq(userProgress.userId, userId))
          )
          .where(and(eq(chapters.subjectId, subjectId), eq(chapters.isPublished, true)))
          .orderBy(asc(chapters.chapterNumber))
    );
  }

  async findQuizTotalMarksBySubject(subjectId: number) {
    return db
      .select({
        chapterId: quizzes.chapterId,
        totalMarks: quizzes.totalMarks,
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
        quizAttemptsCount: userProgress.quizAttemptsCount,
      })
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
  }

  async findActivityLogByUserId(userId: string) {
    return withOptionalDbFallback(
      "user_activity_log.findByUserId",
      () =>
        db
          .select({
            occurredAt: userActivityLog.occurredAt,
          })
          .from(userActivityLog)
          .where(eq(userActivityLog.userId, userId)),
      async () => {
        const rows = await db
          .select({
            activityAt: userProgress.visitedAt,
            exercisesViewed: userProgress.exercisesViewed,
            quizAttemptsCount: userProgress.quizAttemptsCount,
          })
          .from(userProgress)
          .where(eq(userProgress.userId, userId));
        return rows
          .filter((row): row is typeof row & { activityAt: Date } => row.activityAt instanceof Date)
          .map((row) => ({ occurredAt: row.activityAt }));
      }
    );
  }

  async hasActivityInRange(userId: string, startUtc: Date, endUtc: Date) {
    return withOptionalDbFallback(
      "user_activity_log.hasActivityInRange",
      async () => {
        const rows = await db
          .select({ id: userActivityLog.id })
          .from(userActivityLog)
          .where(
            and(
              eq(userActivityLog.userId, userId),
              gte(userActivityLog.occurredAt, startUtc),
              lt(userActivityLog.occurredAt, endUtc)
            )
          )
          .limit(1);
        return rows.length > 0;
      },
      async () => {
        const rows = await db
          .select({ id: userProgress.id })
          .from(userProgress)
          .where(
            and(
              eq(userProgress.userId, userId),
              gte(userProgress.visitedAt, startUtc),
              lt(userProgress.visitedAt, endUtc)
            )
          )
          .limit(1);
        return rows.length > 0;
      }
    );
  }

  async findRecentChapterVisits(userId: string, limit = 5) {
    return db
      .select({
        visitedAt: userProgress.visitedAt,
        subjectSlug: subjects.slug,
        subjectName: subjects.name,
        chapterSlug: chapters.slug,
        chapterTitle: chapters.title,
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
        chapterTitle: chapters.title,
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
        chapterTitle: chapters.title,
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
        totalMarks: quizzes.totalMarks,
      })
      .from(quizzes)
      .where(eq(quizzes.type, "chapter_quiz"))
      .orderBy(asc(quizzes.id));
  }

  async findQuizTotalMarksByChapter(chapterId: number) {
    return db
      .select({
        chapterId: quizzes.chapterId,
        totalMarks: quizzes.totalMarks,
      })
      .from(quizzes)
      .where(and(eq(quizzes.chapterId, chapterId), eq(quizzes.type, "chapter_quiz")))
      .limit(1);
  }

  async findSubjectProgress(userId: string, boardSlug?: string, grade?: string) {
    const conditions: SQL[] = [];
    if (boardSlug) conditions.push(eq(boards.slug, boardSlug));
    if (grade)
      conditions.push(sql`coalesce(${boardClasses.slug}, ${subjects.grade}::text) = ${grade}`);

    return withOptionalDbFallback(
      "subjects.exam_date.findSubjectProgress",
      () =>
        db
          .select({
            subjectId: subjects.id,
            subjectSlug: subjects.slug,
            subjectName: subjects.name,
            grade: subjects.grade,
            boardName: boards.name,
            boardSlug: boards.slug,
            chapterId: chapters.id,
            visitedAt: userProgress.visitedAt,
            quizBestScore: userProgress.quizBestScore,
            quizAttemptsCount: userProgress.quizAttemptsCount,
            chapterNumber: chapters.chapterNumber,
            chapterSlug: chapters.slug,
            chapterTitle: chapters.title,
            examDate: subjects.examDate,
          })
          .from(subjects)
          .innerJoin(boards, eq(subjects.boardId, boards.id))
          .leftJoin(boardClasses, eq(subjects.boardClassId, boardClasses.id))
          .innerJoin(
            chapters,
            and(eq(chapters.subjectId, subjects.id), eq(chapters.isPublished, true))
          )
          .leftJoin(
            userProgress,
            and(eq(userProgress.chapterId, chapters.id), eq(userProgress.userId, userId))
          )
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(asc(subjects.name), asc(chapters.chapterNumber)),
      () =>
        db
          .select({
            subjectId: subjects.id,
            subjectSlug: subjects.slug,
            subjectName: subjects.name,
            grade: subjects.grade,
            boardName: boards.name,
            boardSlug: boards.slug,
            chapterId: chapters.id,
            visitedAt: userProgress.visitedAt,
            quizBestScore: userProgress.quizBestScore,
            quizAttemptsCount: userProgress.quizAttemptsCount,
            chapterNumber: chapters.chapterNumber,
            chapterSlug: chapters.slug,
            chapterTitle: chapters.title,
            examDate: sql<Date | null>`null`,
          })
          .from(subjects)
          .innerJoin(boards, eq(subjects.boardId, boards.id))
          .leftJoin(boardClasses, eq(subjects.boardClassId, boardClasses.id))
          .innerJoin(
            chapters,
            and(eq(chapters.subjectId, subjects.id), eq(chapters.isPublished, true))
          )
          .leftJoin(
            userProgress,
            and(eq(userProgress.chapterId, chapters.id), eq(userProgress.userId, userId))
          )
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(asc(subjects.name), asc(chapters.chapterNumber))
    );
  }

  async findQuizAttemptsForSubjects(userId: string, subjectIds: number[]) {
    if (subjectIds.length === 0) {
      return [];
    }

    return db
      .select({
        attemptId: quizAttempts.id,
        quizId: quizAttempts.quizId,
        answers: quizAttempts.answers,
        completedAt: quizAttempts.completedAt,
        subjectId: subjects.id,
        subjectSlug: subjects.slug,
        subjectName: subjects.name,
        grade: subjects.grade,
        boardSlug: boards.slug,
        chapterId: chapters.id,
        chapterSlug: chapters.slug,
        chapterTitle: chapters.title,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .innerJoin(chapters, eq(quizzes.chapterId, chapters.id))
      .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
      .innerJoin(boards, eq(subjects.boardId, boards.id))
      .where(and(eq(quizAttempts.userId, userId), inArray(subjects.id, subjectIds)))
      .orderBy(desc(quizAttempts.completedAt));
  }

  async findQuizQuestionsForQuizzes(quizIds: number[]) {
    if (quizIds.length === 0) {
      return [];
    }

    return db
      .select({
        questionId: quizQuestions.id,
        quizId: quizQuestions.quizId,
        chapterId: quizQuestions.chapterId,
        question: quizQuestions.question,
        correctOption: quizQuestions.correctOption,
      })
      .from(quizQuestions)
      .where(inArray(quizQuestions.quizId, quizIds));
  }

  async findExercisesForChapters(chapterIds: number[]) {
    if (chapterIds.length === 0) {
      return [];
    }

    return db
      .select({
        exerciseId: exercises.id,
        chapterId: exercises.chapterId,
        exerciseNumber: exercises.exerciseNumber,
        question: exercises.question,
      })
      .from(exercises)
      .where(inArray(exercises.chapterId, chapterIds))
      .orderBy(asc(exercises.chapterId), asc(exercises.exerciseNumber));
  }

  async findDailyMomentumGoal(userId: string, dateKey: string) {
    const rows = await db
      .select({
        id: userDailyMomentumGoals.id,
        dateKey: userDailyMomentumGoals.dateKey,
        focusType: userDailyMomentumGoals.focusType,
        chapterId: userDailyMomentumGoals.chapterId,
        xpAwarded: userDailyMomentumGoals.xpAwarded,
        completedAt: userDailyMomentumGoals.completedAt,
      })
      .from(userDailyMomentumGoals)
      .where(
        and(eq(userDailyMomentumGoals.userId, userId), eq(userDailyMomentumGoals.dateKey, dateKey))
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async createDailyMomentumGoal(input: {
    userId: string;
    dateKey: string;
    focusType: string;
    chapterId: number | null;
    xpAwarded: number;
  }) {
    const rows = await db
      .insert(userDailyMomentumGoals)
      .values({
        userId: input.userId,
        dateKey: input.dateKey,
        focusType: input.focusType,
        chapterId: input.chapterId,
        xpAwarded: input.xpAwarded,
      })
      .returning({
        id: userDailyMomentumGoals.id,
        dateKey: userDailyMomentumGoals.dateKey,
        focusType: userDailyMomentumGoals.focusType,
        chapterId: userDailyMomentumGoals.chapterId,
        xpAwarded: userDailyMomentumGoals.xpAwarded,
        completedAt: userDailyMomentumGoals.completedAt,
      });

    return rows[0] ?? null;
  }
}

export const progressRepository = new ProgressRepository();
