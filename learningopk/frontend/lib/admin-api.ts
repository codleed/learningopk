import { z } from "zod";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const adminChapterSchema = z.object({
  id: z.number().int().positive(),
  chapterNumber: z.number().int().positive(),
  title: z.string(),
  subjectName: z.string(),
  grade: z.enum(["9", "10"]),
  boardName: z.string(),
  isPublished: z.boolean()
});

const adminContentChaptersResponseSchema = z.object({
  chapters: z.array(adminChapterSchema)
});

const adminAuditLogEntrySchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  target: z.string(),
  status: z.enum(["success", "failed"]),
  message: z.string(),
  actor: z.object({
    id: z.string().nullable(),
    name: z.string()
  }),
  occurredAt: z.string().datetime()
});

const adminAuditLogResponseSchema = z.object({
  entries: z.array(adminAuditLogEntrySchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasMore: z.boolean()
});

export type AdminChapterResponse = z.infer<typeof adminChapterSchema>;
export type AdminAuditLogResponse = z.infer<typeof adminAuditLogResponseSchema>;
export type AdminAuditLogResponseEntry = z.infer<typeof adminAuditLogEntrySchema>;

const fetchAdminJson = async <T>({
  path,
  schema,
  cookieHeader
}: {
  path: string;
  schema: z.ZodType<T>;
  cookieHeader?: string;
}): Promise<T> => {
  const response = await fetch(`${backendUrl}${path}`, {
    method: "GET",
    cache: "no-store",
    ...(cookieHeader
      ? {
          headers: {
            cookie: cookieHeader
          }
        }
      : {
          credentials: "include"
        })
  });

  if (!response.ok) {
    throw new Error(`Admin request failed: ${response.status}`);
  }

  return schema.parse((await response.json()) as unknown);
};

export const getAdminContentChapters = async (cookieHeader: string): Promise<AdminChapterResponse[]> => {
  const payload = await fetchAdminJson({
    path: "/api/admin/content/chapters",
    schema: adminContentChaptersResponseSchema,
    cookieHeader
  });

  return payload.chapters;
};

const getAuditLogs = async ({
  scope,
  page,
  pageSize,
  cookieHeader
}: {
  scope: "content" | "forum";
  page: number;
  pageSize: number;
  cookieHeader?: string;
}): Promise<AdminAuditLogResponse> => {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize)
  });

  return fetchAdminJson({
    path: `/api/admin/${scope}/audit-logs?${query.toString()}`,
    schema: adminAuditLogResponseSchema,
    ...(cookieHeader ? { cookieHeader } : {})
  });
};

export const getAdminContentAuditLogs = async ({
  page,
  pageSize,
  cookieHeader
}: {
  page: number;
  pageSize: number;
  cookieHeader?: string;
}): Promise<AdminAuditLogResponse> => {
  return getAuditLogs({
    scope: "content",
    page,
    pageSize,
    ...(cookieHeader ? { cookieHeader } : {})
  });
};

export const getAdminForumAuditLogs = async ({
  page,
  pageSize,
  cookieHeader
}: {
  page: number;
  pageSize: number;
  cookieHeader?: string;
}): Promise<AdminAuditLogResponse> => {
  return getAuditLogs({
    scope: "forum",
    page,
    pageSize,
    ...(cookieHeader ? { cookieHeader } : {})
  });
};
