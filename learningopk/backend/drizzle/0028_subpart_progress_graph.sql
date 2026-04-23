ALTER TABLE "chapters" ALTER COLUMN "summary" DROP NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chapter_subparts" (
  "id" serial PRIMARY KEY NOT NULL,
  "chapter_id" integer NOT NULL,
  "order_index" integer NOT NULL,
  "heading" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'chapter_subparts'
      AND column_name = 'title'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'chapter_subparts'
      AND column_name = 'heading'
  ) THEN
    ALTER TABLE "chapter_subparts" RENAME COLUMN "title" TO "heading";
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chapter_subparts_chapter_id_chapters_id_fk'
  ) THEN
    ALTER TABLE "chapter_subparts"
      ADD CONSTRAINT "chapter_subparts_chapter_id_chapters_id_fk"
      FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chapter_subparts_chapter_order_idx" ON "chapter_subparts" USING btree ("chapter_id", "order_index");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chapter_subparts_chapter_idx" ON "chapter_subparts" USING btree ("chapter_id");
--> statement-breakpoint
INSERT INTO "chapter_subparts" ("chapter_id", "order_index", "heading", "content")
SELECT c."id", 1, 'Chapter Summary', COALESCE(c."summary", '')
FROM "chapters" c
WHERE NOT EXISTS (
  SELECT 1
  FROM "chapter_subparts" cs
  WHERE cs."chapter_id" = c."id"
);
--> statement-breakpoint
ALTER TABLE "chapter_summary_links" ADD COLUMN IF NOT EXISTS "source_subpart_id" integer;
--> statement-breakpoint
ALTER TABLE "chapter_summary_links" ADD COLUMN IF NOT EXISTS "target_subpart_id" integer;
--> statement-breakpoint
UPDATE "chapter_summary_links" csl
SET "source_subpart_id" = src."subpart_id"
FROM (
  SELECT
    csl_inner."id" AS "link_id",
    (
      SELECT cs."id"
      FROM "chapter_subparts" cs
      WHERE cs."chapter_id" = csl_inner."source_chapter_id"
      ORDER BY cs."order_index" ASC, cs."id" ASC
      LIMIT 1
    ) AS "subpart_id"
  FROM "chapter_summary_links" csl_inner
) src
WHERE csl."id" = src."link_id"
  AND csl."source_subpart_id" IS NULL;
--> statement-breakpoint
UPDATE "chapter_summary_links" csl
SET "target_subpart_id" = tgt."subpart_id"
FROM (
  SELECT
    csl_inner."id" AS "link_id",
    (
      SELECT cs."id"
      FROM "chapter_subparts" cs
      WHERE cs."chapter_id" = csl_inner."target_chapter_id"
      ORDER BY cs."order_index" ASC, cs."id" ASC
      LIMIT 1
    ) AS "subpart_id"
  FROM "chapter_summary_links" csl_inner
  WHERE csl_inner."target_chapter_id" IS NOT NULL
) tgt
WHERE csl."id" = tgt."link_id"
  AND csl."target_subpart_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "chapter_summary_links" ALTER COLUMN "source_subpart_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "chapter_summary_links" DROP CONSTRAINT IF EXISTS "chapter_summary_links_source_chapter_id_chapters_id_fk";
--> statement-breakpoint
ALTER TABLE "chapter_summary_links" DROP CONSTRAINT IF EXISTS "chapter_summary_links_target_chapter_id_chapters_id_fk";
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chapter_summary_links_source_subpart_id_chapter_subparts_id_fk'
  ) THEN
    ALTER TABLE "chapter_summary_links"
      ADD CONSTRAINT "chapter_summary_links_source_subpart_id_chapter_subparts_id_fk"
      FOREIGN KEY ("source_subpart_id") REFERENCES "public"."chapter_subparts"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chapter_summary_links_target_subpart_id_chapter_subparts_id_fk'
  ) THEN
    ALTER TABLE "chapter_summary_links"
      ADD CONSTRAINT "chapter_summary_links_target_subpart_id_chapter_subparts_id_fk"
      FOREIGN KEY ("target_subpart_id") REFERENCES "public"."chapter_subparts"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DROP INDEX IF EXISTS "chapter_summary_links_source_normalized_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "chapter_summary_links_source_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "chapter_summary_links_target_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chapter_summary_links_source_subpart_normalized_idx" ON "chapter_summary_links" USING btree ("source_subpart_id", "normalized_target");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chapter_summary_links_source_subpart_idx" ON "chapter_summary_links" USING btree ("source_subpart_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chapter_summary_links_target_subpart_idx" ON "chapter_summary_links" USING btree ("target_subpart_id");
--> statement-breakpoint
ALTER TABLE "chapter_summary_links" DROP COLUMN IF EXISTS "source_chapter_id";
--> statement-breakpoint
ALTER TABLE "chapter_summary_links" DROP COLUMN IF EXISTS "target_chapter_id";
--> statement-breakpoint
ALTER TABLE "user_progress" ADD COLUMN IF NOT EXISTS "subparts_read_count" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_progress_subparts" (
  "user_id" text NOT NULL,
  "chapter_id" integer NOT NULL,
  "subpart_id" integer NOT NULL,
  "read_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_progress_subparts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "user_progress_subparts_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "user_progress_subparts_subpart_id_chapter_subparts_id_fk" FOREIGN KEY ("subpart_id") REFERENCES "public"."chapter_subparts"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_progress_subparts_user_subpart_idx" ON "user_progress_subparts" USING btree ("user_id", "subpart_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_progress_subparts_user_chapter_idx" ON "user_progress_subparts" USING btree ("user_id", "chapter_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_progress_subparts_subpart_idx" ON "user_progress_subparts" USING btree ("subpart_id");
--> statement-breakpoint
INSERT INTO "user_progress_subparts" ("user_id", "chapter_id", "subpart_id", "read_at")
SELECT up."user_id", up."chapter_id", cs."id", up."visited_at"
FROM "user_progress" up
INNER JOIN "chapter_subparts" cs
  ON cs."chapter_id" = up."chapter_id"
WHERE up."summary_read" = true
ON CONFLICT ("user_id", "subpart_id") DO NOTHING;
--> statement-breakpoint
UPDATE "user_progress" up
SET "subparts_read_count" = counts."read_count"
FROM (
  SELECT upi."id" AS "progress_id", COUNT(ups."subpart_id")::integer AS "read_count"
  FROM "user_progress" upi
  LEFT JOIN "user_progress_subparts" ups
    ON ups."user_id" = upi."user_id"
   AND ups."chapter_id" = upi."chapter_id"
  GROUP BY upi."id"
) counts
WHERE up."id" = counts."progress_id";
--> statement-breakpoint
UPDATE "user_progress" up
SET "summary_read" = (totals."total_count" > 0 AND up."subparts_read_count" >= totals."total_count")
FROM (
  SELECT cs."chapter_id", COUNT(*)::integer AS "total_count"
  FROM "chapter_subparts" cs
  GROUP BY cs."chapter_id"
) totals
WHERE up."chapter_id" = totals."chapter_id";
