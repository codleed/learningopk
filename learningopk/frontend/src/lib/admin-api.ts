import { z } from "zod";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const adminCurriculumChapterSchema = z.object({
  id: z.number().int().positive(),
  chapterNumber: z.number().int().positive(),
  title: z.string(),
  slug: z.string(),
  isPublished: z.boolean()
});

const adminCurriculumSubjectSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
  icon: z.string().nullable(),
  description: z.string().nullable(),
  chapters: z.array(adminCurriculumChapterSchema)
});

const adminCurriculumClassSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
  subjects: z.array(adminCurriculumSubjectSchema)
});

const adminCurriculumBoardSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
  classes: z.array(adminCurriculumClassSchema)
});

const adminCurriculumResponseSchema = z.object({
  boards: z.array(adminCurriculumBoardSchema)
});

const adminCurriculumBoardCreateResponseSchema = z.object({
  board: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    slug: z.string()
  })
});

const adminCurriculumBoardMutationResponseSchema = z.object({
  board: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    slug: z.string()
  }),
  timestamp: z.string().datetime()
});

const adminCurriculumClassCreateResponseSchema = z.object({
  class: z.object({
    id: z.number().int().positive(),
    boardId: z.number().int().positive(),
    name: z.string(),
    slug: z.string()
  })
});

const adminCurriculumClassMutationResponseSchema = z.object({
  class: z.object({
    id: z.number().int().positive(),
    boardId: z.number().int().positive(),
    name: z.string(),
    slug: z.string()
  }),
  timestamp: z.string().datetime()
});

const adminCurriculumSubjectCreateResponseSchema = z.object({
  subject: z.object({
    id: z.number().int().positive(),
    boardClassId: z.number().int().positive().nullable(),
    name: z.string(),
    slug: z.string(),
    icon: z.string().nullable(),
    description: z.string().nullable()
  })
});

const adminCurriculumSubjectMutationResponseSchema = z.object({
  subject: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    slug: z.string()
  }),
  timestamp: z.string().datetime()
});

const adminCurriculumChapterCreateResponseSchema = z.object({
  chapter: z.object({
    id: z.number().int().positive(),
    subjectId: z.number().int().positive(),
    chapterNumber: z.number().int().positive(),
    title: z.string(),
    slug: z.string(),
    isPublished: z.boolean()
  })
});

const adminCurriculumChapterMutationResponseSchema = z.object({
  chapter: z.object({
    id: z.number().int().positive(),
    subjectId: z.number().int().positive(),
    chapterNumber: z.number().int().positive(),
    title: z.string(),
    slug: z.string(),
    isPublished: z.boolean()
  }),
  timestamp: z.string().datetime()
});

const adminChapterSummaryResponseSchema = z.object({
  chapter: z.object({
    id: z.number().int().positive(),
    title: z.string(),
    summary: z.string()
  })
});

const adminChapterSummaryUpdateResponseSchema = z.object({
  chapter: z.object({
    id: z.number().int().positive(),
    title: z.string(),
    summary: z.string()
  }),
  timestamp: z.string().datetime()
});

const adminChapterLinksResponseSchema = z.object({
  links: z.object({
    outgoing: z.array(
      z.object({
        sourceChapterId: z.number().int().positive(),
        targetChapterId: z.number().int().positive().nullable(),
        targetTitle: z.string(),
        normalizedTarget: z.string(),
        isResolved: z.boolean(),
        targetChapterTitle: z.string().nullable()
      })
    ),
    backlinks: z.array(
      z.object({
        sourceChapterId: z.number().int().positive(),
        sourceChapterTitle: z.string(),
        normalizedTarget: z.string()
      })
    )
  })
});

const adminChapterLinkSuggestionsResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      id: z.number().int().positive(),
      title: z.string(),
      slug: z.string(),
      chapterNumber: z.number().int().positive()
    })
  )
});

const adminChapterGraphResponseSchema = z.object({
  graph: z.object({
    nodes: z.array(
      z.object({
        id: z.number().int().positive(),
        title: z.string(),
        isPublished: z.boolean()
      })
    ),
    edges: z.array(
      z.object({
        sourceChapterId: z.number().int().positive(),
        targetChapterId: z.number().int().positive().nullable(),
        isResolved: z.boolean()
      })
    ),
    unresolvedEdgeCount: z.number().int().nonnegative()
  })
});

const adminChapterSummaryMediaUploadResponseSchema = z.object({
  asset: z.object({
    id: z.string().uuid(),
    chapterId: z.number().int().positive(),
    objectUrl: z.string().url(),
    mimeType: z.string(),
    fileSize: z.number().int().positive(),
    createdAt: z.string().datetime()
  }),
  markdown: z.string().min(1)
});

