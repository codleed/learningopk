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
    .nullable()
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
