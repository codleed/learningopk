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

const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["student", "admin"]),
  status: z.enum(["active", "suspended"]).optional(),
  suspendedAt: z.string().datetime().nullable().optional(),
  suspendedReason: z.string().nullable().optional(),
  suspendedBy: z.string().nullable().optional(),
  createdAt: z.string().datetime()
});

const adminUsersResponseSchema = z.object({
  entries: z.array(adminUserSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasMore: z.boolean()
});

const adminUserRoleUpdateResponseSchema = z.object({
  user: adminUserSchema
});

const adminUserSuspensionUpdateResponseSchema = z.object({
  user: adminUserSchema
});

const adminCommunityThreadSchema = z.object({
  threadId: z.string().uuid(),
  title: z.string(),
  authorName: z.string(),
  createdAt: z.string().datetime(),
  isPinned: z.boolean(),
  isSolved: z.boolean(),
  replyCount: z.number().int().nonnegative(),
  views: z.number().int().nonnegative(),
  openFlagCount: z.number().int().nonnegative()
});

const adminCommunityThreadsResponseSchema = z.object({
  entries: z.array(adminCommunityThreadSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasMore: z.boolean()
});

const adminAnalyticsSubjectPerformanceSchema = z.object({
  subjectId: z.number().int().positive(),
  subjectName: z.string(),
  grade: z.enum(["9", "10"]),
  boardName: z.string(),
  attempts: z.number().int().nonnegative(),
  averageScorePercent: z.number(),
  activeStudents: z.number().int().nonnegative()
});

const adminAnalyticsOverviewSchema = z.object({
  windowDays: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  summary: z.object({
    activeStudents: z.number().int().nonnegative(),
    quizAttempts: z.number().int().nonnegative(),
    averageQuizScorePercent: z.number(),
    threadsCreated: z.number().int().nonnegative(),
    openModerationFlags: z.number().int().nonnegative()
  }),
  subjectPerformance: z.array(adminAnalyticsSubjectPerformanceSchema)
});

const adminNotificationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  audience: z.enum(["all", "students", "admins"]),
  status: z.enum(["sent"]),
  createdBy: z.object({
    id: z.string(),
    name: z.string()
  }),
  createdAt: z.string().datetime()
});

const adminNotificationsResponseSchema = z.object({
  entries: z.array(adminNotificationSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasMore: z.boolean()
});

const adminNotificationCreateResponseSchema = z.object({
  notification: adminNotificationSchema
});

const adminSettingSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string(),
  updatedBy: z
    .object({
      id: z.string(),
      name: z.string()
    })
    .nullable(),
  updatedAt: z.string().datetime()
});

const adminSettingsResponseSchema = z.object({
  entries: z.array(adminSettingSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasMore: z.boolean()
});

const adminSettingUpdateResponseSchema = z.object({
  setting: adminSettingSchema
});

export type AdminChapterResponse = z.infer<typeof adminChapterSchema>;
export type AdminAuditLogResponse = z.infer<typeof adminAuditLogResponseSchema>;
export type AdminAuditLogResponseEntry = z.infer<typeof adminAuditLogEntrySchema>;
export type AdminModerationFlag = z.infer<typeof adminModerationFlagSchema>;
export type AdminModerationFlagsResponse = z.infer<typeof adminModerationFlagsResponseSchema>;
export type AdminModerationResolveResponse = z.infer<typeof adminModerationResolveResponseSchema>;
export type AdminUser = z.infer<typeof adminUserSchema>;
export type AdminUsersResponse = z.infer<typeof adminUsersResponseSchema>;
export type AdminUserRoleUpdateResponse = z.infer<typeof adminUserRoleUpdateResponseSchema>;
export type AdminUserSuspensionUpdateResponse = z.infer<typeof adminUserSuspensionUpdateResponseSchema>;
export type AdminCommunityThread = z.infer<typeof adminCommunityThreadSchema>;
export type AdminCommunityThreadsResponse = z.infer<typeof adminCommunityThreadsResponseSchema>;
export type AdminAnalyticsOverview = z.infer<typeof adminAnalyticsOverviewSchema>;
export type AdminAnalyticsSubjectPerformance = z.infer<typeof adminAnalyticsSubjectPerformanceSchema>;
export type AdminNotification = z.infer<typeof adminNotificationSchema>;
export type AdminNotificationsResponse = z.infer<typeof adminNotificationsResponseSchema>;
export type AdminNotificationCreateResponse = z.infer<typeof adminNotificationCreateResponseSchema>;
export type AdminSetting = z.infer<typeof adminSettingSchema>;
export type AdminSettingsResponse = z.infer<typeof adminSettingsResponseSchema>;
export type AdminSettingUpdateResponse = z.infer<typeof adminSettingUpdateResponseSchema>;

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

export const getAdminUsers = async ({
  page,
  pageSize,
  q,
  role,
  status,
  cookieHeader
}: {
  page: number;
  pageSize: number;
  q: string;
  role?: "" | "student" | "admin";
  status?: "" | "active" | "suspended";
  cookieHeader?: string;
}): Promise<AdminUsersResponse> => {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    q
  });
  if (role) {
    query.set("role", role);
  }
  if (status) {
    query.set("status", status);
  }

  return fetchAdminJson({
    path: `/api/admin/users?${query.toString()}`,
    schema: adminUsersResponseSchema,
    ...(cookieHeader ? { cookieHeader } : {})
  });
};

