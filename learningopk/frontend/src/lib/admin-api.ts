import { z } from "zod";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const adminCurriculumChapterSchema = z.object({
  id: z.number().int().positive(),
  chapterNumber: z.number().int().positive(),
  title: z.string(),
  slug: z.string(),
  isPublished: z.boolean(),
  coverImageUrl: z.string().nullable().optional().default(null)
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
    summary: z.string().nullable().optional().default("")
  })
});

const revisionDefinitionSchema = z.object({
  term: z.string(),
  definition: z.string()
});

const adminRevisionNotesSchema = z.object({
  keyFormulas: z.array(z.string()),
  keyDefinitions: z.array(revisionDefinitionSchema),
  commonMistakes: z.string(),
  examTips: z.string()
});

const adminChapterSummaryUpdateResponseSchema = z.object({
  chapter: z.object({
    id: z.number().int().positive(),
    title: z.string(),
    summary: z.string()
  }),
  timestamp: z.string().datetime()
});

const adminChapterSubpartSchema = z.object({
  id: z.number().int().positive(),
  chapterId: z.number().int().positive(),
  orderIndex: z.number().int().positive(),
  heading: z.string(),
  content: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

const adminChapterSubpartsResponseSchema = z.object({
  chapter: z.object({
    id: z.number().int().positive(),
    title: z.string()
  }),
  subparts: z.array(adminChapterSubpartSchema)
});

const adminChapterSubpartMutationResponseSchema = z.object({
  subpart: adminChapterSubpartSchema,
  timestamp: z.string().datetime()
});

const adminChapterSubpartReorderResponseSchema = z.object({
  subparts: z.array(adminChapterSubpartSchema),
  timestamp: z.string().datetime()
});

const adminChapterSubpartDeleteResponseSchema = z.object({
  success: z.boolean(),
  deletedId: z.number().int().positive(),
  timestamp: z.string().datetime()
});

const adminChapterRevisionNotesResponseSchema = z.object({
  chapter: z.object({
    id: z.number().int().positive(),
    title: z.string()
  }),
  revisionNotes: adminRevisionNotesSchema
});

const adminChapterRevisionNotesUpdateResponseSchema = z.object({
  chapter: z.object({
    id: z.number().int().positive(),
    title: z.string()
  }),
  revisionNotes: adminRevisionNotesSchema,
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
    problemMarkdown: z.string().nullable().optional(),
    solutionCode: z.string().nullable().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    type: z.enum(["mcq", "short", "long", "numerical", "fill_in_blanks"]),
    visualizationHtml: z.string().nullable().optional(),
    blanksAnswer: z.array(z.string()).nullable().optional()
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
  problemMarkdown: z.string().nullable().optional(),
  solutionCode: z.string().nullable().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  type: z.enum(["mcq", "short", "long", "numerical", "fill_in_blanks"]),
  visualizationHtml: z.string().nullable().optional(),
  blanksAnswer: z.array(z.string()).nullable().optional()
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
    problemMarkdown: z.string().nullable().optional(),
    solutionCode: z.string().nullable().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    type: z.enum(["mcq", "short", "long", "numerical", "fill_in_blanks"]),
    visualizationHtml: z.string().nullable().optional(),
    blanksAnswer: z.array(z.string()).nullable().optional()
  }),
  timestamp: z.string().datetime()
});

// Quiz Schemas
const quizUpsertBodySchema = z.object({
  chapterId: z.number().int().positive(),
  title: z.string().trim().min(1),
  durationMinutes: z.number().int().positive().optional().default(30),
  type: z.enum(["chapter_quiz", "mock_exam"]).optional().default("chapter_quiz")
});

