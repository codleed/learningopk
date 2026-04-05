import { z } from "zod";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const subjectSummarySchema = z.object({
  subjectId: z.number().int().positive(),
  subjectSlug: z.string(),
  subjectName: z.string(),
  grade: z.enum(["9", "10"]),
  boardName: z.string(),
  boardSlug: z.string(),
  chaptersVisitedPercent: z.number().int().min(0).max(100),
  bestQuizScorePercent: z.number().int().min(0).max(100),
  lastActiveAt: z.string().datetime().nullable()
});

const chapterVisitActivitySchema = z.object({
  type: z.literal("chapter_visit"),
  occurredAt: z.string().datetime(),
  subjectSlug: z.string(),
  subjectName: z.string(),
  chapterSlug: z.string(),
  chapterTitle: z.string()
});

const quizSubmitActivitySchema = z.object({
  type: z.literal("quiz_submit"),
  occurredAt: z.string().datetime(),
  subjectSlug: z.string(),
  subjectName: z.string(),
  chapterSlug: z.string(),
  chapterTitle: z.string(),
  score: z.number().int().nonnegative(),
  totalMarks: z.number().int().positive(),
  percentage: z.number().int().min(0).max(100)
});

const dashboardSummarySchema = z.object({
  studentName: z.string(),
  streakDays: z.number().int().nonnegative(),
  longestStreakDays: z.number().int().nonnegative(),
  subjects: z.array(subjectSummarySchema),
  recentActivity: z.array(z.discriminatedUnion("type", [chapterVisitActivitySchema, quizSubmitActivitySchema])),
  starredFormulas: z.array(
    z.object({
      formulaId: z.number().int().positive(),
      name: z.string(),
      formulaLatex: z.string(),
      subjectName: z.string(),
      chapterTitle: z.string(),
      accessCount: z.number().int().nonnegative()
    })
  ),
  quizHistory: z.array(
    z.object({
      occurredAt: z.string().datetime(),
      subjectSlug: z.string(),
      subjectName: z.string(),
      chapterSlug: z.string(),
      chapterTitle: z.string(),
      score: z.number().int().nonnegative(),
      totalMarks: z.number().int().positive(),
      percentage: z.number().int().min(0).max(100)
    })
  ),
  weeklyActivity: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      active: z.boolean(),
      activityCount: z.number().int().nonnegative()
    })
  ),
  dailyActivity: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      count: z.number().int().nonnegative(),
      level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
    })
  ),
  todaysFocus: z
    .object({
      dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      type: z.enum(["weak_quiz", "streak_at_risk", "exam_countdown"]),
      difficulty: z.enum(["easy", "medium", "hard"]),
      title: z.string(),
      reason: z.string(),
      ctaLabel: z.string(),
      href: z.string(),
      xpReward: z.number().int().nonnegative(),
      durationMinutes: z.number().int().positive(),
      isRamadanAdjusted: z.boolean(),
      chapterId: z.number().int().positive().nullable(),
      chapterTitle: z.string().nullable(),
      subjectName: z.string().nullable(),
      completed: z.boolean(),
      completedAt: z.string().datetime().nullable()
    })
    .nullable(),
  xp: z
    .object({
      xp: z.number().int().nonnegative(),
      level: z.number().int().min(0).max(4),
      levelName: z.string(),
      xpToNextLevel: z.number().int().nonnegative()
    })
    .nullable(),
  streakFreeze: z
    .object({
      canUseStreakFreeze: z.boolean(),
      nextFreezeAvailableAt: z.string().datetime().nullable()
    })
    .nullable(),
  todaysGoal: z.object({
    dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    chaptersCompleted: z.number().int().nonnegative(),
    chaptersTarget: z.number().int().positive(),
    quizzesCompleted: z.number().int().nonnegative(),
    quizzesTarget: z.number().int().positive(),
    completed: z.boolean(),
    percent: z.number().int().min(0).max(100)
  }),
  streakWager: z.object({
    timezone: z.literal("Asia/Karachi"),
    minWagerXp: z.number().int().positive(),
    maxWagerXp: z.number().int().positive(),
    currentPktDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    currentPktTime: z.string().datetime(),
    canPlaceWager: z.boolean(),
    showLockModal: z.boolean(),
    warningAtRisk: z.boolean(),
    activeWager: z.object({
      id: z.string(),
      amount: z.number().int().positive(),
      bonusXp: z.number().int().nonnegative(),
      protectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      placedAt: z.string().datetime(),
      expiresAt: z.string().datetime()
    }).nullable(),
    brokenWager: z.object({
      id: z.string(),
      amount: z.number().int().positive(),
      protectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      lostAt: z.string().datetime(),
      canRecoverWithFreeze: z.boolean()
    }).nullable()
  })
});

