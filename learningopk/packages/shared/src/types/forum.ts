import { z } from "zod";

export const createThreadSchema = z.object({
  title: z.string().trim().min(5).max(160),
  body: z.string().trim().min(10).max(50000),
  subjectId: z.number().int().positive().optional(),
  chapterId: z.number().int().positive().optional(),
});

export const replySchema = z.object({
  body: z.string().trim().min(2),
  parentReplyId: z.string().uuid().optional(),
});

export const replyVoteSchema = z.object({
  voteType: z.enum(["upvote", "downvote"]),
});

export const threadFeedQuerySchema = z.object({
  board: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  grade: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  subjectId: z.coerce.number().int().positive().optional(),
  chapterId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().min(1).max(160).optional(),
  solved: z.enum(["all", "solved", "unsolved"]).optional().default("all"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type ReplyInput = z.infer<typeof replySchema>;
export type ReplyVoteInput = z.infer<typeof replyVoteSchema>;
export type ThreadFeedQuery = z.infer<typeof threadFeedQuerySchema>;
