import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["student", "admin"]);
export const gradeEnum = pgEnum("grade", ["9", "10"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const exerciseTypeEnum = pgEnum("exercise_type", ["mcq", "short", "long", "numerical"]);
export const quizTypeEnum = pgEnum("quiz_type", ["chapter_quiz", "mock_exam"]);
export const answerOptionEnum = pgEnum("answer_option", ["a", "b", "c", "d"]);
export const aiMessageRoleEnum = pgEnum("ai_message_role", ["user", "assistant"]);
export const voteTypeEnum = pgEnum("vote_type", ["upvote", "downvote"]);
export const adminAuditScopeEnum = pgEnum("admin_audit_scope", ["content", "forum"]);
export const adminAuditStatusEnum = pgEnum("admin_audit_status", ["success", "failed"]);

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  class: text("student_class"),
  degree: text("degree"),
  board: text("board"),
  role: userRoleEnum("role").notNull().default("student"),
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

export const subjects = pgTable(
  "subjects",
  {
    id: serial("id").primaryKey(),
    boardId: integer("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    grade: gradeEnum("grade").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    icon: text("icon"),
    description: text("description")
  },
  (table) => [uniqueIndex("subjects_board_grade_slug_idx").on(table.boardId, table.grade, table.slug)]
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
    summary: text("summary").notNull(),
    isPublished: boolean("is_published").notNull().default(false),
    sourceId: uuid("source_id").references(() => contentSources.id, { onDelete: "set null" })
  },
  (table) => [uniqueIndex("chapters_subject_slug_idx").on(table.subjectId, table.slug)]
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
    sourceId: uuid("source_id").references(() => contentSources.id, { onDelete: "set null" })
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
  question: text("question").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctOption: answerOptionEnum("correct_option").notNull(),
  explanation: text("explanation").notNull(),
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
  answers: jsonb("answers").$type<Record<string, string>>().notNull(),
  score: integer("score").notNull(),
  totalMarks: integer("total_marks").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
});

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
    )
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
});

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
    exercisesViewed: integer("exercises_viewed").notNull().default(0),
    flashcardsCompleted: boolean("flashcards_completed").notNull().default(false),
    quizBestScore: integer("quiz_best_score").notNull().default(0),
    quizAttemptsCount: integer("quiz_attempts_count").notNull().default(0)
  },
  (table) => [uniqueIndex("user_progress_user_chapter_idx").on(table.userId, table.chapterId)]
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
  totalMarks: integer("total_marks").notNull()
});
