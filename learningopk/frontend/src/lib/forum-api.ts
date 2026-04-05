import { z } from "zod";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const boardSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string()
});

const boardClassSchema = z.object({
  id: z.number().int().positive(),
  boardId: z.number().int().positive(),
  name: z.string(),
  slug: z.string()
});

const subjectSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
  grade: z.string().nullable(),
  className: z.string().nullable(),
  classSlug: z.string().nullable(),
  boardClassId: z.number().int().positive().nullable(),
  boardId: z.number().int().positive()
});

const chapterSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  slug: z.string(),
  chapterNumber: z.number().int().positive(),
  subjectId: z.number().int().positive()
});

const forumFiltersResponseSchema = z.object({
  boards: z.array(boardSchema),
  classes: z.array(boardClassSchema),
  subjects: z.array(subjectSchema),
  chapters: z.array(chapterSchema)
});

const threadSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  userId: z.string(),
  userName: z.string(),
  subjectId: z.number().int().positive().nullable(),
  chapterId: z.number().int().positive().nullable(),
  isPinned: z.boolean(),
  isSolved: z.boolean(),
  views: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  boardSlug: z.string().nullable(),
  boardName: z.string().nullable(),
  grade: z.string().nullable(),
  className: z.string().nullable(),
  subjectName: z.string().nullable(),
  relevance: z.number().optional().default(0),
  replyCount: z.number().int().nonnegative()
});

const forumFeedResponseSchema = z.object({
  threads: z.array(threadSummarySchema)
});

const nestedReplySchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  userId: z.string(),
  userName: z.string(),
  parentReplyId: z.string().uuid(),
  body: z.string(),
  isAcceptedAnswer: z.boolean(),
  upvotes: z.number().int(),
  viewerVoteType: z.enum(["upvote", "downvote"]).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

const topLevelReplySchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  userId: z.string(),
  userName: z.string(),
  parentReplyId: z.null(),
  body: z.string(),
  isAcceptedAnswer: z.boolean(),
  upvotes: z.number().int(),
  viewerVoteType: z.enum(["upvote", "downvote"]).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  replies: z.array(nestedReplySchema)
});

const forumThreadDetailResponseSchema = z.object({
  thread: threadSummarySchema.extend({
    replies: z.array(topLevelReplySchema)
  })
});

export type ForumFiltersResponse = z.infer<typeof forumFiltersResponseSchema>;
export type ForumFeedResponse = z.infer<typeof forumFeedResponseSchema>;
export type ForumThreadDetailResponse = z.infer<typeof forumThreadDetailResponseSchema>;

export type ForumFeedQuery = {
  q?: string;
  board?: string;
  grade?: string;
  subjectId?: number;
  chapterId?: number;
  solved?: "all" | "solved" | "unsolved";
  limit?: number;
  offset?: number;
};

type FetchForumOptions = {
  cookieHeader?: string;
};

const fetchForumJson = async <T>(url: string, schema: z.ZodType<T>, options?: FetchForumOptions): Promise<T> => {
  const headers: Record<string, string> = {};
  if (options?.cookieHeader) {
    headers.cookie = options.cookieHeader;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Forum API request failed: ${response.status}`);
  }

  return schema.parse((await response.json()) as unknown);
};

export const getForumFilters = async (): Promise<ForumFiltersResponse> => {
  return fetchForumJson(`${backendUrl}/api/forum/filters`, forumFiltersResponseSchema);
};

export const getForumThreads = async (query: ForumFeedQuery): Promise<ForumFeedResponse> => {
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
  if (query.subjectId) {
    params.set("subjectId", String(query.subjectId));
  }
  if (query.chapterId) {
    params.set("chapterId", String(query.chapterId));
  }
  if (query.solved) {
    params.set("solved", query.solved);
  }
  if (query.limit) {
    params.set("limit", String(query.limit));
  }
  if (typeof query.offset === "number") {
    params.set("offset", String(query.offset));
  }

  const queryString = params.toString();
  const url = queryString.length > 0 ? `${backendUrl}/api/forum/threads?${queryString}` : `${backendUrl}/api/forum/threads`;
  return fetchForumJson(url, forumFeedResponseSchema);
};

export const getForumThreadById = async (
  threadId: string,
  options?: FetchForumOptions
): Promise<ForumThreadDetailResponse | null> => {
  const headers: Record<string, string> = {};
  if (options?.cookieHeader) {
    headers.cookie = options.cookieHeader;
  }

  const response = await fetch(`${backendUrl}/api/forum/threads/${threadId}`, {
    method: "GET",
    headers,
    cache: "no-store"
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Forum thread request failed: ${response.status}`);
  }

  return forumThreadDetailResponseSchema.parse((await response.json()) as unknown);
};
