CREATE TABLE "board_classes" (
  "id" serial PRIMARY KEY NOT NULL,
  "board_id" integer NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "board_classes"
ADD CONSTRAINT "board_classes_board_id_boards_id_fk"
FOREIGN KEY ("board_id")
REFERENCES "public"."boards"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "board_classes_board_slug_idx" ON "board_classes" USING btree ("board_id","slug");
--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "board_class_id" integer;
--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "grade" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "subjects"
ADD CONSTRAINT "subjects_board_class_id_board_classes_id_fk"
FOREIGN KEY ("board_class_id")
REFERENCES "public"."board_classes"("id")
ON DELETE set null
ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "board_classes" ("board_id", "name", "slug")
SELECT DISTINCT
  s."board_id",
  CASE
    WHEN s."grade" = '9' THEN '9th'
    WHEN s."grade" = '10' THEN '10th'
    ELSE COALESCE(s."grade"::text, 'class')
  END AS "name",
  COALESCE(s."grade"::text, 'class') AS "slug"
FROM "subjects" s;
--> statement-breakpoint
UPDATE "subjects" s
SET "board_class_id" = bc."id"
FROM "board_classes" bc
WHERE bc."board_id" = s."board_id"
  AND bc."slug" = COALESCE(s."grade"::text, 'class');
--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_board_class_slug_idx" ON "subjects" USING btree ("board_class_id","slug");
--> statement-breakpoint
CREATE UNIQUE INDEX "chapters_subject_chapter_number_idx" ON "chapters" USING btree ("subject_id","chapter_number");