const quizResponseSchema = z.object({
  id: z.number(),
  chapterId: z.number(),
  title: z.string(),
  durationMinutes: z.number(),
  totalMarks: z.number().int().min(0),
  type: z.enum(["chapter_quiz", "mock_exam"]),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

const quizQuestionCreateSchema = z.object({
  quizId: z.number().int().positive(),
  question: z.string().trim().min(1),
  optionA: z.string().trim().min(1),
  optionB: z.string().trim().min(1),
  optionC: z.string().trim().min(1),
  optionD: z.string().trim().min(1),
  correctOption: z.enum(["a", "b", "c", "d"]),
  explanation: z.string().trim().optional(),
  marks: z.number().int().positive().optional().default(1)
});

const quizQuestionResponseSchema = z.object({
  id: z.number(),
  quizId: z.number(),
  chapterId: z.number(),
  question: z.string(),
  optionA: z.string(),
  optionB: z.string(),
  optionC: z.string(),
  optionD: z.string(),
  correctOption: z.enum(["a", "b", "c", "d"]),
  explanation: z.string().nullable(),
  marks: z.number(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

const quizQuestionUpdateSchema = quizQuestionCreateSchema.partial();

const quizUpsertResponseSchema = z.object({
  data: quizResponseSchema,
  created: z.boolean()
});

const quizUpdateResponseSchema = z.object({
  data: quizResponseSchema
});

const quizQuestionMutationResponseSchema = z.object({
  data: quizQuestionResponseSchema
});

// Flashcard Schemas
const flashcardCreateSchema = z.object({
  chapterId: z.number().int().positive(),
  front: z.string().trim().min(1),
  back: z.string().trim().min(1),
  orderIndex: z.number().int().min(0).optional()
});

const flashcardUpdateSchema = z.object({
  front: z.string().trim().min(1).optional(),
  back: z.string().trim().min(1).optional(),
  orderIndex: z.number().int().min(0).optional()
});

const flashcardResponseSchema = z.object({
  id: z.number(),
  chapterId: z.number(),
  front: z.string(),
  back: z.string(),
  orderIndex: z.number().int().min(0).nullable(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

const flashcardCreateResponseSchema = z.object({
  data: flashcardResponseSchema
});

const flashcardMutationResponseSchema = z.object({
  data: flashcardResponseSchema
});

const flashcardReorderSchema = z.object({
  chapterId: z.number().int().positive(),
  flashcardIds: z.array(z.number().int().positive())
});

const flashcardReorderResponseSchema = z.object({
  success: z.boolean(),
  updated: z.array(z.object({
    id: z.number(),
    orderIndex: z.number()
  }))
});

// Formula Schemas
const formulaVariableSchema = z.object({
  symbol: z.string(),
  meaning: z.string()
});

const formulaResponseSchema = z.object({
  id: z.number(),
  subjectId: z.number(),
  chapterId: z.number(),
  name: z.string(),
  formulaLatex: z.string(),
  description: z.string(),
  variables: z.array(formulaVariableSchema),
  tags: z.array(z.string()),
  createdAt: z.string().datetime().or(z.coerce.string()).optional(),
  updatedAt: z.string().datetime().or(z.coerce.string()).optional(),
  subjectName: z.string().nullable().optional(),
  chapterTitle: z.string().nullable().optional()
});

const formulaCreateResponseSchema = z.object({
  data: formulaResponseSchema
});

const formulaMutationResponseSchema = z.object({
  data: formulaResponseSchema
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
    openModerationFlags: z.number().int().nonnegative(),
    confusionEvents: z.number().int().nonnegative()
  }),
  subjectPerformance: z.array(adminAnalyticsSubjectPerformanceSchema),
  confusionByChapter: z.array(
    z.object({
      chapterId: z.number().int().positive(),
      chapterTitle: z.string(),
      subjectName: z.string(),
      count: z.number().int().nonnegative()
    })
  )
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
export type AdminChapterRevisionNotesResponse = z.infer<typeof adminChapterRevisionNotesResponseSchema>;
export type AdminChapterRevisionNotes = z.infer<typeof adminRevisionNotesSchema>;
export type AdminChapterSummaryUpdateResponse = z.infer<typeof adminChapterSummaryUpdateResponseSchema>;
export type AdminChapterSubpart = z.infer<typeof adminChapterSubpartSchema>;
export type AdminChapterSubpartsResponse = z.infer<typeof adminChapterSubpartsResponseSchema>;
export type AdminChapterSubpartMutationResponse = z.infer<typeof adminChapterSubpartMutationResponseSchema>;
export type AdminChapterSubpartReorderResponse = z.infer<typeof adminChapterSubpartReorderResponseSchema>;
export type AdminChapterSubpartDeleteResponse = z.infer<typeof adminChapterSubpartDeleteResponseSchema>;
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
export type AdminAnalyticsConfusionChapter = z.infer<typeof adminAnalyticsOverviewSchema>['confusionByChapter'][number];
export type AdminOverviewResponse = z.infer<typeof adminOverviewResponseSchema>;
export type AdminOverviewActivityScope = z.infer<typeof adminOverviewActivityScopeSchema>;
export type AdminNotification = z.infer<typeof adminNotificationSchema>;
export type AdminNotificationsResponse = z.infer<typeof adminNotificationsResponseSchema>;
export type AdminNotificationCreateResponse = z.infer<typeof adminNotificationCreateResponseSchema>;
export type AdminSetting = z.infer<typeof adminSettingSchema>;
export type AdminSettingsResponse = z.infer<typeof adminSettingsResponseSchema>;
export type AdminSettingUpdateResponse = z.infer<typeof adminSettingUpdateResponseSchema>;
export type QuizUpsertBody = z.infer<typeof quizUpsertBodySchema>;
export type QuizResponse = z.infer<typeof quizResponseSchema>;
export type QuizQuestionCreate = z.infer<typeof quizQuestionCreateSchema>;
export type QuizQuestionUpdate = z.infer<typeof quizQuestionUpdateSchema>;
export type QuizQuestionResponse = z.infer<typeof quizQuestionResponseSchema>;
export type QuizUpsertResponse = z.infer<typeof quizUpsertResponseSchema>;
export type QuizUpdateResponse = z.infer<typeof quizUpdateResponseSchema>;
export type QuizQuestionMutationResponse = z.infer<typeof quizQuestionMutationResponseSchema>;
export type FlashcardCreate = z.infer<typeof flashcardCreateSchema>;
export type FlashcardUpdate = z.infer<typeof flashcardUpdateSchema>;
export type FlashcardResponse = z.infer<typeof flashcardResponseSchema>;
export type FlashcardCreateResponse = z.infer<typeof flashcardCreateResponseSchema>;
export type FlashcardMutationResponse = z.infer<typeof flashcardMutationResponseSchema>;
export type FlashcardReorder = z.infer<typeof flashcardReorderSchema>;
export type FlashcardReorderResponse = z.infer<typeof flashcardReorderResponseSchema>;
export type FormulaVariable = z.infer<typeof formulaVariableSchema>;
export type FormulaResponse = z.infer<typeof formulaResponseSchema>;
export type FormulaCreateResponse = z.infer<typeof formulaCreateResponseSchema>;
export type FormulaMutationResponse = z.infer<typeof formulaMutationResponseSchema>;

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
    let errorDetails = response.status;
    try {
      const errorBody = await response.json();
      errorDetails = errorBody.details || errorBody.error || errorBody;
    } catch {
      // response body isn't JSON, use status code
    }
    throw new Error(`Admin request failed: ${response.status} - ${JSON.stringify(errorDetails)}`);
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
  isPublished?: boolean;
  coverImageUrl?: string | null;
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
  slug,
  coverImageUrl
}: {
  chapterId: number;
  chapterNumber: number;
  title: string;
  slug: string;
  coverImageUrl?: string | null;
}): Promise<AdminCurriculumChapterMutationResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/chapters/${chapterId}/update`,
    schema: adminCurriculumChapterMutationResponseSchema,
    method: "POST",
    body: {
      chapterNumber,
      title,
      slug,
      ...(coverImageUrl !== undefined ? { coverImageUrl } : {})
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

export const getAdminChapterSubparts = async (chapterId: number): Promise<AdminChapterSubpartsResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/chapters/${chapterId}/subparts`,
    schema: adminChapterSubpartsResponseSchema
  });
};

export const createAdminChapterSubpart = async ({
  chapterId,
  heading,
  content,
  orderIndex
}: {
  chapterId: number;
  heading: string;
  content: string;
  orderIndex?: number;
}): Promise<AdminChapterSubpartMutationResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/chapters/${chapterId}/subparts`,
    schema: adminChapterSubpartMutationResponseSchema,
    method: "POST",
    body: {
      heading,
      content,
      ...(orderIndex !== undefined ? { orderIndex } : {})
    }
  });
};

export const updateAdminChapterSubpart = async ({
  chapterId,
  subpartId,
  heading,
  content
}: {
  chapterId: number;
  subpartId: number;
  heading: string;
  content: string;
}): Promise<AdminChapterSubpartMutationResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/chapters/${chapterId}/subparts/${subpartId}`,
    schema: adminChapterSubpartMutationResponseSchema,
    method: "POST",
    body: {
      heading,
      content
    }
  });
};

