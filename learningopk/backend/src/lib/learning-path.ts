const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export type LearningPathSignal = {
  chapterId: number;
  chapterTitle: string;
  hasProgressSignal: boolean;
  quizScorePercent: number | null;
  exercisesViewed: number;
  totalExercises: number;
  aiSessionCount: number;
  weakTopicMatch: boolean;
};

export type LearningPathRecommendation = {
  chapterId: number;
  priority: number;
  reason: string;
  estimatedTime: string;
};

export type LearningPathResult = {
  recommendedChapters: LearningPathRecommendation[];
  studentWeakAreas: string[];
};

const buildReason = (signal: LearningPathSignal): string => {
  const reasons: string[] = [];

  if (signal.quizScorePercent !== null && signal.quizScorePercent < 60) {
    reasons.push(`quiz score is ${signal.quizScorePercent}%`);
  }

  if (signal.totalExercises > 0) {
    const remainingExercises = Math.max(signal.totalExercises - signal.exercisesViewed, 0);
    if (remainingExercises > 0) {
      reasons.push(`${remainingExercises} exercise${remainingExercises === 1 ? "" : "s"} still need practice`);
    }
  }

  if (signal.aiSessionCount > 0 || signal.weakTopicMatch) {
    reasons.push(
      signal.aiSessionCount > 1
        ? "AI tutor needed repeated help here"
        : "AI tutor flagged this as a weak area"
    );
  }

  return reasons.length > 0 ? reasons.join("; ") : "Needs more reinforcement from recent learning activity";
};

const buildEstimatedTime = (signal: LearningPathSignal): string => {
  const remainingExercises = Math.max(signal.totalExercises - signal.exercisesViewed, 0);
  let minutes = 15;

  if (signal.quizScorePercent !== null && signal.quizScorePercent < 50) {
    minutes += 10;
  } else if (signal.quizScorePercent !== null && signal.quizScorePercent < 70) {
    minutes += 5;
  }

  if (remainingExercises >= 4) {
    minutes += 10;
  } else if (remainingExercises > 0) {
    minutes += 5;
  }

  if (signal.aiSessionCount >= 2) {
    minutes += 5;
  }

  return `${minutes}-${minutes + 10} min`;
};

export const matchesWeakTopic = (chapterTitle: string, weakTopics: string[]): boolean => {
  const normalizedTitle = chapterTitle.trim().toLowerCase();
  if (normalizedTitle.length === 0) {
    return false;
  }

  return weakTopics.some((topic) => {
    const normalizedTopic = topic.trim().toLowerCase();
    return normalizedTopic.length > 0 && (normalizedTitle.includes(normalizedTopic) || normalizedTopic.includes(normalizedTitle));
  });
};

export const buildLearningPathRecommendations = (params: {
  signals: LearningPathSignal[];
  limit?: number;
}): LearningPathResult => {
  const scored = params.signals
    .map((signal) => {
      const quizWeakness = signal.quizScorePercent === null
        ? (signal.hasProgressSignal ? 0.2 : 0)
        : clamp((100 - signal.quizScorePercent) / 100, 0, 1);

      const exerciseCoverage = signal.totalExercises > 0
        ? clamp(signal.exercisesViewed / signal.totalExercises, 0, 1)
        : 0;
      const exerciseWeakness = signal.totalExercises > 0
        ? 1 - exerciseCoverage
        : (signal.hasProgressSignal && signal.exercisesViewed === 0 ? 0.4 : 0);

      const aiEngagementWeakness = clamp(
        (signal.aiSessionCount + (signal.weakTopicMatch ? 1 : 0)) / 3,
        0,
        1
      );

      const weightedScore =
        quizWeakness * 0.5 +
        exerciseWeakness * 0.3 +
        aiEngagementWeakness * 0.2;

      return {
        signal,
        weightedScore
      };
    })
    .filter(({ signal, weightedScore }) => {
      const hasStoredSignal = signal.hasProgressSignal || signal.aiSessionCount > 0 || signal.weakTopicMatch;
      return hasStoredSignal && weightedScore > 0;
    })
    .sort((left, right) => {
      if (right.weightedScore !== left.weightedScore) {
        return right.weightedScore - left.weightedScore;
      }
      if (right.signal.aiSessionCount !== left.signal.aiSessionCount) {
        return right.signal.aiSessionCount - left.signal.aiSessionCount;
      }
      return left.signal.chapterTitle.localeCompare(right.signal.chapterTitle);
    });

  const recommendedChapters = scored.slice(0, params.limit ?? 10).map(({ signal }, index) => ({
    chapterId: signal.chapterId,
    priority: index + 1,
    reason: buildReason(signal),
    estimatedTime: buildEstimatedTime(signal)
  }));

  return {
    recommendedChapters,
    studentWeakAreas: scored.map(({ signal }) => signal.chapterTitle)
  };
};
