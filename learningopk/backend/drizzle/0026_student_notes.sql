CREATE TABLE IF NOT EXISTS "student_notes" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "subject_id" integer REFERENCES "subjects"("id") ON DELETE SET NULL,
  "chapter_id" integer REFERENCES "chapters"("id") ON DELETE SET NULL,
  "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_notes_user_created_idx" ON "student_notes" USING btree ("user_id","created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_notes_user_subject_idx" ON "student_notes" USING btree ("user_id","subject_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_notes_user_chapter_idx" ON "student_notes" USING btree ("user_id","chapter_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_notes_search_idx" ON "student_notes" USING gin (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("content", '')));
