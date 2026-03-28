import { z } from "zod";

/**
 * Build a forum href with the given query parameters.
 * Preserves search query across filter changes.
 */
export function buildForumHref(query: {
  q?: string;
  board?: string;
  grade?: string;
  subjectId?: number | null;
  chapterId?: number | null;
  solved?: "all" | "solved" | "unsolved";
  compose?: "1";
}): string {
  const params = new URLSearchParams();
  if (query.q) {
    params.set("q", query.q);
  }
  if (query.board) {
    params.set("board", query.board);
  }
  if (query.grade) {
    params.set("grade", query.grade);
  }
  if (query.subjectId != null) {
    params.set("subjectId", String(query.subjectId));
  }
  if (query.chapterId != null) {
    params.set("chapterId", String(query.chapterId));
  }
  if (query.solved && query.solved !== "all") {
    params.set("solved", query.solved);
  }
  if (query.compose) {
    params.set("compose", query.compose);
  }

  const queryString = params.toString();
  return queryString.length > 0 ? `/forum?${queryString}` : "/forum";
}

/**
 * Schema for validating forum search parameters.
 */
export const forumSearchParamsSchema = z.object({
  q: z.string().trim().min(1).max(160).optional(),
  board: z.string().trim().regex(/^[a-z0-9-]+$/).optional(),
  grade: z.string().trim().regex(/^[a-z0-9-]+$/).optional(),
  subjectId: z.string().regex(/^\d+$/).optional(),
  chapterId: z.string().regex(/^\d+$/).optional(),
  solved: z.enum(["all", "solved", "unsolved"]).optional().default("all"),
  compose: z.enum(["1"]).optional()
});

export type ForumSearchParams = z.infer<typeof forumSearchParamsSchema>;
