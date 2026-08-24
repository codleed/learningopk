import { z } from "zod";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export const leaderboardScopeSchema = z.enum(["global", "board", "school"]);
export const leaderboardMetricSchema = z.enum(["xp", "streak", "quizzes"]);

const leaderboardBadgeSchema = z.enum(["gold", "silver", "bronze"]);

const leaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  userId: z.string(),
  avatarUrl: z.string().url().nullable(),
  name: z.string(),
  xp: z.number().int().nonnegative(),
  level: z.number().int().nonnegative(),
  streak: z.number().int().nonnegative(),
  quizzes: z.number().int().nonnegative(),
  weeklyChange: z.number().int(),
  badge: leaderboardBadgeSchema.nullable(),
  isCurrentUser: z.boolean(),
});

const leaderboardResponseSchema = z.object({
  scope: leaderboardScopeSchema,
  metric: leaderboardMetricSchema,
  generatedAt: z.string().datetime(),
  refreshIntervalSeconds: z.number().int().positive(),
  entries: z.array(leaderboardEntrySchema),
  currentUser: z.object({
    rank: z.number().int().positive(),
    totalStudents: z.number().int().positive(),
    leaderboardPublic: z.boolean(),
    badge: leaderboardBadgeSchema.nullable(),
  }),
});

const leaderboardSettingsSchema = z.object({
  leaderboardPublic: z.boolean(),
  badge: leaderboardBadgeSchema.nullable(),
});

export type LeaderboardScope = z.infer<typeof leaderboardScopeSchema>;
export type LeaderboardMetric = z.infer<typeof leaderboardMetricSchema>;
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>;
export type LeaderboardSettings = z.infer<typeof leaderboardSettingsSchema>;

export const getLeaderboard = async (
  scope: LeaderboardScope,
  metric: LeaderboardMetric,
  cookieHeader: string
): Promise<LeaderboardResponse> => {
  const response = await fetch(`${backendUrl}/api/leaderboard?scope=${scope}&metric=${metric}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      cookie: cookieHeader,
    },
  });

  if (!response.ok) {
    throw new Error(`Leaderboard request failed: ${response.status}`);
  }

  return leaderboardResponseSchema.parse((await response.json()) as unknown);
};

export const getLeaderboardSettings = async (
  cookieHeader: string
): Promise<LeaderboardSettings> => {
  const response = await fetch(`${backendUrl}/api/users/me/leaderboard-settings`, {
    method: "GET",
    cache: "no-store",
    headers: {
      cookie: cookieHeader,
    },
  });

  if (!response.ok) {
    throw new Error(`Leaderboard settings request failed: ${response.status}`);
  }

  return leaderboardSettingsSchema.parse((await response.json()) as unknown);
};

export const updateLeaderboardSettings = async (
  isPublic: boolean
): Promise<LeaderboardSettings> => {
  const response = await fetch(`${backendUrl}/api/users/me/leaderboard-settings`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ public: isPublic }),
  });

  if (!response.ok) {
    let message = "Failed to update leaderboard settings.";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Keep default message.
    }
    throw new Error(message);
  }

  return leaderboardSettingsSchema.parse((await response.json()) as unknown);
};
