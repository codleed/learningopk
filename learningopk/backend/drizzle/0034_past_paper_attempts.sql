CREATE TYPE "past_paper_attempt_status" AS ENUM ('in_progress', 'submitted', 'timed_out');
ALTER TYPE "activity_event_type" ADD VALUE 'past_paper_attempt';
ALTER TABLE "mock_exams" ADD COLUMN "published" boolean DEFAULT false NOT NULL;
ALTER TABLE "mock_exams" ADD COLUMN "description" text;
ALTER TABLE "exercises" ADD COLUMN "options" jsonb;
ALTER TABLE "exercises" ADD COLUMN "correct_option" text;
CREATE TABLE "past_paper_exercises" (
  "id" serial PRIMARY KEY,
  "mock_exam_id" integer NOT NULL REFERENCES "mock_exams"("id") ON DELETE CASCADE,
  "exercise_id" integer NOT NULL REFERENCES "exercises"("id") ON DELETE CASCADE,
  "order_index" integer NOT NULL,
  "marks" integer
);
CREATE UNIQUE INDEX "past_paper_exercises_mock_exam_exercise_idx" ON "past_paper_exercises" ("mock_exam_id", "exercise_id");
CREATE TABLE "past_paper_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "mock_exam_id" integer NOT NULL REFERENCES "mock_exams"("id") ON DELETE CASCADE,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "submitted_at" timestamp with time zone,
  "time_limit_seconds" integer NOT NULL,
  "status" "past_paper_attempt_status" DEFAULT 'in_progress' NOT NULL,
  "total_marks" integer,
  "score" integer,
  "percentage" real
);
CREATE TABLE "past_paper_attempt_answers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "attempt_id" uuid NOT NULL REFERENCES "past_paper_attempts"("id") ON DELETE CASCADE,
  "exercise_id" integer NOT NULL REFERENCES "exercises"("id") ON DELETE CASCADE,
  "answer" jsonb,
  "score" integer,
  "ai_feedback" text
);
CREATE UNIQUE INDEX "past_paper_attempt_answers_attempt_exercise_idx" ON "past_paper_attempt_answers" ("attempt_id", "exercise_id");
