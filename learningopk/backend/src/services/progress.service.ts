import {
  buildActivityCalendarSeries,
  buildDailyActivitySeries,
  calculateLongestStreakDays,
  calculateStreakDays,
  createUtcDay,
  scoreToPercent,
  toDateKey
} from "../lib/progress-metrics.js";
import { applyProgressEvent } from "../lib/progress.js";
import { formulasRepository } from "../repositories/formulas.repository.js";
import { progressRepository } from "../repositories/progress.repository.js";
import { xpService, XP_VALUES } from "./xp.service.js";

export interface ProgressEventInput {
  eventType: "chapter_visit" | "exercise_view" | "flashcard_complete" | "quiz_submit";
  chapterId: number;
  userId: string;
  score?: number;
  occurredAt?: Date;
}

export interface ProgressEventResult {
  eventType: string;
  progress: {
    chapterId: number;
    visitedAt: string;
    exercisesViewed: number;
    flashcardsCompleted: boolean;
    quizBestScore: number;
    quizAttemptsCount: number;
  };
  xp: {
    xpAwarded: number;
    newXp: number;
    level: number;
    levelName: string;
    leveledUp: boolean;
  } | null;
  xpFailed?: boolean;
}

export interface SubjectAggregate {
  subjectId: number;
  subjectSlug: string;
  subjectName: string;
  grade: "9" | "10";
  boardName: string;
  boardSlug: string;
  totalChapters: number;
  visitedChapters: number;
  bestQuizScorePercent: number;
  lastActiveAt: Date | null;
}

export class ProgressService {
  async recordProgressEvent(input: ProgressEventInput): Promise<ProgressEventResult> {
    const snapshot = await applyProgressEvent(
      input.eventType === "quiz_submit"
        ? {
            eventType: "quiz_submit",
            userId: input.userId,
            chapterId: input.chapterId,
            score: input.score ?? 0,
            occurredAt: input.occurredAt ?? new Date()
          }
        : {
            eventType: input.eventType,
            userId: input.userId,
            chapterId: input.chapterId,
            occurredAt: input.occurredAt ?? new Date()
          }
    );

    // Award XP based on event type
    // Note: quiz_submit XP is handled by quiz service to avoid double awards
    let xpResult: {
      xpAwarded: number;
      newXp: number;
      level: number;
      levelName: string;
      leveledUp: boolean;
    } | null = null;
    let xpFailed = false;
    try {
      if (input.eventType === "chapter_visit") {
        const result = await xpService.awardChapterVisitXp(input.userId);
        xpResult = {
          xpAwarded: result.xpAwarded,
          newXp: result.newXp,
          level: result.level,
          levelName: result.levelName,
          leveledUp: result.leveledUp
        };
      } else if (input.eventType === "exercise_view") {
        const result = await xpService.awardExerciseViewXp(input.userId);
        xpResult = {
          xpAwarded: result.xpAwarded,
          newXp: result.newXp,
          level: result.level,
          levelName: result.levelName,
          leveledUp: result.leveledUp
        };
      } else if (input.eventType === "flashcard_complete") {
        const result = await xpService.awardFlashcardCompleteXp(input.userId);
        xpResult = {
          xpAwarded: result.xpAwarded,
          newXp: result.newXp,
          level: result.level,
          levelName: result.levelName,
          leveledUp: result.leveledUp
        };
      }
      // Note: quiz_submit XP is awarded in quiz.service.ts to avoid double awards
    } catch (error) {
      // Log XP award error but don't fail the progress event
      console.error("Failed to award XP:", error);
      xpFailed = true;
    }

    return {
      eventType: input.eventType,
      progress: {
        chapterId: snapshot.chapterId,
        visitedAt: snapshot.visitedAt.toISOString(),
        exercisesViewed: snapshot.exercisesViewed,
        flashcardsCompleted: snapshot.flashcardsCompleted,
        quizBestScore: snapshot.quizBestScore,
        quizAttemptsCount: snapshot.quizAttemptsCount
      },
      xp: xpResult,
      xpFailed
    };
  }