export const reorderAdminChapterSubparts = async ({
  chapterId,
  subpartIds
}: {
  chapterId: number;
  subpartIds: number[];
}): Promise<AdminChapterSubpartReorderResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/chapters/${chapterId}/subparts/reorder`,
    schema: adminChapterSubpartReorderResponseSchema,
    method: "POST",
    body: {
      subpartIds
    }
  });
};

export const deleteAdminChapterSubpart = async ({
  chapterId,
  subpartId
}: {
  chapterId: number;
  subpartId: number;
}): Promise<AdminChapterSubpartDeleteResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/chapters/${chapterId}/subparts/${subpartId}/delete`,
    schema: adminChapterSubpartDeleteResponseSchema,
    method: "POST"
  });
};

export const getAdminChapterRevisionNotes = async (chapterId: number): Promise<AdminChapterRevisionNotesResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/chapters/${chapterId}/revision-notes`,
    schema: adminChapterRevisionNotesResponseSchema
  });
};

export const updateAdminChapterRevisionNotes = async ({
  chapterId,
  revisionNotes
}: {
  chapterId: number;
  revisionNotes: AdminChapterRevisionNotes;
}) => {
  return fetchAdminJson({
    path: `/api/admin/content/chapters/${chapterId}/revision-notes`,
    schema: adminChapterRevisionNotesUpdateResponseSchema,
    method: "POST",
    body: revisionNotes
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

export const uploadAdminChapterCoverImage = async ({
  chapterId,
  file
}: {
  chapterId: number;
  file: File;
}): Promise<{ coverImageUrl: string }> => {
  const formData = new FormData();
  formData.append("cover", file);

  const response = await fetch(`${backendUrl}/api/admin/content/chapters/${chapterId}/cover-image`, {
    method: "POST",
    body: formData,
    credentials: "include"
  });

  if (!response.ok) {
    let message = "Failed to upload chapter cover image.";
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

  return z.object({ coverImageUrl: z.string() }).parse((await response.json()) as unknown);
};

export const deleteAdminChapterCoverImage = async ({
  chapterId
}: {
  chapterId: number;
}): Promise<void> => {
  const response = await fetch(`${backendUrl}/api/admin/content/chapters/${chapterId}/cover-image`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    let message = "Failed to delete chapter cover image.";
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
};

export const createAdminCurriculumExercise = async (input: {
  chapterId: number;
  exerciseNumber: string;
  question: string;
  solution: string;
  difficulty?: "easy" | "medium" | "hard";
  type?: "mcq" | "short" | "long" | "numerical" | "fill_in_blanks";
  problemMarkdown?: string;
  solutionCode?: string;
  visualizationHtml?: string | null;
  blanksAnswer?: string[] | null;
}): Promise<AdminCurriculumExerciseCreateResponse> => {
  return fetchAdminJson({
    path: "/api/admin/content/exercises",
    schema: adminCurriculumExerciseCreateResponseSchema,
    method: "POST",
    body: {
      chapterId: input.chapterId,
      exerciseNumber: input.exerciseNumber,
      question: input.question,
      solution: input.solution,
      difficulty: input.difficulty,
      type: input.type,
      ...(input.problemMarkdown && { problemMarkdown: input.problemMarkdown }),
      ...(input.solutionCode && { solutionCode: input.solutionCode }),
      ...(input.visualizationHtml !== undefined && { visualizationHtml: input.visualizationHtml }),
      ...(input.blanksAnswer !== undefined && { blanksAnswer: input.blanksAnswer }),
    }
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
  type,
  problemMarkdown,
  solutionCode,
  visualizationHtml,
  blanksAnswer
}: {
  exerciseId: number;
  exerciseNumber: string;
  question: string;
  solution: string;
  difficulty?: "easy" | "medium" | "hard";
  type?: "mcq" | "short" | "long" | "numerical" | "fill_in_blanks";
  problemMarkdown?: string;
  solutionCode?: string;
  visualizationHtml?: string | null;
  blanksAnswer?: string[] | null;
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
      ...(type ? { type } : {}),
      ...(problemMarkdown !== undefined ? { problemMarkdown } : {}),
      ...(solutionCode !== undefined ? { solutionCode } : {}),
      ...(visualizationHtml !== undefined ? { visualizationHtml } : {}),
      ...(blanksAnswer !== undefined ? { blanksAnswer } : {})
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

// Quiz Functions
export const upsertAdminQuiz = async (input: {
  chapterId: number;
  title: string;
  durationMinutes?: number;
  type?: "chapter_quiz" | "mock_exam";
}): Promise<QuizUpsertResponse> => {
  return fetchAdminJson({
    path: "/api/admin/content/quizzes",
    schema: quizUpsertResponseSchema,
    method: "POST",
    body: input
  });
};

export const getAdminQuiz = async (chapterId: number): Promise<QuizResponse | null> => {
  const searchParams = new URLSearchParams({
    chapterId: String(chapterId)
  });
  const searchParamsStr = searchParams.toString();
  const response = await fetchAdminJson({
    path: `/api/admin/content/quizzes?${searchParamsStr}`,
    schema: z.object({ data: quizResponseSchema.nullable() })
  });
  return response.data;
};

export const updateAdminQuiz = async ({
  id,
  input
}: {
  id: number;
  input: {
    title?: string;
    durationMinutes?: number;
    type?: "chapter_quiz" | "mock_exam";
  };
}): Promise<QuizUpdateResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/quizzes/${id}/update`,
    schema: quizUpdateResponseSchema,
    method: "POST",
    body: input
  });
};

