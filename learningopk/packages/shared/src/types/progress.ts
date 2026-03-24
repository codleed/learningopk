import { z } from "zod";

export const progressEventSchema = z.discriminatedUnion("eventType", [
  z.object({
    eventType: z.literal("chapter_visit"),
    chapterId: z.number().int().positive()
  }),
  z.object({
    eventType: z.literal("exercise_view"),
    chapterId: z.number().int().positive()
  }),
  z.object({
    eventType: z.literal("flashcard_complete"),
    chapterId: z.number().int().positive()
  }),
  z.object({
    eventType: z.literal("quiz_submit"),
    chapterId: z.number().int().positive(),
    score: z.number().int().nonnegative()
  })
]);

export type ProgressEvent = z.infer<typeof progressEventSchema>;

export const subjectParamSchema = z.object({
  subject: z.string().trim().regex(/^[a-z0-9-]+$/)
});

export type SubjectParam = z.infer<typeof subjectParamSchema>;
