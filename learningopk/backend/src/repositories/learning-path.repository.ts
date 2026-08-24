import { and, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import {
  aiChatSessions,
  boardClasses,
  boards,
  chapters,
  exercises,
  quizAttempts,
  quizzes,
  subjects,
  userProgress,
} from "../lib/db/schema.js";

type LearningPathScope = {
  boardSlug?: string | null;
  classSlug?: string | null;
};

const buildScopeFilters = (scope?: LearningPathScope) => {
  const filters = [eq(chapters.isPublished, true)];

  if (scope?.boardSlug) {
    filters.push(eq(boards.slug, scope.boardSlug));
  }

  if (scope?.classSlug) {
    filters.push(sql`coalesce(${boardClasses.slug}, ${subjects.grade}::text) = ${scope.classSlug}`);
  }

  return filters;
};

export class LearningPathRepository {
  async findChapterSignals(userId: string, scope?: LearningPathScope) {
    return db
      .select({
        chapterId: chapters.id,
        chapterTitle: chapters.title,
        exercisesViewed: userProgress.exercisesViewed,
        visitedAt: userProgress.visitedAt,
        quizAttemptsCount: userProgress.quizAttemptsCount,
        totalExercises: sql<number>`count(distinct ${exercises.id})::int`,
      })
      .from(chapters)
      .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
      .innerJoin(boards, eq(subjects.boardId, boards.id))
      .leftJoin(boardClasses, eq(subjects.boardClassId, boardClasses.id))
      .leftJoin(
        userProgress,
        and(eq(userProgress.chapterId, chapters.id), eq(userProgress.userId, userId))
      )
      .leftJoin(exercises, eq(exercises.chapterId, chapters.id))
      .where(and(...buildScopeFilters(scope)))
      .groupBy(
        chapters.id,
        chapters.title,
        userProgress.exercisesViewed,
        userProgress.visitedAt,
        userProgress.quizAttemptsCount
      );
  }

  async findChapterQuizScores(userId: string, scope?: LearningPathScope) {
    return db
      .select({
        chapterId: chapters.id,
        score: quizAttempts.score,
        totalMarks: quizAttempts.totalMarks,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .innerJoin(chapters, eq(quizzes.chapterId, chapters.id))
      .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
      .innerJoin(boards, eq(subjects.boardId, boards.id))
      .leftJoin(boardClasses, eq(subjects.boardClassId, boardClasses.id))
      .where(
        and(
          eq(quizAttempts.userId, userId),
          eq(quizAttempts.type, "chapter_quiz"),
          ...buildScopeFilters(scope)
        )
      );
  }

  async findAiSessionCounts(userId: string, scope?: LearningPathScope) {
    return db
      .select({
        chapterId: aiChatSessions.chapterId,
        sessionCount: sql<number>`count(*)::int`,
      })
      .from(aiChatSessions)
      .innerJoin(chapters, eq(aiChatSessions.chapterId, chapters.id))
      .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
      .innerJoin(boards, eq(subjects.boardId, boards.id))
      .leftJoin(boardClasses, eq(subjects.boardClassId, boardClasses.id))
      .where(
        and(
          eq(aiChatSessions.userId, userId),
          isNotNull(aiChatSessions.chapterId),
          ...buildScopeFilters(scope)
        )
      )
      .groupBy(aiChatSessions.chapterId);
  }
}

export const learningPathRepository = new LearningPathRepository();