  async getDashboard(userId: string, studentName: string) {
    const chapterQuizRows = await progressRepository.findChapterQuizTotalMarks();

    const chapterTotalMarks = new Map<number, number>();
    for (const row of chapterQuizRows) {
      if (!chapterTotalMarks.has(row.chapterId)) {
        chapterTotalMarks.set(row.chapterId, row.totalMarks);
      }
    }

    const subjectProgressRows = await progressRepository.findSubjectProgress(userId);

    const subjectAggregates = this.aggregateSubjectProgress(subjectProgressRows, chapterTotalMarks);

    const progressActivityRows = await progressRepository.findProgressByUserId(userId);

    const { streakDays, longestStreakDays, weeklyActivity, activityCalendar } = this.calculateActivityMetrics(progressActivityRows);

    const recentChapterVisitRows = await progressRepository.findRecentChapterVisits(userId, 5);

    const recentQuizRows = await progressRepository.findRecentQuizAttempts(userId, 5);

    const quizHistoryRows = await progressRepository.findQuizHistory(userId, 20);

    const recentActivity = [
      ...recentChapterVisitRows.map((row) => ({
        type: "chapter_visit" as const,
        occurredAt: row.visitedAt,
        subjectSlug: row.subjectSlug,
        subjectName: row.subjectName,
        chapterSlug: row.chapterSlug,
        chapterTitle: row.chapterTitle
      })),
      ...recentQuizRows.map((row) => ({
        type: "quiz_submit" as const,
        occurredAt: row.completedAt,
        subjectSlug: row.subjectSlug,
        subjectName: row.subjectName,
        chapterSlug: row.chapterSlug,
        chapterTitle: row.chapterTitle,
        score: row.score,
        totalMarks: row.totalMarks,
        percentage: scoreToPercent(row.score, row.totalMarks)
      }))
    ]
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
      .slice(0, 5)
      .map((entry) => ({
        ...entry,
        occurredAt: entry.occurredAt.toISOString()
      }));

    const starredFormulas = await formulasRepository.findTopStarredByAccess(userId, 5);

    const subjectsSummary = Array.from(subjectAggregates.values()).map((entry) => ({
      subjectId: entry.subjectId,
      subjectSlug: entry.subjectSlug,
      subjectName: entry.subjectName,
      grade: entry.grade,
      boardName: entry.boardName,
      boardSlug: entry.boardSlug,
      chaptersVisitedPercent: entry.totalChapters > 0 ? Math.round((entry.visitedChapters / entry.totalChapters) * 100) : 0,
      bestQuizScorePercent: entry.bestQuizScorePercent,
      lastActiveAt: entry.lastActiveAt ? entry.lastActiveAt.toISOString() : null
    }));

    // Get XP and level info
    let xpInfo = null;
    try {
      xpInfo = await xpService.getUserXpInfo(userId);
    } catch (error) {
      console.error("Failed to get XP info:", error);
    }

    // Check streak freeze availability
    let streakFreezeInfo = null;
    try {
      const freezeStatus = await xpService.checkStreakFreeze(userId);
      streakFreezeInfo = {
        canUseStreakFreeze: freezeStatus.canUseStreakFreeze,
        nextFreezeAvailableAt: freezeStatus.nextFreezeAvailableAt?.toISOString() ?? null
      };
    } catch (error) {
      console.error("Failed to get streak freeze info:", error);
    }

    return {
      studentName,
      streakDays,
      longestStreakDays,
      subjects: subjectsSummary,
      recentActivity,
      starredFormulas: starredFormulas.map((row) => ({
        formulaId: row.formulaId,
        name: row.name,
        formulaLatex: row.formulaLatex,
        subjectName: row.subjectName,
        chapterTitle: row.chapterTitle,
        accessCount: row.accessCount
      })),
      quizHistory: quizHistoryRows.map((row) => ({
        occurredAt: row.completedAt.toISOString(),
        subjectSlug: row.subjectSlug,
        subjectName: row.subjectName,
        chapterSlug: row.chapterSlug,
        chapterTitle: row.chapterTitle,
        score: row.score,
        totalMarks: row.totalMarks,
        percentage: scoreToPercent(row.score, row.totalMarks)
      })),
      weeklyActivity,
      dailyActivity: activityCalendar,
      xp: xpInfo ? {
        xp: xpInfo.xp,
        level: xpInfo.level,
        levelName: xpInfo.levelName,
        xpToNextLevel: xpInfo.xpToNextLevel
      } : null,
      streakFreeze: streakFreezeInfo
    };
  }