export const deleteAdminQuiz = async (id: number): Promise<void> => {
  await fetchAdminJson({
    path: `/api/admin/content/quizzes/${id}/delete`,
    schema: z.object({ success: z.boolean() }),
    method: "POST"
  });
};

export const createAdminQuizQuestion = async (input: {
  quizId: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "a" | "b" | "c" | "d";
  explanation?: string | null;
  marks?: number;
}): Promise<QuizQuestionMutationResponse> => {
  return fetchAdminJson({
    path: "/api/admin/content/quiz-questions",
    schema: quizQuestionMutationResponseSchema,
    method: "POST",
    body: input
  });
};

export const getAdminQuizQuestions = async (quizId: number): Promise<QuizQuestionResponse[]> => {
  const searchParams = new URLSearchParams({
    quizId: String(quizId)
  });
  const response = await fetchAdminJson({
    path: `/api/admin/content/quiz-questions?${searchParams.toString()}`,
    schema: z.object({ data: z.array(quizQuestionResponseSchema) })
  });
  return response.data;
};

export const updateAdminQuizQuestion = async ({
  id,
  input
}: {
  id: number;
  input: {
    question?: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    correctOption?: "a" | "b" | "c" | "d";
    explanation?: string;
    marks?: number;
  };
}): Promise<QuizQuestionMutationResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/quiz-questions/${id}/update`,
    schema: quizQuestionMutationResponseSchema,
    method: "POST",
    body: input
  });
};

export const deleteAdminQuizQuestion = async (id: number): Promise<void> => {
  await fetchAdminJson({
    path: `/api/admin/content/quiz-questions/${id}/delete`,
    schema: z.object({ success: z.boolean() }),
    method: "POST"
  });
};

// Flashcard Functions
export const createAdminFlashcard = async (input: {
  chapterId: number;
  front: string;
  back: string;
  orderIndex?: number;
}): Promise<FlashcardCreateResponse> => {
  return fetchAdminJson({
    path: "/api/admin/content/flashcards",
    schema: flashcardCreateResponseSchema,
    method: "POST",
    body: input
  });
};

export const getAdminFlashcards = async (chapterId: number): Promise<FlashcardResponse[]> => {
  const searchParams = new URLSearchParams({
    chapterId: String(chapterId)
  });
  const response = await fetchAdminJson({
    path: `/api/admin/content/flashcards?${searchParams.toString()}`,
    schema: z.object({ data: z.array(flashcardResponseSchema), total: z.number() })
  });
  return response.data;
};

export const updateAdminFlashcard = async ({
  id,
  input
}: {
  id: number;
  input: {
    front?: string;
    back?: string;
    orderIndex?: number;
  };
}): Promise<FlashcardMutationResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/flashcards/${id}/update`,
    schema: flashcardMutationResponseSchema,
    method: "POST",
    body: input
  });
};

