import { z } from "zod";

export const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]+$/);

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const paginationWithQuerySchema = paginationSchema.extend({
  q: z.string().trim().min(1).max(160).optional(),
});

export type Pagination = z.infer<typeof paginationSchema>;
export type PaginationWithQuery = z.infer<typeof paginationWithQuerySchema>;