export const updateAdminUserRole = async ({
  id,
  role
}: {
  id: string;
  role: "student" | "admin";
}): Promise<AdminUserRoleUpdateResponse> => {
  return fetchAdminJson({
    path: `/api/admin/users/${encodeURIComponent(id)}/role`,
    schema: adminUserRoleUpdateResponseSchema,
    method: "POST",
    body: { role }
  });
};

export const updateAdminUserSuspension = async ({
  id,
  action,
  reason
}: {
  id: string;
  action: "suspend" | "reactivate";
  reason?: string;
}): Promise<AdminUserSuspensionUpdateResponse> => {
  return fetchAdminJson({
    path: `/api/admin/users/${encodeURIComponent(id)}/suspension`,
    schema: adminUserSuspensionUpdateResponseSchema,
    method: "POST",
    body: action === "suspend" ? { action, reason } : { action }
  });
};

export const getAdminCommunityThreads = async ({
  page,
  pageSize,
  solved,
  pinned,
  flagState,
  cookieHeader
}: {
  page: number;
  pageSize: number;
  solved: "all" | "solved" | "unsolved";
  pinned: "all" | "pinned" | "unpinned";
  flagState: "all" | "openFlags" | "noOpenFlags";
  cookieHeader?: string;
}): Promise<AdminCommunityThreadsResponse> => {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    solved,
    pinned,
    flagState
  });

  return fetchAdminJson({
    path: `/api/admin/community/threads?${query.toString()}`,
    schema: adminCommunityThreadsResponseSchema,
    ...(cookieHeader ? { cookieHeader } : {})
  });
};

export const getAdminAnalyticsOverview = async ({
  windowDays,
  cookieHeader
}: {
  windowDays: 7 | 30 | 90;
  cookieHeader?: string;
}): Promise<AdminAnalyticsOverview> => {
  const query = new URLSearchParams({
    windowDays: String(windowDays)
  });

  return fetchAdminJson({
    path: `/api/admin/analytics/overview?${query.toString()}`,
    schema: adminAnalyticsOverviewSchema,
    ...(cookieHeader ? { cookieHeader } : {})
  });
};

export const getAdminNotifications = async ({
  page,
  pageSize,
  cookieHeader
}: {
  page: number;
  pageSize: number;
  cookieHeader?: string;
}): Promise<AdminNotificationsResponse> => {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize)
  });

  return fetchAdminJson({
    path: `/api/admin/notifications?${query.toString()}`,
    schema: adminNotificationsResponseSchema,
    ...(cookieHeader ? { cookieHeader } : {})
  });
};

export const createAdminNotification = async ({
  title,
  message,
  audience
}: {
  title: string;
  message: string;
  audience: "all" | "students" | "admins";
}): Promise<AdminNotificationCreateResponse> => {
  return fetchAdminJson({
    path: "/api/admin/notifications",
    schema: adminNotificationCreateResponseSchema,
    method: "POST",
    body: { title, message, audience }
  });
};

export const getAdminSettings = async ({
  page,
  pageSize,
  cookieHeader
}: {
  page: number;
  pageSize: number;
  cookieHeader?: string;
}): Promise<AdminSettingsResponse> => {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize)
  });

  return fetchAdminJson({
    path: `/api/admin/settings?${query.toString()}`,
    schema: adminSettingsResponseSchema,
    ...(cookieHeader ? { cookieHeader } : {})
  });
};

export const updateAdminSetting = async ({
  key,
  value
}: {
  key: string;
  value: string;
}): Promise<AdminSettingUpdateResponse> => {
  return fetchAdminJson({
    path: `/api/admin/settings/${encodeURIComponent(key)}`,
    schema: adminSettingUpdateResponseSchema,
    method: "POST",
    body: { value }
  });
};
