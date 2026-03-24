import { z } from "zod";

export const submitQuizSchema = z.object({
  quizId: z.number().int().positive(),
  answers: z.record(z.string().regex(/^\d+$/), z.enum(["a", "b", "c", "d"])),
  startedAt: z.string().datetime().optional()
});

export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;
