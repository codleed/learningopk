import { z } from "zod";

export const boardGradeSubjectParamsSchema = z.object({
  board: z.string().trim().regex(/^[a-z0-9-]+$/),
  grade: z.string().trim().regex(/^[a-z0-9-]+$/),
  subject: z.string().trim().regex(/^[a-z0-9-]+$/)
});

export const boardGradeSubjectChapterParamsSchema = boardGradeSubjectParamsSchema.extend({
  chapter: z.string().trim().regex(/^[a-z0-9-]+$/)
});

export const uuidParamsSchema = z.object({
  threadId: z.string().uuid()
});

export const replyIdParamsSchema = z.object({
  replyId: z.string().uuid()
});

export type BoardGradeSubjectParams = z.infer<typeof boardGradeSubjectParamsSchema>;
export type BoardGradeSubjectChapterParams = z.infer<typeof boardGradeSubjectChapterParamsSchema>;
export type UuidParams = z.infer<typeof uuidParamsSchema>;
export type ReplyIdParams = z.infer<typeof replyIdParamsSchema>;
