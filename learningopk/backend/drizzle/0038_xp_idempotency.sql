-- Idempotency windows for XP-awarding progress events.
-- Each column records the most recent award timestamp for a given event type
-- scoped to (userId, chapterId). The XP service consults these to avoid
-- double-awarding when clients replay progress events.
ALTER TABLE "user_progress"
  ADD COLUMN IF NOT EXISTS "xp_awarded_chapter_visit_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "xp_awarded_summary_read_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "xp_awarded_exercise_view_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "xp_awarded_exercise_view_window_started_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "xp_awarded_flashcard_complete_at" timestamptz;
