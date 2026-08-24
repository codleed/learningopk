import { z } from "zod";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const listSchema = z.object({
  groups: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      createdAt: z.string().datetime(),
      memberCount: z.number().int().nonnegative(),
      notificationCount: z.number().int().nonnegative(),
    })
  ),
});
const detailSchema = z.object({
  group: z.object({
    id: z.string().uuid(),
    name: z.string(),
    createdAt: z.string().datetime(),
    memberCount: z.number().int().positive(),
  }),
  members: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      email: z.string().email(),
      joinedAt: z.string().datetime(),
      chapterCompletionPercent: z.number().int().min(0).max(100),
      bestQuizScorePercent: z.number().int().min(0).max(100),
      streakDays: z.number().int().nonnegative(),
    })
  ),
  activityFeed: z.array(
    z.object({
      id: z.string().uuid(),
      eventType: z.enum(["chapter_completed", "quiz_score_beaten"]),
      createdAt: z.string().datetime(),
      message: z.string(),
    })
  ),
  notifications: z.array(
    z.object({
      id: z.string().uuid(),
      eventType: z.enum(["chapter_completed", "quiz_score_beaten"]),
      createdAt: z.string().datetime(),
      message: z.string(),
    })
  ),
});
const createSchema = z.object({
  group: z.object({
    id: z.string().uuid(),
    name: z.string(),
    memberCount: z.number().int().positive(),
    createdAt: z.string().datetime(),
  }),
});

export type StudyGroupsListResponse = z.infer<typeof listSchema>;
export type StudyGroupDetailResponse = z.infer<typeof detailSchema>;

export const getStudyGroups = async (cookieHeader: string) => {
  const response = await fetch(`${backendUrl}/api/study-groups`, {
    method: "GET",
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });
  if (!response.ok) throw new Error(`Study groups request failed: ${response.status}`);
  return listSchema.parse((await response.json()) as unknown);
};

export const getStudyGroupDetail = async (groupId: string, cookieHeader: string) => {
  const response = await fetch(`${backendUrl}/api/study-groups/${groupId}`, {
    method: "GET",
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Study group detail request failed: ${response.status}`);
  return detailSchema.parse((await response.json()) as unknown);
};

export const createStudyGroup = async (input: { name: string; invites: string[] }) => {
  const response = await fetch(`${backendUrl}/api/study-groups`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Study group create request failed: ${response.status}`);
  }
  return createSchema.parse((await response.json()) as unknown);
};
