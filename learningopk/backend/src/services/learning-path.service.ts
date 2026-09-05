import { scoreToPercent } from "../lib/progress-metrics.js";
import {
  buildLearningPathRecommendations,
  matchesWeakTopic,
  type LearningPathResult,
} from "../lib/learning-path.js";
import { aiContextRepository } from "../repositories/ai-context.repository.js";
import { learningPathRepository } from "../repositories/learning-path.repository.js";

type LearningPathScope = {
  boardSlug?: string | null;
  classSlug?: string | null;
};

export class LearningPathService {
  async getLearningPath(userId: string, scope?: LearningPathScope): Promise<LearningPathResult> {
    const [chapterRows, quizRows, aiSessionRows, aiContext] = await Promise.all([
      learningPathRepository.findChapterSignals(userId, scope),
      learningPathRepository.findChapterQuizScores(userId, scope),
      learningPathRepository.findAiSessionCounts(userId, scope),
      aiContextRepository.findByUserId(userId),
    ]);

    const averageQuizPercentByChapter = new Map<number, number>();
    const quizBuckets = new Map<number, number[]>();

    for (const row of quizRows) {
      const percentage = scoreToPercent(row.score, row.totalMarks);
      const current = quizBuckets.get(row.chapterId) ?? [];
      current.push(percentage);
      quizBuckets.set(row.chapterId, current);
    }

    for (const [chapterId, percentages] of quizBuckets) {
      const average =
        percentages.reduce((total, value) => total + value, 0) / Math.max(percentages.length, 1);
      averageQuizPercentByChapter.set(chapterId, Math.round(average));
    }

    const aiSessionCountByChapter = new Map<number, number>();
    for (const row of aiSessionRows) {
      if (typeof row.chapterId === "number") {
        aiSessionCountByChapter.set(row.chapterId, row.sessionCount);
      }
    }

    const weakTopics = aiContext?.weakTopics ?? [];

    return buildLearningPathRecommendations({
      signals: chapterRows.map((row) => ({
        chapterId: row.chapterId,
        chapterTitle: row.chapterTitle,
        hasProgressSignal:
          Boolean(row.visitedAt) ||
          (row.exercisesViewed ?? 0) > 0 ||
          (row.quizAttemptsCount ?? 0) > 0,
        quizScorePercent: averageQuizPercentByChapter.get(row.chapterId) ?? null,
        exercisesViewed: row.exercisesViewed ?? 0,
        totalExercises: row.totalExercises,
        aiSessionCount: aiSessionCountByChapter.get(row.chapterId) ?? 0,
        weakTopicMatch: matchesWeakTopic(row.chapterTitle, weakTopics),
      })),
      limit: 10,
    });
  }
}

export const learningPathService = new LearningPathService();