  async getSubjectDashboard(userId: string, boardSlug: string, grade: "9" | "10", subjectSlug: string) {
    const subjectRows = await progressRepository.findSubjectBySlug(boardSlug, grade, subjectSlug);

    const subjectRow = subjectRows[0];
    if (!subjectRow) {
      return null;
    }

    const chapterRows = await progressRepository.findChaptersBySubject(subjectRow.subjectId, userId);

    const chapterQuizRows = await progressRepository.findQuizTotalMarksBySubject(subjectRow.subjectId);

    const chapterTotalMarks = new Map<number, number>();
    for (const row of chapterQuizRows) {
      if (!chapterTotalMarks.has(row.chapterId)) {
        chapterTotalMarks.set(row.chapterId, row.totalMarks);
      }
    }

    const chapterProgress = chapterRows.map((chapter) => {
      const quizAttemptsCount = chapter.quizAttemptsCount ?? 0;
      const quizAttempted = quizAttemptsCount > 0;
      const bestScorePercent = scoreToPercent(chapter.quizBestScore ?? 0, chapterTotalMarks.get(chapter.chapterId) ?? 0);
      const status = quizAttempted ? (bestScorePercent > 70 ? "green" : "yellow") : "grey";

      return {
        chapterId: chapter.chapterId,
        chapterNumber: chapter.chapterNumber,
        chapterTitle: chapter.chapterTitle,
        chapterSlug: chapter.chapterSlug,
        visited: Boolean(chapter.visitedAt),
        exercisesViewed: chapter.exercisesViewed ?? 0,
        quizAttempted,
        bestScorePercent,
        status
      };
    });

    const overallSubjectScorePercent =
      chapterProgress.length > 0
        ? Math.round(chapterProgress.reduce((total, chapter) => total + chapter.bestScorePercent, 0) / chapterProgress.length)
        : 0;

    return {
      subject: {
        id: subjectRow.subjectId,
        slug: subjectRow.subjectSlug,
        name: subjectRow.subjectName,
        grade: subjectRow.grade,
        boardName: subjectRow.boardName,
        boardSlug: subjectRow.boardSlug
      },
      overallSubjectScorePercent,
      chapters: chapterProgress
    };
  }

  private aggregateSubjectProgress(
    subjectProgressRows: Array<{
      subjectId: number;
      subjectSlug: string;
      subjectName: string;
      grade: string | null;
      boardName: string;
      boardSlug: string;
      chapterId: number;
      visitedAt: Date | null;
      quizBestScore: number | null;
    }>,
    chapterTotalMarks: Map<number, number>
  ): Map<number, SubjectAggregate> {
    const subjectAggregates = new Map<number, SubjectAggregate>();

    for (const row of subjectProgressRows) {
      const existing = subjectAggregates.get(row.subjectId);
      const visitedAt = row.visitedAt ?? null;
      const quizBestScore = row.quizBestScore ?? 0;
      const totalMarks = chapterTotalMarks.get(row.chapterId) ?? 0;
      const quizPercent = scoreToPercent(quizBestScore, totalMarks);

      if (!existing) {
        subjectAggregates.set(row.subjectId, {
          subjectId: row.subjectId,
          subjectSlug: row.subjectSlug,
          subjectName: row.subjectName,
          grade: (row.grade ?? "9") as "9" | "10",
          boardName: row.boardName,
          boardSlug: row.boardSlug,
          totalChapters: 1,
          visitedChapters: visitedAt ? 1 : 0,
          bestQuizScorePercent: quizPercent,
          lastActiveAt: visitedAt
        });
        continue;
      }

      existing.totalChapters += 1;
      if (visitedAt) {
        existing.visitedChapters += 1;
        if (!existing.lastActiveAt || visitedAt > existing.lastActiveAt) {
          existing.lastActiveAt = visitedAt;
        }
      }
      if (quizPercent > existing.bestQuizScorePercent) {
        existing.bestQuizScorePercent = quizPercent;
      }
    }

    return subjectAggregates;
  }

  private calculateActivityMetrics(
    progressActivityRows: Array<{
      activityAt: Date | null;
      exercisesViewed: number;
      quizAttemptsCount: number;
    }>
  ) {
    const activityDailyCounts = new Map<string, number>();
    for (const row of progressActivityRows) {
      if (!row.activityAt) continue;
      const key = toDateKey(row.activityAt);
      const count = 1 + row.exercisesViewed + row.quizAttemptsCount;
      activityDailyCounts.set(key, (activityDailyCounts.get(key) ?? 0) + count);
    }

    const today = new Date();
    const todayUtc = createUtcDay(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const activityDates = Array.from(activityDailyCounts.keys()).map((dateKey) => new Date(`${dateKey}T00:00:00.000Z`));
    const streakDays = calculateStreakDays(activityDates, todayUtc);
    const longestStreakDays = calculateLongestStreakDays(activityDates);
    const weeklyActivity = buildDailyActivitySeries({
      activityDailyCounts,
      endDate: todayUtc,
      days: 7
    });
    const activityCalendar = buildActivityCalendarSeries({
      activityDailyCounts,
      endDate: todayUtc,
      days: 365
    });

    return { streakDays, longestStreakDays, weeklyActivity, activityCalendar };
  }
}

export const progressService = new ProgressService();
