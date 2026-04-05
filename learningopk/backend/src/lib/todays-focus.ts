import { PKT_TIMEZONE, getCurrentPktContext, getPktHour } from "./streak-wager.js";

export type FocusDifficulty = "easy" | "medium" | "hard";
export type TodaysFocusType = "weak_quiz" | "streak_at_risk" | "exam_countdown";

export type RamadanConfig = {
  enabled: boolean;
  fastingStartHour: number;
  fastingEndHour: number;
};

export type FocusChapterCandidate = {
  chapterId: number;
  chapterNumber: number;
  chapterSlug: string;
  chapterTitle: string;
  subjectId: number;
  subjectName: string;
  subjectSlug: string;
  boardSlug: string;
  grade: "9" | "10";
  visited: boolean;
  quizAttemptsCount: number;
  bestQuizScorePercent: number;
  examDate: string | null;
};

export type TodaysFocus = {
  dateKey: string;
  type: TodaysFocusType;
  difficulty: FocusDifficulty;
  title: string;
  reason: string;
  ctaLabel: string;
  href: string;
  xpReward: number;
  durationMinutes: number;
  isRamadanAdjusted: boolean;
  chapterId: number | null;
  chapterTitle: string | null;
  subjectName: string | null;
};

export type TodaysFocusCompletion = {
  completedAt: string;
  xpAwarded: number;
};

type BuildTodaysFocusInput = {
  now?: Date;
  streakDays: number;
  hasActivityToday: boolean;
  ramadanConfig: RamadanConfig;
  chapters: FocusChapterCandidate[];
};

const XP_BY_DIFFICULTY: Record<FocusDifficulty, number> = {
  easy: 5,
  medium: 10,
  hard: 15
};

const DEFAULT_DURATION_BY_DIFFICULTY: Record<FocusDifficulty, number> = {
  easy: 5,
  medium: 8,
  hard: 12
};

const RAMADAN_DURATION_BY_DIFFICULTY: Record<FocusDifficulty, number> = {
  easy: 3,
  medium: 4,
  hard: 5
};

const truthyValues = new Set(["1", "true", "yes", "on", "enabled"]);

const parseHour = (value: string): number | null => {
  const trimmed = value.trim();
  if (/^\d{1,2}$/.test(trimmed)) {
    const hour = Number(trimmed);
    return hour >= 0 && hour <= 23 ? hour : null;
  }

  const timeMatch = /^(\d{1,2}):\d{2}$/.exec(trimmed);
  if (!timeMatch) {
    return null;
  }

  const hour = Number(timeMatch[1]);
  return hour >= 0 && hour <= 23 ? hour : null;
};

