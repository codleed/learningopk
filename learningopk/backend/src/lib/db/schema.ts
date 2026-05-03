import { desc, sql } from "drizzle-orm";
import {
  AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["student", "admin"]);
export const gradeEnum = pgEnum("grade", ["9", "10"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const exerciseTypeEnum = pgEnum("exercise_type", ["mcq", "short", "long", "numerical", "fill_in_blanks"]);
export const quizTypeEnum = pgEnum("quiz_type", ["chapter_quiz", "mock_exam"]);
export const answerOptionEnum = pgEnum("answer_option", ["a", "b", "c", "d"]);
export const aiMessageRoleEnum = pgEnum("ai_message_role", ["user", "assistant"]);
export const voteTypeEnum = pgEnum("vote_type", ["upvote", "downvote"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);
export const moderationTargetTypeEnum = pgEnum("moderation_target_type", ["thread", "reply", "chapter"]);
export const moderationStatusEnum = pgEnum("moderation_status", ["open", "resolved"]);
export const adminAuditScopeEnum = pgEnum("admin_audit_scope", [
  "content",
  "forum",
  "moderation",
  "notifications",
  "settings",
  "users"
]);
export const adminAuditStatusEnum = pgEnum("admin_audit_status", ["success", "failed"]);
export const notificationAudienceEnum = pgEnum("notification_audience", ["all", "students", "admins"]);
export const notificationStatusEnum = pgEnum("notification_status", ["sent"]);
export const streakWagerStatusEnum = pgEnum("streak_wager_status", ["active", "won", "lost"]);

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  class: text("student_class"),
  degree: text("degree"),
  board: text("board"),
  leaderboardPublic: boolean("leaderboard_public").notNull().default(true),
  role: userRoleEnum("role").notNull().default("student"),
  status: userStatusEnum("status").notNull().default("active"),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(0),
  streakFreezeUsedAt: timestamp("streak_freeze_used_at", { withTimezone: true, mode: "date" }),
  suspendedAt: timestamp("suspended_at", { withTimezone: true, mode: "date" }),
  suspendedReason: text("suspended_reason"),
  suspendedBy: text("suspended_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
});

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true, mode: "date" }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true, mode: "date" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [uniqueIndex("account_provider_account_idx").on(table.providerId, table.accountId)]
);

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [uniqueIndex("verification_identifier_value_idx").on(table.identifier, table.value)]
);

export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique()
});

