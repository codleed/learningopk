ALTER TABLE "quiz_attempts" ADD COLUMN "type" "quiz_type" DEFAULT 'chapter_quiz' NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD COLUMN "chapter_id" integer;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;