import type { DashboardSummaryResponse } from "@/lib/progress-api";

type DailyActivityEntry = DashboardSummaryResponse["dailyActivity"][number];
type SubjectEntry = DashboardSummaryResponse["subjects"][number];
type QuizHistoryEntry = DashboardSummaryResponse["quizHistory"][number];

export type WeeklyStudyTrendPoint = {
  label: string;
  estimatedHours: number;
  activityCount: number;
};

export type QuizAccuracyPoint = {
  label: string;
  percentage: number;
  movingAverage: number;
};

export type WeakSubjectPoint = {
  subjectId: number;
  subjectSlug: string;
  subjectName: string;
  chaptersVisitedPercent: number;
  bestQuizScorePercent: number;
  healthScore: number;
};

export type GoalProgress = {
  label: string;
  valueLabel: string;
  progressPercent: number;
};

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toUtcDateFromKey = (dateKey: string): Date => {
  if (!DATE_KEY_PATTERN.test(dateKey)) {
    return new Date("1970-01-01T00:00:00.000Z");
  }
  return new Date(`${dateKey}T00:00:00.000Z`);
};

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const shiftUtcDays = (date: Date, days: number): Date => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
};

export const countActiveDaysThisMonth = (dailyActivity: DailyActivityEntry[], referenceDate: Date = new Date()): number => {
  const month = referenceDate.getUTCMonth();
  const year = referenceDate.getUTCFullYear();

  return dailyActivity.filter((entry) => {
    if (entry.count <= 0) {
      return false;
    }
    const day = toUtcDateFromKey(entry.date);
    return day.getUTCFullYear() === year && day.getUTCMonth() === month;
  }).length;
};

export const buildWeeklyStudyTrend = (
  dailyActivity: DailyActivityEntry[],
  options: { weeks?: number; minutesPerActivity?: number; referenceDate?: Date } = {}
): WeeklyStudyTrendPoint[] => {
  const weeks = options.weeks ?? 8;
  const minutesPerActivity = options.minutesPerActivity ?? 25;
  const referenceDate = options.referenceDate ?? new Date();
  const todayUtc = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));

  const countsByDate = new Map(dailyActivity.map((entry) => [entry.date, entry.count]));

  return Array.from({ length: weeks }, (_value, index) => {
    const daysFromEnd = (weeks - 1 - index) * 7;
    const weekEnd = shiftUtcDays(todayUtc, -daysFromEnd);
    const weekStart = shiftUtcDays(weekEnd, -6);

    let activityCount = 0;
    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const currentDay = shiftUtcDays(weekStart, dayOffset);
      activityCount += countsByDate.get(toDateKey(currentDay)) ?? 0;
    }

    const estimatedHours = Math.round(((activityCount * minutesPerActivity) / 60) * 10) / 10;
    const startLabel = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    const endLabel = weekEnd.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });

    return {
      label: `${startLabel}-${endLabel}`,
      estimatedHours,
      activityCount
    };
  });
};

export const buildQuizAccuracyTrend = (
  quizHistory: QuizHistoryEntry[],
  options: { maxPoints?: number; movingWindow?: number } = {}
): QuizAccuracyPoint[] => {
  const maxPoints = options.maxPoints ?? 12;
  const movingWindow = options.movingWindow ?? 5;

  const ordered = [...quizHistory]
    .sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime())
    .slice(-maxPoints);

  return ordered.map((entry, index) => {
    const start = Math.max(0, index - movingWindow + 1);
    const window = ordered.slice(start, index + 1);
    const movingAverage = Math.round(window.reduce((total, item) => total + item.percentage, 0) / window.length);

    return {
      label: new Date(entry.occurredAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      }),
      percentage: entry.percentage,
      movingAverage
    };
  });
};

export const getWeakSubjects = (subjects: SubjectEntry[], limit = 3): WeakSubjectPoint[] => {
  return [...subjects]
    .map((subject) => ({
      subjectId: subject.subjectId,
      subjectSlug: subject.subjectSlug,
      subjectName: subject.subjectName,
      chaptersVisitedPercent: subject.chaptersVisitedPercent,
      bestQuizScorePercent: subject.bestQuizScorePercent,
      healthScore: Math.round((subject.chaptersVisitedPercent + subject.bestQuizScorePercent) / 2)
    }))
    .sort((left, right) => left.healthScore - right.healthScore || left.subjectName.localeCompare(right.subjectName))
    .slice(0, limit);
};

export const buildGoalProgress = (summary: DashboardSummaryResponse): GoalProgress[] => {
  const weeklyRangeStart = summary.weeklyActivity[0]?.date ?? toDateKey(shiftUtcDays(new Date(), -6));
  const weeklyRangeEnd = summary.weeklyActivity[summary.weeklyActivity.length - 1]?.date ?? toDateKey(new Date());
  const weeklyStartDate = toUtcDateFromKey(weeklyRangeStart).getTime();
  const weeklyEndDate = toUtcDateFromKey(weeklyRangeEnd).getTime();

  const activeDays = summary.weeklyActivity.filter((entry) => entry.active).length;
  const weeklyQuizAttempts = summary.quizHistory.filter((entry) => {
    const time = toUtcDateFromKey(entry.occurredAt.slice(0, 10)).getTime();
    return time >= weeklyStartDate && time <= weeklyEndDate;
  }).length;
  const strongSubjects = summary.subjects.filter((subject) => subject.bestQuizScorePercent >= 70).length;

  const goals: Array<{ label: string; current: number; target: number }> = [
    { label: "Active study days this week", current: activeDays, target: 5 },
    { label: "Quiz attempts this week", current: weeklyQuizAttempts, target: 3 },
    { label: "Subjects scoring 70%+", current: strongSubjects, target: 2 }
  ];

  return goals.map((goal) => ({
    label: goal.label,
    valueLabel: `${goal.current}/${goal.target}`,
    progressPercent: Math.min(100, Math.round((goal.current / goal.target) * 100))
  }));
};