export type DashboardSummaryResponse = z.infer<typeof dashboardSummarySchema>;

const subjectProgressResponseSchema = z.object({
  subject: z.object({
    id: z.number().int().positive(),
    slug: z.string(),
    name: z.string(),
    grade: z.enum(["9", "10"]),
    boardName: z.string(),
    boardSlug: z.string()
  }),
  overallSubjectScorePercent: z.number().int().min(0).max(100),
  chapters: z.array(
    z.object({
      chapterId: z.number().int().positive(),
      chapterNumber: z.number().int().positive(),
      chapterTitle: z.string(),
      chapterSlug: z.string(),
      visited: z.boolean(),
      exercisesViewed: z.number().int().nonnegative(),
      quizAttempted: z.boolean(),
      bestScorePercent: z.number().int().min(0).max(100),
      status: z.enum(["green", "yellow", "grey"])
    })
  )
});

export type SubjectProgressResponse = z.infer<typeof subjectProgressResponseSchema>;

const todaysFocusCompletionSchema = z.object({
  completedAt: z.string().datetime(),
  xpAwarded: z.number().int().nonnegative(),
  alreadyCompleted: z.boolean(),
  xp: z
    .object({
      xpAwarded: z.number().int().nonnegative(),
      newXp: z.number().int().nonnegative(),
      level: z.number().int().min(0),
      levelName: z.string(),
      leveledUp: z.boolean(),
      previousLevel: z.number().int().min(0)
    })
    .optional()
});

export type TodaysFocusCompletionResponse = z.infer<typeof todaysFocusCompletionSchema>;

export const getDashboardSummary = async (cookieHeader: string): Promise<DashboardSummaryResponse> => {
  const response = await fetch(`${backendUrl}/api/progress/dashboard`, {
    method: "GET",
    cache: "no-store",
    headers: {
      cookie: cookieHeader
    }
  });

  if (!response.ok) {
    throw new Error(`Progress dashboard request failed: ${response.status}`);
  }

  return dashboardSummarySchema.parse((await response.json()) as unknown);
};

export const getSubjectProgress = async (boardSlug: string, grade: "9" | "10", subjectSlug: string, cookieHeader: string): Promise<SubjectProgressResponse | null> => {
  const response = await fetch(`${backendUrl}/api/progress/dashboard/${boardSlug}/${grade}/${subjectSlug}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      cookie: cookieHeader
    }
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Subject progress request failed: ${response.status}`);
  }

  return subjectProgressResponseSchema.parse((await response.json()) as unknown);
};

export const completeTodaysFocus = async (): Promise<TodaysFocusCompletionResponse> => {
  const response = await fetch(`${backendUrl}/api/progress/todays-focus/complete`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    throw new Error(`Today's focus completion request failed: ${response.status}`);
  }

  return todaysFocusCompletionSchema.parse((await response.json()) as unknown);
};

export const placeStreakWager = async (amount: number): Promise<void> => {
  const response = await fetch(`${backendUrl}/api/progress/streak-wager`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ amount })
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Streak wager request failed: ${response.status}`);
  }
};

export const recoverStreakWager = async (): Promise<void> => {
  const response = await fetch(`${backendUrl}/api/progress/streak-wager/recover`, {
    method: "POST",
    credentials: "include"
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Streak wager recovery failed: ${response.status}`);
  }
};
