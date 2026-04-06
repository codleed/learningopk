CREATE TABLE "exam_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"board_id" integer NOT NULL,
	"subject_id" integer NOT NULL,
	"chapter_id" integer NOT NULL,
	"occurrence_count" integer DEFAULT 0 NOT NULL,
	"avg_marks" real DEFAULT 0 NOT NULL,
	"last_seen_year" integer
);

ALTER TABLE "exam_analysis" ADD CONSTRAINT "exam_analysis_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "exam_analysis" ADD CONSTRAINT "exam_analysis_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "exam_analysis" ADD CONSTRAINT "exam_analysis_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "exam_analysis_board_subject_chapter_idx" ON "exam_analysis" USING btree ("board_id","subject_id","chapter_id");
CREATE INDEX "exam_analysis_board_subject_idx" ON "exam_analysis" USING btree ("board_id","subject_id");
CREATE INDEX "exam_analysis_chapter_idx" ON "exam_analysis" USING btree ("chapter_id");