export const deleteAdminFlashcard = async (id: number): Promise<void> => {
  await fetchAdminJson({
    path: `/api/admin/content/flashcards/${id}/delete`,
    schema: z.object({ success: z.boolean() }),
    method: "POST"
  });
};

export const reorderAdminFlashcards = async (input: {
  chapterId: number;
  flashcardIds: number[];
}): Promise<FlashcardReorderResponse> => {
  return fetchAdminJson({
    path: "/api/admin/content/flashcards/reorder",
    schema: flashcardReorderResponseSchema,
    method: "POST",
    body: input
  });
};

// Formula Functions
export const getAdminFormulas = async (params?: {
  subjectId?: number;
  chapterId?: number;
  cookieHeader?: string;
}): Promise<FormulaResponse[]> => {
  const searchParams = new URLSearchParams();
  if (params?.subjectId) searchParams.set("subjectId", String(params.subjectId));
  if (params?.chapterId) searchParams.set("chapterId", String(params.chapterId));
  const query = searchParams.toString();
  const path = `/api/admin/content/formulas${query ? `?${query}` : ""}`;
  const response = await fetchAdminJson({
    path,
    schema: z.object({ data: z.array(formulaResponseSchema), total: z.number() }),
    ...(params?.cookieHeader ? { cookieHeader: params.cookieHeader } : {})
  });
  return response.data;
};

