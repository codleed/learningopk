import { sql } from "drizzle-orm";

export const CLEAR_TABLES = [
  "study_group_activities",
  "study_group_members",
  "study_groups",
  "forum_reply_votes",
  "forum_replies",
  "forum_threads",
  "ai_conversation_events",
  "ai_context",
  "ai_usage_logs",
  "ai_messages",
  "ai_chat_sessions",
  "formula_access_events",
  "user_starred_formulas",
  "formulas",
  "streak_wagers",
  "quiz_duel_challenges",
  "quiz_attempts",
  "quiz_questions",
  "exam_analysis",
  "mock_exams",
  "quizzes",
  "flashcard_reviews",
  "flashcards",
  "exercises",
  "revision_notes",
  "chapter_summary_media",
  "chapter_title_aliases",
  "chapter_summary_links",
  "chapter_subparts",
  "user_daily_momentum_goals",
  "user_progress_subparts",
  "user_progress",
  "admin_notifications",
  "admin_settings",
  "moderation_warnings",
  "moderation_flags",
  "institutes",
  "chapters",
  "content_sources",
  "subjects",
  "board_classes",
  "boards",
  "admin_audit_logs",
  "account",
  "session",
  "verification",
  "user",
] as const;

export function buildClearDatabaseSql(): string {
  const tableList = CLEAR_TABLES.map((tableName) => `'${tableName}'`).join(",\n      ");

  return `DO $$
DECLARE
  table_list text;
BEGIN
  SELECT string_agg(format('%I', tables.tablename), ', ')
    INTO table_list
  FROM pg_tables AS tables
  WHERE tables.schemaname = 'public'
    AND tables.tablename = ANY(ARRAY[
      ${tableList}
    ]);

  IF table_list IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY CASCADE';
  END IF;
END $$;`;
}

type SqlStatement = ReturnType<typeof sql.raw>;

type ClearDatabaseExecutor = {
  execute: (statement: SqlStatement) => Promise<unknown>;
};

export async function clearDatabase(database: ClearDatabaseExecutor): Promise<void> {
  await database.execute(sql.raw(buildClearDatabaseSql()));
}
