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

const adminModerationFlagSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  targetType: z.enum(["thread", "reply", "chapter"]),
  targetId: z.string(),
  targetLabel: z.string(),
  reason: z.string(),
  status: z.enum(["open", "resolved"]),
  resolvedBy: z.string().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  resolutionNote: z.string().nullable()
});

const adminModerationFlagsResponseSchema = z.object({
  entries: z.array(adminModerationFlagSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasMore: z.boolean()
});

const adminModerationResolveResponseSchema = z.object({
  flag: adminModerationFlagSchema
});

export type AdminChapterResponse = z.infer<typeof adminChapterSchema>;
export type AdminAuditLogResponse = z.infer<typeof adminAuditLogResponseSchema>;
export type AdminAuditLogResponseEntry = z.infer<typeof adminAuditLogEntrySchema>;
export type AdminModerationFlag = z.infer<typeof adminModerationFlagSchema>;
export type AdminModerationFlagsResponse = z.infer<typeof adminModerationFlagsResponseSchema>;
export type AdminModerationResolveResponse = z.infer<typeof adminModerationResolveResponseSchema>;

const fetchAdminJson = async <T>({
  path,
  schema,
  cookieHeader,
  method = "GET",
  body
}: {
  path: string;
  schema: z.ZodType<T>;
  cookieHeader?: string;
  method?: "GET" | "POST";
  body?: unknown;
}): Promise<T> => {
  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }
  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  const response = await fetch(`${backendUrl}${path}`, {
    method,
    cache: "no-store",
    ...(!cookieHeader ? { credentials: "include" } : {}),
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
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

export const getAdminModerationFlags = async ({
  page,
  pageSize,
  status,
  targetType,
  cookieHeader
}: {
  page: number;
  pageSize: number;
  status: "open" | "resolved";
  targetType?: "thread" | "reply" | "chapter";
  cookieHeader?: string;
}): Promise<AdminModerationFlagsResponse> => {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    status
  });
  if (targetType) {
    query.set("targetType", targetType);
  }

  return fetchAdminJson({
    path: `/api/admin/moderation/flags?${query.toString()}`,
    schema: adminModerationFlagsResponseSchema,
    ...(cookieHeader ? { cookieHeader } : {})
  });
};

export const resolveAdminModerationFlag = async ({
  id,
  note
}: {
  id: string;
  note: string;
}): Promise<AdminModerationResolveResponse> => {
  return fetchAdminJson({
    path: `/api/admin/moderation/flags/${id}/resolve`,
    schema: adminModerationResolveResponseSchema,
    method: "POST",
    body: { note }
  });
};
