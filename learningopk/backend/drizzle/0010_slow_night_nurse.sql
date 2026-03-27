CREATE TABLE "board_classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"board_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "chapter_title_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"alias_title" text NOT NULL,
	"normalized_alias" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "grade" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "board_class_id" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "xp" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "level" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "streak_freeze_used_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "board_classes" ADD CONSTRAINT "board_classes_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_summary_links" ADD CONSTRAINT "chapter_summary_links_source_chapter_id_chapters_id_fk" FOREIGN KEY ("source_chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_summary_links" ADD CONSTRAINT "chapter_summary_links_target_chapter_id_chapters_id_fk" FOREIGN KEY ("target_chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_summary_media" ADD CONSTRAINT "chapter_summary_media_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_summary_media" ADD CONSTRAINT "chapter_summary_media_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_title_aliases" ADD CONSTRAINT "chapter_title_aliases_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "board_classes_board_slug_idx" ON "board_classes" USING btree ("board_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_summary_links_source_normalized_idx" ON "chapter_summary_links" USING btree ("source_chapter_id","normalized_target");--> statement-breakpoint
CREATE INDEX "chapter_summary_links_source_idx" ON "chapter_summary_links" USING btree ("source_chapter_id");--> statement-breakpoint
CREATE INDEX "chapter_summary_links_target_idx" ON "chapter_summary_links" USING btree ("target_chapter_id");--> statement-breakpoint
CREATE INDEX "chapter_summary_links_normalized_idx" ON "chapter_summary_links" USING btree ("normalized_target");--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_summary_media_object_key_idx" ON "chapter_summary_media" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "chapter_summary_media_chapter_created_at_idx" ON "chapter_summary_media" USING btree ("chapter_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_title_aliases_chapter_normalized_idx" ON "chapter_title_aliases" USING btree ("chapter_id","normalized_alias");--> statement-breakpoint
CREATE INDEX "chapter_title_aliases_normalized_idx" ON "chapter_title_aliases" USING btree ("normalized_alias");--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_board_class_id_board_classes_id_fk" FOREIGN KEY ("board_class_id") REFERENCES "public"."board_classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chapters_subject_chapter_number_idx" ON "chapters" USING btree ("subject_id","chapter_number");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_board_class_slug_idx" ON "subjects" USING btree ("board_class_id","slug");