const adminCurriculumExerciseCreateResponseSchema = z.object({
  exercise: z.object({
    id: z.number().int().positive(),
    chapterId: z.number().int().positive(),
    exerciseNumber: z.string(),
    question: z.string(),
    solution: z.string(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    type: z.enum(["mcq", "short", "long", "numerical"])
  })
});

const adminCurriculumExerciseReadSchema = z.object({
  id: z.number().int().positive(),
  chapterId: z.number().int().positive(),
  chapterTitle: z.string(),
  subjectName: z.string(),
  exerciseNumber: z.string(),
  question: z.string(),
  solution: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  type: z.enum(["mcq", "short", "long", "numerical"])
});

const adminCurriculumExerciseListResponseSchema = z.object({
  exercises: z.array(adminCurriculumExerciseReadSchema)
});

const adminCurriculumExerciseMutationResponseSchema = z.object({
  exercise: z.object({
    id: z.number().int().positive(),
    chapterId: z.number().int().positive(),
    exerciseNumber: z.string(),
    question: z.string(),
    solution: z.string(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    type: z.enum(["mcq", "short", "long", "numerical"])
  }),
  timestamp: z.string().datetime()
});

const adminAuditLogEntrySchema = z.object({
  id: z.string().uuid(),
  scope: z.enum(["content", "forum", "moderation", "notifications", "settings", "users"]).optional(),
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

const adminOverviewActivityScopeSchema = z.enum([
  "content",
  "forum",
  "moderation",
  "notifications",
  "settings",
  "users"
]);

const adminOverviewActivityEntrySchema = z.object({
  id: z.string().uuid(),
  scope: adminOverviewActivityScopeSchema,
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

const adminOverviewResponseSchema = z.object({
  windowDays: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  kpis: z.object({
    openModerationFlags: z.number().int().nonnegative(),
    suspendedUsers: z.number().int().nonnegative(),
    failedAdminActionsLast24h: z.number().int().nonnegative(),
    notificationsSentInWindow: z.number().int().nonnegative()
  }),
  alerts: z.object({
    showHighPriorityBanner: z.boolean(),
    reasons: z.array(z.string())
  }),
  recentActivity: z.array(adminOverviewActivityEntrySchema)
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

export type AdminCurriculumBoard = z.infer<typeof adminCurriculumBoardSchema>;
export type AdminCurriculumClass = z.infer<typeof adminCurriculumClassSchema>;
export type AdminCurriculumSubject = z.infer<typeof adminCurriculumSubjectSchema>;
export type AdminCurriculumChapter = z.infer<typeof adminCurriculumChapterSchema>;
export type AdminCurriculumResponse = z.infer<typeof adminCurriculumResponseSchema>;
export type AdminCurriculumBoardCreateResponse = z.infer<typeof adminCurriculumBoardCreateResponseSchema>;
export type AdminCurriculumBoardMutationResponse = z.infer<typeof adminCurriculumBoardMutationResponseSchema>;
export type AdminCurriculumClassCreateResponse = z.infer<typeof adminCurriculumClassCreateResponseSchema>;
export type AdminCurriculumClassMutationResponse = z.infer<typeof adminCurriculumClassMutationResponseSchema>;
export type AdminCurriculumSubjectCreateResponse = z.infer<typeof adminCurriculumSubjectCreateResponseSchema>;
export type AdminCurriculumSubjectMutationResponse = z.infer<typeof adminCurriculumSubjectMutationResponseSchema>;
export type AdminCurriculumChapterCreateResponse = z.infer<typeof adminCurriculumChapterCreateResponseSchema>;
export type AdminCurriculumChapterMutationResponse = z.infer<typeof adminCurriculumChapterMutationResponseSchema>;
export type AdminChapterSummaryResponse = z.infer<typeof adminChapterSummaryResponseSchema>;
export type AdminChapterSummaryUpdateResponse = z.infer<typeof adminChapterSummaryUpdateResponseSchema>;
export type AdminChapterLinksResponse = z.infer<typeof adminChapterLinksResponseSchema>;
export type AdminChapterLinkSuggestionsResponse = z.infer<typeof adminChapterLinkSuggestionsResponseSchema>;
export type AdminChapterGraphResponse = z.infer<typeof adminChapterGraphResponseSchema>;
export type AdminChapterSummaryMediaUploadResponse = z.infer<typeof adminChapterSummaryMediaUploadResponseSchema>;
export type AdminCurriculumExerciseCreateResponse = z.infer<typeof adminCurriculumExerciseCreateResponseSchema>;
export type AdminCurriculumExerciseRead = z.infer<typeof adminCurriculumExerciseReadSchema>;
export type AdminCurriculumExerciseListResponse = z.infer<typeof adminCurriculumExerciseListResponseSchema>;
export type AdminCurriculumExerciseMutationResponse = z.infer<typeof adminCurriculumExerciseMutationResponseSchema>;
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
export type AdminOverviewResponse = z.infer<typeof adminOverviewResponseSchema>;
export type AdminOverviewActivityScope = z.infer<typeof adminOverviewActivityScopeSchema>;
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

export const getAdminCurriculumTree = async (cookieHeader?: string): Promise<AdminCurriculumBoard[]> => {
  const payload = await fetchAdminJson({
    path: "/api/admin/content/curriculum",
    schema: adminCurriculumResponseSchema,
    ...(cookieHeader ? { cookieHeader } : {})
  });

  return payload.boards;
};

export const createAdminCurriculumBoard = async (input: {
  name: string;
  slug: string;
}): Promise<AdminCurriculumBoardCreateResponse> => {
  return fetchAdminJson({
    path: "/api/admin/content/boards",
    schema: adminCurriculumBoardCreateResponseSchema,
    method: "POST",
    body: input
  });
};

export const updateAdminCurriculumBoard = async ({
  boardId,
  name,
  slug
}: {
  boardId: number;
  name: string;
  slug: string;
}): Promise<AdminCurriculumBoardMutationResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/boards/${boardId}/update`,
    schema: adminCurriculumBoardMutationResponseSchema,
    method: "POST",
    body: { name, slug }
  });
};

export const deleteAdminCurriculumBoard = async (boardId: number): Promise<AdminCurriculumBoardMutationResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/boards/${boardId}/delete`,
    schema: adminCurriculumBoardMutationResponseSchema,
    method: "POST"
  });
};

export const createAdminCurriculumClass = async (input: {
  boardId: number;
  name: string;
  slug: string;
}): Promise<AdminCurriculumClassCreateResponse> => {
  return fetchAdminJson({
    path: "/api/admin/content/classes",
    schema: adminCurriculumClassCreateResponseSchema,
    method: "POST",
    body: input
  });
};

export const updateAdminCurriculumClass = async ({
  classId,
  name,
  slug
}: {
  classId: number;
  name: string;
  slug: string;
}): Promise<AdminCurriculumClassMutationResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/classes/${classId}/update`,
    schema: adminCurriculumClassMutationResponseSchema,
    method: "POST",
    body: { name, slug }
  });
};

export const deleteAdminCurriculumClass = async (classId: number): Promise<AdminCurriculumClassMutationResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/classes/${classId}/delete`,
    schema: adminCurriculumClassMutationResponseSchema,
    method: "POST"
  });
};

export const createAdminCurriculumSubject = async (input: {
  boardClassId: number;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
}): Promise<AdminCurriculumSubjectCreateResponse> => {
  return fetchAdminJson({
    path: "/api/admin/content/subjects",
    schema: adminCurriculumSubjectCreateResponseSchema,
    method: "POST",
    body: input
  });
};

export const deleteAdminCurriculumSubject = async (subjectId: number): Promise<AdminCurriculumSubjectMutationResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/subjects/${subjectId}/delete`,
    schema: adminCurriculumSubjectMutationResponseSchema,
    method: "POST"
  });
};

export const createAdminCurriculumChapter = async (input: {
  subjectId: number;
  chapterNumber: number;
  title: string;
  slug: string;
  summary: string;
  isPublished?: boolean;
}): Promise<AdminCurriculumChapterCreateResponse> => {
  return fetchAdminJson({
    path: "/api/admin/content/chapters",
    schema: adminCurriculumChapterCreateResponseSchema,
    method: "POST",
    body: input
  });
};

export const updateAdminCurriculumChapter = async ({
  chapterId,
  chapterNumber,
  title,
  slug
}: {
  chapterId: number;
  chapterNumber: number;
  title: string;
  slug: string;
}): Promise<AdminCurriculumChapterMutationResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/chapters/${chapterId}/update`,
    schema: adminCurriculumChapterMutationResponseSchema,
    method: "POST",
    body: {
      chapterNumber,
      title,
      slug
    }
  });
};