const getExamTime = (examDate: string | null): number => {
  if (!examDate) {
    return Number.POSITIVE_INFINITY;
  }

  const time = new Date(examDate).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

const sortByExamAndChapter = (left: FocusChapterCandidate, right: FocusChapterCandidate): number => {
  return getExamTime(left.examDate) - getExamTime(right.examDate) || left.chapterNumber - right.chapterNumber;
};

const buildHref = (chapter: FocusChapterCandidate, tab: "summary" | "quiz"): string =>
  `/${chapter.boardSlug}/${chapter.grade}/${chapter.subjectSlug}/${chapter.chapterSlug}?tab=${tab}`;

const buildDuration = (difficulty: FocusDifficulty, isRamadanAdjusted: boolean): number =>
  isRamadanAdjusted ? RAMADAN_DURATION_BY_DIFFICULTY[difficulty] : DEFAULT_DURATION_BY_DIFFICULTY[difficulty];

const isWithinFastingHours = (now: Date, config: RamadanConfig): boolean => {
  const pktHour = getPktHour(now);
  return config.enabled && pktHour >= config.fastingStartHour && pktHour < config.fastingEndHour;
};

export const isRamadanByHeuristic = (now: Date): boolean => {
  try {
    const islamicMonth = new Intl.DateTimeFormat("en-u-ca-islamic", {
      month: "long",
      timeZone: PKT_TIMEZONE
    }).format(now);

    return /ramad/i.test(islamicMonth);
  } catch {
    return false;
  }
};

export const resolveRamadanConfig = (input: {
  now?: Date;
  settings?: Array<{ key: string; value: string }>;
}): RamadanConfig => {
  const now = input.now ?? new Date();
  const settingsMap = new Map((input.settings ?? []).map((entry) => [entry.key, entry.value]));
  const configuredMode = settingsMap.get("ramadan_mode");
  const configuredHours = settingsMap.get("ramadan_fasting_hours");

  let fastingStartHour = 4;
  let fastingEndHour = 18;

  if (configuredHours) {
    const normalized = configuredHours.trim();
    const rangeMatch = /^(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?)$/.exec(normalized);
    if (rangeMatch) {
      const startValue = rangeMatch[1];
      const endValue = rangeMatch[2];
      const startHour = startValue ? parseHour(startValue) : null;
      const endHour = endValue ? parseHour(endValue) : null;
      if (startHour !== null && endHour !== null) {
        fastingStartHour = startHour;
        fastingEndHour = endHour;
      }
    } else {
      try {
        const parsed = JSON.parse(normalized) as { startHour?: unknown; endHour?: unknown };
        const startHour = typeof parsed.startHour === "number" ? parsed.startHour : null;
        const endHour = typeof parsed.endHour === "number" ? parsed.endHour : null;
        if (startHour !== null && endHour !== null) {
          fastingStartHour = startHour;
          fastingEndHour = endHour;
        }
      } catch {
        // Fallback to defaults when setting format is not recognized.
      }
    }
  }

  if (configuredMode !== undefined) {
    return {
      enabled: truthyValues.has(configuredMode.trim().toLowerCase()),
      fastingStartHour,
      fastingEndHour,
    };
  }

  return {
    enabled: isRamadanByHeuristic(now),
    fastingStartHour,
    fastingEndHour,
  };
};

export const attachCompletionState = (
  focus: TodaysFocus | null,
  completion: TodaysFocusCompletion | null
): (TodaysFocus & { completed: boolean; completedAt: string | null }) | null => {
  if (!focus) {
    return null;
  }

  return {
    ...focus,
    completed: completion !== null,
    completedAt: completion?.completedAt ?? null,
  };
};

export const buildTodaysFocus = (input: BuildTodaysFocusInput): TodaysFocus | null => {
  const now = input.now ?? new Date();
  const { todayKey } = getCurrentPktContext(now);
  const isRamadanAdjusted = isWithinFastingHours(now, input.ramadanConfig);

  const weakQuizChapter = [...input.chapters]
    .filter((chapter) => chapter.quizAttemptsCount > 0 && chapter.bestQuizScorePercent < 50)
    .sort((left, right) => left.bestQuizScorePercent - right.bestQuizScorePercent || sortByExamAndChapter(left, right))[0];

  if (weakQuizChapter) {
    const difficulty: FocusDifficulty = "hard";
    return {
      dateKey: todayKey,
      type: "weak_quiz",
      difficulty,
      title: `Retake ${weakQuizChapter.chapterTitle}`,
      reason: `${weakQuizChapter.subjectName} quiz score is still under 50%. A quick retry will shore up the weakest gap first.`,
      ctaLabel: "Quick Start",
      href: buildHref(weakQuizChapter, "quiz"),
      xpReward: XP_BY_DIFFICULTY[difficulty],
      durationMinutes: buildDuration(difficulty, isRamadanAdjusted),
      isRamadanAdjusted,
      chapterId: weakQuizChapter.chapterId,
      chapterTitle: weakQuizChapter.chapterTitle,
      subjectName: weakQuizChapter.subjectName,
    };
  }

  const unvisitedByExam = [...input.chapters]
    .filter((chapter) => !chapter.visited)
    .sort(sortByExamAndChapter);

  if (!input.hasActivityToday) {
    const streakChapter = unvisitedByExam[0] ?? [...input.chapters].sort(sortByExamAndChapter)[0];
    if (streakChapter) {
      const difficulty: FocusDifficulty = "easy";
      return {
        dateKey: todayKey,
        type: "streak_at_risk",
        difficulty,
        title: `Keep your streak alive with ${streakChapter.chapterTitle}`,
        reason: input.streakDays > 0
          ? `You have ${input.streakDays} day${input.streakDays === 1 ? "" : "s"} of momentum on the line. Open one bite-sized chapter touchpoint now.`
          : "Start today with a small win so momentum never has to restart tomorrow.",
        ctaLabel: "Quick Start",
        href: buildHref(streakChapter, "summary"),
        xpReward: XP_BY_DIFFICULTY[difficulty],
        durationMinutes: buildDuration(difficulty, isRamadanAdjusted),
        isRamadanAdjusted,
        chapterId: streakChapter.chapterId,
        chapterTitle: streakChapter.chapterTitle,
        subjectName: streakChapter.subjectName,
      };
    }
  }

  const examChapter = unvisitedByExam[0];
  if (examChapter) {
    const difficulty: FocusDifficulty = "medium";
    return {
      dateKey: todayKey,
      type: "exam_countdown",
      difficulty,
      title: `Preview ${examChapter.chapterTitle}`,
      reason: `This unvisited ${examChapter.subjectName} chapter is the closest upcoming exam target, so starting here keeps revision order aligned with the calendar.`,
      ctaLabel: "Quick Start",
      href: buildHref(examChapter, "summary"),
      xpReward: XP_BY_DIFFICULTY[difficulty],
      durationMinutes: buildDuration(difficulty, isRamadanAdjusted),
      isRamadanAdjusted,
      chapterId: examChapter.chapterId,
      chapterTitle: examChapter.chapterTitle,
      subjectName: examChapter.subjectName,
    };
  }

  return null;
};
