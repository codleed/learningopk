CREATE TABLE "chapter_summary_media" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chapter_id" integer NOT NULL,
  "object_key" text NOT NULL,
  "object_url" text NOT NULL,
  "mime_type" text NOT NULL,
  "file_size" integer NOT NULL,
  "uploaded_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chapter_summary_media"
ADD CONSTRAINT "chapter_summary_media_chapter_id_chapters_id_fk"
FOREIGN KEY ("chapter_id")
REFERENCES "public"."chapters"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chapter_summary_media"
ADD CONSTRAINT "chapter_summary_media_uploaded_by_user_id_fk"
FOREIGN KEY ("uploaded_by")
REFERENCES "public"."user"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_summary_media_object_key_idx" ON "chapter_summary_media" USING btree ("object_key");
--> statement-breakpoint
CREATE INDEX "chapter_summary_media_chapter_created_at_idx" ON "chapter_summary_media" USING btree ("chapter_id","created_at");
