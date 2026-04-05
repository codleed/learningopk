import { sql } from "drizzle-orm";

export const CLEAR_TABLES = [
  "forum_reply_votes",
  "forum_replies",
  "forum_threads",
  "ai_usage_logs",
  "ai_messages",
  "ai_chat_sessions",
  "quiz_attempts",
  "quiz_questions",
  "mock_exams",
  "quizzes",
  "flashcards",
  "exercises",
  "chapter_summary_media",
  "user_daily_momentum_goals",
  "user_progress",
  "chapters",
  "content_sources",
  "subjects",
  "board_classes",
  "boards",
  "admin_audit_logs",
  "account",
  "session",
  "verification",
  "user"
] as const;

export function buildClearDatabaseSql(): string {
  const tableList = CLEAR_TABLES.map((tableName) => `"${tableName}"`).join(",\n    ");

  return `TRUNCATE TABLE
    ${tableList}
    RESTART IDENTITY CASCADE`;
}

type SqlStatement = ReturnType<typeof sql.raw>;

type ClearDatabaseExecutor = {
  execute: (statement: SqlStatement) => Promise<unknown>;
};

export async function clearDatabase(database: ClearDatabaseExecutor): Promise<void> {
  await database.execute(sql.raw(buildClearDatabaseSql()));
}
