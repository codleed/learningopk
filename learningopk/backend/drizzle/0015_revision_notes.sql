CREATE TABLE "revision_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"key_formulas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"key_definitions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"common_mistakes" text,
	"exam_tips" text
);
--> statement-breakpoint
ALTER TABLE "revision_notes" ADD CONSTRAINT "revision_notes_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "revision_notes_chapter_id_idx" ON "revision_notes" USING btree ("chapter_id");
