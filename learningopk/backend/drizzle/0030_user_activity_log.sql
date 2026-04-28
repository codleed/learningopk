-- Create activity event type enum
DO $$ BEGIN
  CREATE TYPE "public"."activity_event_type" AS ENUM('chapter_visit', 'summary_read', 'subpart_read', 'exercise_view', 'flashcard_complete', 'quiz_submit');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_activity_log table
CREATE TABLE IF NOT EXISTS "user_activity_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "event_type" "activity_event_type" NOT NULL,
  "chapter_id" integer NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign keys
DO $$ BEGIN
  ALTER TABLE "user_activity_log" ADD CONSTRAINT "user_activity_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_activity_log" ADD CONSTRAINT "user_activity_log_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS "user_activity_log_user_occurred_idx" ON "user_activity_log" USING btree ("user_id","occurred_at" DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS "user_activity_log_user_date_idx" ON "user_activity_log" USING btree ("user_id");

-- Backfill from existing data:
-- 1. chapter_visit events from user_progress.visited_at
INSERT INTO "user_activity_log" ("user_id", "event_type", "chapter_id", "occurred_at")
SELECT "user_id", 'chapter_visit'::"activity_event_type", "chapter_id", "visited_at"
FROM "user_progress"
WHERE "visited_at" IS NOT NULL
ON CONFLICT DO NOTHING;

-- 2. subpart_read events from user_progress_subparts.read_at
INSERT INTO "user_activity_log" ("user_id", "event_type", "chapter_id", "occurred_at")
SELECT "user_id", 'subpart_read'::"activity_event_type", "chapter_id", "read_at"
FROM "user_progress_subparts"
ON CONFLICT DO NOTHING;

-- 3. quiz_submit events from quiz_attempts
INSERT INTO "user_activity_log" ("user_id", "event_type", "chapter_id", "occurred_at")
SELECT qa."user_id", 'quiz_submit'::"activity_event_type", q."chapter_id", qa."completed_at"
FROM "quiz_attempts" qa
INNER JOIN "quizzes" q ON qa."quiz_id" = q."id"
ON CONFLICT DO NOTHING;

-- 4. exercise_view events from user_progress (one event per exercise_viewed count)
INSERT INTO "user_activity_log" ("user_id", "event_type", "chapter_id", "occurred_at")
SELECT "user_id", 'exercise_view'::"activity_event_type", "chapter_id", "visited_at"
FROM "user_progress"
WHERE "exercises_viewed" > 0 AND "visited_at" IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. summary_read events from user_progress
INSERT INTO "user_activity_log" ("user_id", "event_type", "chapter_id", "occurred_at")
SELECT "user_id", 'summary_read'::"activity_event_type", "chapter_id", "visited_at"
FROM "user_progress"
WHERE "summary_read" = true AND "visited_at" IS NOT NULL
ON CONFLICT DO NOTHING;

-- 6. flashcard_complete events from user_progress
INSERT INTO "user_activity_log" ("user_id", "event_type", "chapter_id", "occurred_at")
SELECT "user_id", 'flashcard_complete'::"activity_event_type", "chapter_id", "visited_at"
FROM "user_progress"
WHERE "flashcards_completed" = true AND "visited_at" IS NOT NULL
ON CONFLICT DO NOTHING;
