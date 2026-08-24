import { z } from "zod";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const recommendedChapterSchema = z.object({
  chapterId: z.number().int().positive(),
  priority: z.number().int().positive(),
  reason: z.string(),
  estimatedTime: z.string(),
});

const learningPathDataSchema = z.object({
  recommendedChapters: z.array(recommendedChapterSchema),
});

const learningPathResponseSchema = z.object({
  data: learningPathDataSchema,
});

export type LearningPathRecommendation = z.infer<typeof recommendedChapterSchema>;
export type LearningPathResponse = z.infer<typeof learningPathDataSchema>;

export async function getLearningPath(cookieHeader?: string): Promise<LearningPathResponse> {
  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  const response = await fetch(`${backendUrl}/api/ai/learning-path`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch learning path: ${response.status}`);
  }

  const json = learningPathResponseSchema.parse((await response.json()) as unknown);
  return json.data;
}