export const boardClasses = pgTable(
  "board_classes",
  {
    id: serial("id").primaryKey(),
    boardId: integer("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull()
  },
  (table) => [uniqueIndex("board_classes_board_slug_idx").on(table.boardId, table.slug)]
);

export const subjects = pgTable(
  "subjects",
  {
    id: serial("id").primaryKey(),
    boardId: integer("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    grade: gradeEnum("grade"),
    boardClassId: integer("board_class_id").references(() => boardClasses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    icon: text("icon"),
    description: text("description"),
    coverImageUrl: text("cover_image_url"),
    examDate: timestamp("exam_date", { withTimezone: true, mode: "date" })
  },
  (table) => [
    uniqueIndex("subjects_board_grade_slug_idx").on(table.boardId, table.grade, table.slug),
    uniqueIndex("subjects_board_class_slug_idx").on(table.boardClassId, table.slug)
  ]
);

export const contentSources = pgTable(
  "content_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: integer("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    grade: gradeEnum("grade").notNull(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileHash: text("file_hash").notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    parserVersion: text("parser_version").notNull()
  },
  (table) => [uniqueIndex("content_sources_subject_hash_idx").on(table.subjectId, table.fileHash)]
);

export const chapters = pgTable(
  "chapters",
  {
    id: serial("id").primaryKey(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    chapterNumber: integer("chapter_number").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary"),
    coverImageUrl: text("cover_image_url"),
    isPublished: boolean("is_published").notNull().default(false),
    sourceId: uuid("source_id").references(() => contentSources.id, { onDelete: "set null" })
  },
  (table) => [
    uniqueIndex("chapters_subject_slug_idx").on(table.subjectId, table.slug),
    uniqueIndex("chapters_subject_chapter_number_idx").on(table.subjectId, table.chapterNumber)
  ]
);

export const chapterSubparts = pgTable(
  "chapter_subparts",
  {
    id: serial("id").primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    heading: text("heading").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("chapter_subparts_chapter_order_idx").on(table.chapterId, table.orderIndex),
    index("chapter_subparts_chapter_idx").on(table.chapterId)
  ]
);

export const chapterSummaryLinks = pgTable(
  "chapter_summary_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceSubpartId: integer("source_subpart_id")
      .notNull()
      .references(() => chapterSubparts.id, { onDelete: "cascade" }),
    targetSubpartId: integer("target_subpart_id").references(() => chapterSubparts.id, { onDelete: "set null" }),
    targetTitle: text("target_title").notNull(),
    normalizedTarget: text("normalized_target").notNull(),
    isResolved: boolean("is_resolved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("chapter_summary_links_source_subpart_normalized_idx").on(table.sourceSubpartId, table.normalizedTarget),
    index("chapter_summary_links_source_subpart_idx").on(table.sourceSubpartId),
    index("chapter_summary_links_target_subpart_idx").on(table.targetSubpartId),
    index("chapter_summary_links_normalized_idx").on(table.normalizedTarget)
  ]
);

export const chapterTitleAliases = pgTable(
  "chapter_title_aliases",
  {
    id: serial("id").primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    aliasTitle: text("alias_title").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("chapter_title_aliases_chapter_normalized_idx").on(table.chapterId, table.normalizedAlias),
    index("chapter_title_aliases_normalized_idx").on(table.normalizedAlias)
  ]
);

export const chapterSummaryMedia = pgTable(
  "chapter_summary_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),
    objectUrl: text("object_url").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("chapter_summary_media_object_key_idx").on(table.objectKey),
    index("chapter_summary_media_chapter_created_at_idx").on(table.chapterId, table.createdAt)
  ]
);

export const revisionNotes = pgTable(
  "revision_notes",
  {
    id: serial("id").primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    keyFormulas: jsonb("key_formulas").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    keyDefinitions: jsonb("key_definitions")
      .$type<Array<{ term: string; definition: string }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    commonMistakes: text("common_mistakes"),
    examTips: text("exam_tips")
  },
  (table) => [uniqueIndex("revision_notes_chapter_id_idx").on(table.chapterId)]
);

export const exercises = pgTable(
  "exercises",
  {
    id: serial("id").primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    exerciseNumber: text("exercise_number").notNull(),
    question: text("question").notNull(),
    solution: text("solution").notNull(),
    difficulty: difficultyEnum("difficulty").notNull().default("medium"),
    type: exerciseTypeEnum("type").notNull().default("short"),
    sourceId: uuid("source_id").references(() => contentSources.id, { onDelete: "set null" }),
    problemMarkdown: text("problem_markdown"),
    solutionCode: text("solution_code"),
    visualizationHtml: text("visualization_html"),
    blanksAnswer: jsonb("blanks_answer").$type<string[]>(),
    statements: jsonb("statements").$type<Array<{ text: string; blanksAnswer: string[] }>>()
  },
  (table) => [uniqueIndex("exercises_chapter_exercise_number_idx").on(table.chapterId, table.exerciseNumber)]
);

export const flashcards = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id")
    .notNull()
    .references(() => chapters.id, { onDelete: "cascade" }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  orderIndex: integer("order_index").notNull()
});

export const flashcardReviews = pgTable(
  "flashcard_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cardId: integer("card_id")
      .notNull()
      .references(() => flashcards.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    intervalDays: integer("interval_days").notNull().default(0),
    easeFactor: real("ease_factor").notNull().default(2.5),
    repetitions: integer("repetitions").notNull().default(0),
    nextReviewDate: timestamp("next_review_date", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("flashcard_reviews_card_user_idx").on(table.cardId, table.userId),
    index("flashcard_reviews_user_next_review_idx").on(table.userId, table.nextReviewDate)
  ]
);

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id")
    .notNull()
    .references(() => chapters.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  totalMarks: integer("total_marks").notNull(),
  type: quizTypeEnum("type").notNull().default("chapter_quiz")
});

export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  chapterId: integer("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
  question: text("question").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctOption: answerOptionEnum("correct_option").notNull(),
  explanation: text("explanation"),
  marks: integer("marks").notNull().default(1)
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  quizId: integer("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  type: quizTypeEnum("type").notNull().default("chapter_quiz"),
  answers: jsonb("answers").$type<Record<string, string>>().notNull(),
  score: integer("score").notNull(),
  totalMarks: integer("total_marks").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
}, (table) => [
  index("quiz_attempts_quiz_id_idx").on(table.quizId),
  index("quiz_attempts_user_completed_idx").on(table.userId, desc(table.completedAt))
]);

export const quizDuelChallenges = pgTable("quiz_duel_challenges", {
  id: uuid("id").defaultRandom().primaryKey(),
  quizId: integer("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  challengerUserId: text("challenger_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  challengerAttemptId: uuid("challenger_attempt_id")
    .notNull()
    .references(() => quizAttempts.id, { onDelete: "cascade" }),
  recipientUserId: text("recipient_user_id").references(() => users.id, { onDelete: "set null" }),
  recipientAttemptId: uuid("recipient_attempt_id").references(() => quizAttempts.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
}, (table) => [
  index("quiz_duel_challenges_quiz_id_idx").on(table.quizId),
  index("quiz_duel_challenges_challenger_user_idx").on(table.challengerUserId),
  uniqueIndex("quiz_duel_challenges_recipient_attempt_unique").on(table.recipientAttemptId)
]);

export const aiChatSessions = pgTable("ai_chat_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  chapterId: integer("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
});

export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => aiChatSessions.id, { onDelete: "cascade" }),
  role: aiMessageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
});

