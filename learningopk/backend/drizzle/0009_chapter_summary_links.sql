CREATE TABLE "chapter_summary_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_chapter_id" integer NOT NULL,
  "target_chapter_id" integer,
  "target_title" text NOT NULL,
  "normalized_target" text NOT NULL,
  "is_resolved" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chapter_summary_links"
ADD CONSTRAINT "chapter_summary_links_source_chapter_id_chapters_id_fk"
FOREIGN KEY ("source_chapter_id")
REFERENCES "public"."chapters"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chapter_summary_links"
ADD CONSTRAINT "chapter_summary_links_target_chapter_id_chapters_id_fk"
FOREIGN KEY ("target_chapter_id")
REFERENCES "public"."chapters"("id")
ON DELETE set null
ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_summary_links_source_normalized_idx" ON "chapter_summary_links" USING btree ("source_chapter_id","normalized_target");
--> statement-breakpoint
CREATE INDEX "chapter_summary_links_source_idx" ON "chapter_summary_links" USING btree ("source_chapter_id");
--> statement-breakpoint
CREATE INDEX "chapter_summary_links_target_idx" ON "chapter_summary_links" USING btree ("target_chapter_id");
--> statement-breakpoint
CREATE INDEX "chapter_summary_links_normalized_idx" ON "chapter_summary_links" USING btree ("normalized_target");
--> statement-breakpoint
CREATE TABLE "chapter_title_aliases" (
  "id" serial PRIMARY KEY NOT NULL,
  "chapter_id" integer NOT NULL,
  "alias_title" text NOT NULL,
  "normalized_alias" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chapter_title_aliases"
ADD CONSTRAINT "chapter_title_aliases_chapter_id_chapters_id_fk"
FOREIGN KEY ("chapter_id")
REFERENCES "public"."chapters"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_title_aliases_chapter_normalized_idx" ON "chapter_title_aliases" USING btree ("chapter_id","normalized_alias");
--> statement-breakpoint
CREATE INDEX "chapter_title_aliases_normalized_idx" ON "chapter_title_aliases" USING btree ("normalized_alias");
--> statement-breakpoint
INSERT INTO "chapter_title_aliases" ("chapter_id", "alias_title", "normalized_alias")
SELECT
  c."id",
  c."title",
  lower(trim(regexp_replace(c."title", '\s+', ' ', 'g')))
FROM "chapters" c
ON CONFLICT ("chapter_id", "normalized_alias") DO NOTHING;