export const deleteAdminCurriculumChapter = async (chapterId: number): Promise<AdminCurriculumChapterMutationResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/chapters/${chapterId}/delete`,
    schema: adminCurriculumChapterMutationResponseSchema,
    method: "POST"
  });
};

export const getAdminChapterSummary = async (chapterId: number): Promise<AdminChapterSummaryResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/chapters/${chapterId}/summary`,
    schema: adminChapterSummaryResponseSchema
  });
};

export const updateAdminChapterSummary = async ({
  chapterId,
  summary
}: {
  chapterId: number;
  summary: string;
}): Promise<AdminChapterSummaryUpdateResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/chapters/${chapterId}/summary`,
    schema: adminChapterSummaryUpdateResponseSchema,
    method: "POST",
    body: { summary }
  });
};

export const getAdminChapterLinks = async (chapterId: number): Promise<AdminChapterLinksResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/chapters/${chapterId}/links`,
    schema: adminChapterLinksResponseSchema
  });
};

export const getAdminChapterLinkSuggestions = async ({
  query,
  limit = 20
}: {
  query: string;
  limit?: number;
}): Promise<AdminChapterLinkSuggestionsResponse> => {
  const searchParams = new URLSearchParams({
    q: query,
    limit: String(limit)
  });
  return fetchAdminJson({
    path: `/api/admin/content/chapters/link-suggestions?${searchParams.toString()}`,
    schema: adminChapterLinkSuggestionsResponseSchema
  });
};

