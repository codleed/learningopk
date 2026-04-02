ALTER TYPE "public"."exercise_type" ADD VALUE 'fill_in_blanks';--> statement-breakpoint
ALTER TABLE "quiz_questions" ALTER COLUMN "explanation" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "visualization_html" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "blanks_answer" jsonb;--> statement-breakpoint
CREATE INDEX "forum_replies_thread_id_idx" ON "forum_replies" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "forum_threads_user_id_idx" ON "forum_threads" USING btree ("user_id","created_at" desc);--> statement-breakpoint
CREATE INDEX "quiz_attempts_quiz_id_idx" ON "quiz_attempts" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_completed_idx" ON "quiz_attempts" USING btree ("user_id","completed_at" desc);--> statement-breakpoint
CREATE INDEX "user_progress_user_visited_idx" ON "user_progress" USING btree ("user_id","visited_at" desc);