export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => aiChatSessions.id, { onDelete: "cascade" }),
  modelTier: text("model_tier").notNull().default("mistral-small"),
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").notNull(),
  completionTokens: integer("completion_tokens").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
});

export const forumThreads = pgTable(
  "forum_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    chapterId: integer("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    isPinned: boolean("is_pinned").notNull().default(false),
    isSolved: boolean("is_solved").notNull().default(false),
    views: integer("views").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [
    index("forum_threads_search_idx").using(
      "gin",
      sql`to_tsvector('english', coalesce(${table.title}, '') || ' ' || coalesce(${table.body}, ''))`
    ),
    index("forum_threads_user_id_idx").on(table.userId, desc(table.createdAt))
  ]
);

export const forumReplies = pgTable("forum_replies", {
  id: uuid("id").defaultRandom().primaryKey(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => forumThreads.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentReplyId: uuid("parent_reply_id").references((): AnyPgColumn => forumReplies.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  isAcceptedAnswer: boolean("is_accepted_answer").notNull().default(false),
  upvotes: integer("upvotes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
}, (table) => [
  index("forum_replies_thread_id_idx").on(table.threadId)
]);

export const forumReplyVotes = pgTable(
  "forum_reply_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    replyId: uuid("reply_id")
      .notNull()
      .references(() => forumReplies.id, { onDelete: "cascade" }),
    voteType: voteTypeEnum("vote_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [uniqueIndex("forum_reply_votes_user_reply_idx").on(table.userId, table.replyId)]
);

export const moderationFlags = pgTable(
  "moderation_flags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    targetType: moderationTargetTypeEnum("target_type").notNull(),
    targetId: text("target_id").notNull(),
    targetLabel: text("target_label").notNull(),
    reason: text("reason").notNull(),
    status: moderationStatusEnum("status").notNull().default("open"),
    resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    resolutionNote: text("resolution_note")
  },
  (table) => [index("moderation_flags_status_target_type_created_at_idx").on(table.status, table.targetType, table.createdAt)]
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scope: adminAuditScopeEnum("scope").notNull(),
    action: text("action").notNull(),
    target: text("target").notNull(),
    status: adminAuditStatusEnum("status").notNull(),
    message: text("message").notNull(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorName: text("actor_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [index("admin_audit_logs_scope_created_at_idx").on(table.scope, table.createdAt)]
);

export const adminNotifications = pgTable(
  "admin_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    audience: notificationAudienceEnum("audience").notNull(),
    status: notificationStatusEnum("status").notNull().default("sent"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [index("admin_notifications_created_at_idx").on(table.createdAt)]
);

export const adminSettings = pgTable(
  "admin_settings",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    description: text("description").notNull(),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [index("admin_settings_updated_at_idx").on(table.updatedAt)]
);

export const userProgress = pgTable(
  "user_progress",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    visitedAt: timestamp("visited_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    summaryRead: boolean("summary_read").notNull().default(false),
    subpartsReadCount: integer("subparts_read_count").notNull().default(0),
    exercisesViewed: integer("exercises_viewed").notNull().default(0),
    flashcardsCompleted: boolean("flashcards_completed").notNull().default(false),
    quizBestScore: integer("quiz_best_score").notNull().default(0),
    quizAttemptsCount: integer("quiz_attempts_count").notNull().default(0)
  },
  (table) => [
    uniqueIndex("user_progress_user_chapter_idx").on(table.userId, table.chapterId),
    index("user_progress_user_visited_idx").on(table.userId, desc(table.visitedAt))
  ]
);

export const userProgressSubparts = pgTable(
  "user_progress_subparts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    subpartId: integer("subpart_id")
      .notNull()
      .references(() => chapterSubparts.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("user_progress_subparts_user_subpart_idx").on(table.userId, table.subpartId),
    index("user_progress_subparts_user_chapter_idx").on(table.userId, table.chapterId),
    index("user_progress_subparts_subpart_idx").on(table.subpartId)
  ]
);

export const activityEventTypeEnum = pgEnum("activity_event_type", [
  "chapter_visit",
  "summary_read",
  "subpart_read",
  "exercise_view",
  "flashcard_complete",
  "quiz_submit"
]);

export const userActivityLog = pgTable(
  "user_activity_log",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: activityEventTypeEnum("event_type").notNull(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [
    index("user_activity_log_user_occurred_idx").on(table.userId, desc(table.occurredAt)),
    index("user_activity_log_user_date_idx").on(table.userId)
  ]
);

export const mockExams = pgTable("mock_exams", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  grade: gradeEnum("grade").notNull(),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  quizId: integer("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  year: integer("year").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  totalMarks: integer("total_marks").notNull(),
  paperContent: text("paper_content"),
  solutionContent: text("solution_content")
});

export const examAnalysis = pgTable(
  "exam_analysis",
  {
    id: serial("id").primaryKey(),
    boardId: integer("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    occurrenceCount: integer("occurrence_count").notNull().default(0),
    avgMarks: real("avg_marks").notNull().default(0),
    lastSeenYear: integer("last_seen_year")
  },
  (table) => [
    uniqueIndex("exam_analysis_board_subject_chapter_idx").on(table.boardId, table.subjectId, table.chapterId),
    index("exam_analysis_board_subject_idx").on(table.boardId, table.subjectId),
    index("exam_analysis_chapter_idx").on(table.chapterId)
  ]
);

export const aiContext = pgTable("ai_context", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  weakTopics: jsonb("weak_topics").$type<string[]>().notNull().default([]),
  strongTopics: jsonb("strong_topics").$type<string[]>().notNull().default([]),
  preferredExplanationStyle: text("preferred_explanation_style").notNull().default("balanced"),
  lastConceptsDiscussed: jsonb("last_concepts_discussed").$type<string[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
});

export const aiConversationEvents = pgTable(
  "ai_conversation_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => aiChatSessions.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [
    index("ai_conversation_events_session_created_idx").on(table.sessionId, desc(table.createdAt)),
    index("ai_conversation_events_event_type_created_idx").on(table.eventType, desc(table.createdAt))
  ]
);

export const formulas = pgTable(
  "formulas",
  {
    id: serial("id").primaryKey(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    formulaLatex: text("formula_latex").notNull(),
    description: text("description").notNull(),
    variables: jsonb("variables").$type<Array<{ symbol: string; meaning: string }>>().notNull().default([]),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [
    index("formulas_subject_chapter_idx").on(table.subjectId, table.chapterId),
    index("formulas_search_idx").using(
      "gin",
      sql`to_tsvector('english', coalesce(${table.name}, '') || ' ' || coalesce(${table.description}, ''))`
    )
  ]
);

export const userDailyMomentumGoals = pgTable(
  "user_daily_momentum_goals",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dateKey: text("date_key").notNull(),
    focusType: text("focus_type").notNull(),
    chapterId: integer("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
    xpAwarded: integer("xp_awarded").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("user_daily_momentum_goals_user_date_idx").on(table.userId, table.dateKey),
    index("user_daily_momentum_goals_user_completed_idx").on(table.userId, desc(table.completedAt))
  ]
);

export const streakWagers = pgTable(
  "streak_wagers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    bonusXp: integer("bonus_xp").notNull(),
    protectedDate: text("protected_date").notNull(),
    status: streakWagerStatusEnum("status").notNull().default("active"),
    completedGoal: boolean("completed_goal"),
    placedAt: timestamp("placed_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    settledAt: timestamp("settled_at", { withTimezone: true, mode: "date" }),
    recoveredAt: timestamp("recovered_at", { withTimezone: true, mode: "date" })
  },
  (table) => [
    uniqueIndex("streak_wagers_user_protected_date_idx").on(table.userId, table.protectedDate),
    index("streak_wagers_user_status_idx").on(table.userId, table.status, desc(table.placedAt))
  ]
);

export const userStarredFormulas = pgTable(
  "user_starred_formulas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    formulaId: integer("formula_id")
      .notNull()
      .references(() => formulas.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [uniqueIndex("user_starred_formulas_user_formula_idx").on(table.userId, table.formulaId)]
);

export const formulaAccessEvents = pgTable(
  "formula_access_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    formulaId: integer("formula_id")
      .notNull()
      .references(() => formulas.id, { onDelete: "cascade" }),
    accessedAt: timestamp("accessed_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [
    index("formula_access_events_user_accessed_idx").on(table.userId, desc(table.accessedAt)),
    index("formula_access_events_formula_idx").on(table.formulaId)
  ]
);

export const studentNotes = pgTable(
  "student_notes",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    chapterId: integer("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
    tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (table) => [
    index("student_notes_user_created_idx").on(table.userId, desc(table.createdAt)),
    index("student_notes_user_subject_idx").on(table.userId, table.subjectId),
    index("student_notes_user_chapter_idx").on(table.userId, table.chapterId),
    index("student_notes_search_idx").using(
      "gin",
      sql`to_tsvector('english', coalesce(${table.title}, '') || ' ' || coalesce(${table.content}, ''))`
    )
  ]
);

export const institutes = pgTable("institutes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull()
});