export const getAdminChapterGraph = async ({
  query
}: {
  query: string;
}): Promise<AdminChapterGraphResponse> => {
  const searchParams = new URLSearchParams({
    q: query
  });
  return fetchAdminJson({
    path: `/api/admin/content/chapters/graph?${searchParams.toString()}`,
    schema: adminChapterGraphResponseSchema
  });
};

export const uploadAdminChapterSummaryMedia = async ({
  chapterId,
  file
}: {
  chapterId: number;
  file: File;
}): Promise<AdminChapterSummaryMediaUploadResponse> => {
  const formData = new FormData();
  formData.append("media", file);

  const response = await fetch(`${backendUrl}/api/admin/content/chapters/${chapterId}/summary-media`, {
    method: "POST",
    body: formData,
    credentials: "include"
  });

  if (!response.ok) {
    let message = "Failed to upload chapter summary media.";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Keep default message when body is not JSON.
    }
    throw new Error(message);
  }

  return adminChapterSummaryMediaUploadResponseSchema.parse((await response.json()) as unknown);
};

export const createAdminCurriculumExercise = async (input: {
  chapterId: number;
  exerciseNumber: string;
  question: string;
  solution: string;
  difficulty?: "easy" | "medium" | "hard";
  type?: "mcq" | "short" | "long" | "numerical";
}): Promise<AdminCurriculumExerciseCreateResponse> => {
  return fetchAdminJson({
    path: "/api/admin/content/exercises",
    schema: adminCurriculumExerciseCreateResponseSchema,
    method: "POST",
    body: input
  });
};

export const getAdminCurriculumExercises = async ({
  chapterId
}: {
  chapterId?: number;
}): Promise<AdminCurriculumExerciseListResponse> => {
  const searchParams = new URLSearchParams();
  if (chapterId) {
    searchParams.set("chapterId", String(chapterId));
  }
  return fetchAdminJson({
    path: `/api/admin/content/exercises${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`,
    schema: adminCurriculumExerciseListResponseSchema
  });
};

export const updateAdminCurriculumExercise = async ({
  exerciseId,
  exerciseNumber,
  question,
  solution,
  difficulty,
  type
}: {
  exerciseId: number;
  exerciseNumber: string;
  question: string;
  solution: string;
  difficulty?: "easy" | "medium" | "hard";
  type?: "mcq" | "short" | "long" | "numerical";
}): Promise<AdminCurriculumExerciseMutationResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/exercises/${exerciseId}/update`,
    schema: adminCurriculumExerciseMutationResponseSchema,
    method: "POST",
    body: {
      exerciseNumber,
      question,
      solution,
      ...(difficulty ? { difficulty } : {}),
      ...(type ? { type } : {})
    }
  });
};

export const deleteAdminCurriculumExercise = async (
  exerciseId: number
): Promise<AdminCurriculumExerciseMutationResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/exercises/${exerciseId}/delete`,
    schema: adminCurriculumExerciseMutationResponseSchema,
    method: "POST"
  });
};

const getAuditLogs = async ({
  scope,
  page,
  pageSize,
  cookieHeader
}: {
  scope: "content" | "forum" | "moderation" | "notifications" | "settings" | "users";
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

export const getAdminAuditLogs = async ({
  scope,
  status,
  q,
  page,
  pageSize,
  cookieHeader
}: {
  scope: "all" | "content" | "forum" | "moderation" | "notifications" | "settings" | "users";
  status: "all" | "success" | "failed";
  q: string;
  page: number;
  pageSize: number;
  cookieHeader?: string;
}): Promise<AdminAuditLogResponse> => {
  const query = new URLSearchParams({
    scope,
    status,
    q,
    page: String(page),
    pageSize: String(pageSize)
  });

  return fetchAdminJson({
    path: `/api/admin/audit-logs?${query.toString()}`,
    schema: adminAuditLogResponseSchema,
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

export const getAdminOverview = async ({
  windowDays,
  cookieHeader
}: {
  windowDays: 7 | 30 | 90;
  cookieHeader?: string;
}): Promise<AdminOverviewResponse> => {
  const query = new URLSearchParams({
    windowDays: String(windowDays)
  });

  return fetchAdminJson({
    path: `/api/admin/overview?${query.toString()}`,
    schema: adminOverviewResponseSchema,
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
