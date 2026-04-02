CREATE TABLE "institutes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "grade" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "xp" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "level" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "streak_freeze_used_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chapter_summary_links" ADD CONSTRAINT "chapter_summary_links_source_chapter_id_chapters_id_fk" FOREIGN KEY ("source_chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_summary_links" ADD CONSTRAINT "chapter_summary_links_target_chapter_id_chapters_id_fk" FOREIGN KEY ("target_chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_summary_media" ADD CONSTRAINT "chapter_summary_media_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_summary_media" ADD CONSTRAINT "chapter_summary_media_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_title_aliases" ADD CONSTRAINT "chapter_title_aliases_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_summary_links_source_normalized_idx" ON "chapter_summary_links" USING btree ("source_chapter_id","normalized_target");--> statement-breakpoint
CREATE INDEX "chapter_summary_links_source_idx" ON "chapter_summary_links" USING btree ("source_chapter_id");--> statement-breakpoint
CREATE INDEX "chapter_summary_links_target_idx" ON "chapter_summary_links" USING btree ("target_chapter_id");--> statement-breakpoint
CREATE INDEX "chapter_summary_links_normalized_idx" ON "chapter_summary_links" USING btree ("normalized_target");--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_summary_media_object_key_idx" ON "chapter_summary_media" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "chapter_summary_media_chapter_created_at_idx" ON "chapter_summary_media" USING btree ("chapter_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_title_aliases_chapter_normalized_idx" ON "chapter_title_aliases" USING btree ("chapter_id","normalized_alias");--> statement-breakpoint
CREATE INDEX "chapter_title_aliases_normalized_idx" ON "chapter_title_aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "chapters_subject_chapter_number_idx" ON "chapters" USING btree ("subject_id","chapter_number");