export const createAdminFormula = async (input: {
  subjectId: number;
  chapterId: number;
  name: string;
  formulaLatex: string;
  description: string;
  variables?: Array<{ symbol: string; meaning: string }>;
  tags?: string[];
}): Promise<FormulaCreateResponse> => {
  return fetchAdminJson({
    path: "/api/admin/content/formulas",
    schema: formulaCreateResponseSchema,
    method: "POST",
    body: input
  });
};

export const updateAdminFormula = async ({
  id,
  input
}: {
  id: number;
  input: {
    subjectId?: number;
    chapterId?: number;
    name?: string;
    formulaLatex?: string;
    description?: string;
    variables?: Array<{ symbol: string; meaning: string }>;
    tags?: string[];
  };
}): Promise<FormulaMutationResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/formulas/${id}/update`,
    schema: formulaMutationResponseSchema,
    method: "POST",
    body: input
  });
};

export const deleteAdminFormula = async (id: number): Promise<void> => {
  await fetchAdminJson({
    path: `/api/admin/content/formulas/${id}/delete`,
    schema: z.object({ success: z.boolean() }),
    method: "POST"
  });
};

// Past Paper Schemas
const pastPaperResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  boardId: z.number(),
  boardName: z.string().nullable().optional(),
  grade: z.enum(["9", "10"]),
  subjectId: z.number(),
  subjectName: z.string().nullable().optional(),
  year: z.number(),
  durationMinutes: z.number(),
  totalMarks: z.number(),
  paperContent: z.string().nullable(),
  solutionContent: z.string().nullable()
});

const pastPaperCreateResponseSchema = z.object({
  data: pastPaperResponseSchema
});

const pastPaperMutationResponseSchema = z.object({
  data: pastPaperResponseSchema
});

export type PastPaperResponse = z.infer<typeof pastPaperResponseSchema>;
export type PastPaperCreateResponse = z.infer<typeof pastPaperCreateResponseSchema>;
export type PastPaperMutationResponse = z.infer<typeof pastPaperMutationResponseSchema>;

// Past Paper Functions
export const getAdminPastPapers = async (params?: {
  boardId?: number;
  grade?: "9" | "10";
  subjectId?: number;
  year?: number;
  cookieHeader?: string;
}): Promise<PastPaperResponse[]> => {
  const searchParams = new URLSearchParams();
  if (params?.boardId) searchParams.set("boardId", String(params.boardId));
  if (params?.grade) searchParams.set("grade", params.grade);
  if (params?.subjectId) searchParams.set("subjectId", String(params.subjectId));
  if (params?.year) searchParams.set("year", String(params.year));
  const query = searchParams.toString();
  const path = `/api/admin/content/past-papers${query ? `?${query}` : ""}`;
  const response = await fetchAdminJson({
    path,
    schema: z.object({ data: z.array(pastPaperResponseSchema), total: z.number() }),
    ...(params?.cookieHeader ? { cookieHeader: params.cookieHeader } : {})
  });
  return response.data;
};

export const createAdminPastPaper = async (input: {
  title: string;
  boardId: number;
  grade: "9" | "10";
  subjectId: number;
  year: number;
  paperContent: string;
  solutionContent?: string;
}): Promise<PastPaperCreateResponse> => {
  return fetchAdminJson({
    path: "/api/admin/content/past-papers",
    schema: pastPaperCreateResponseSchema,
    method: "POST",
    body: input
  });
};

export const updateAdminPastPaper = async ({
  id,
  input
}: {
  id: number;
  input: {
    title?: string;
    boardId?: number;
    grade?: "9" | "10";
    subjectId?: number;
    year?: number;
    paperContent?: string;
    solutionContent?: string;
  };
}): Promise<PastPaperMutationResponse> => {
  return fetchAdminJson({
    path: `/api/admin/content/past-papers/${id}/update`,
    schema: pastPaperMutationResponseSchema,
    method: "POST",
    body: input
  });
};

export const deleteAdminPastPaper = async (id: number): Promise<void> => {
  await fetchAdminJson({
    path: `/api/admin/content/past-papers/${id}/delete`,
    schema: z.object({ success: z.boolean() }),
    method: "POST"
  });
};
