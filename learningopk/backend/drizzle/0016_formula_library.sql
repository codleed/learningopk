CREATE TABLE "formulas" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_id" integer NOT NULL,
	"chapter_id" integer NOT NULL,
	"name" text NOT NULL,
	"formula_latex" text NOT NULL,
	"description" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_starred_formulas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"formula_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "formula_access_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"formula_id" integer NOT NULL,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "formulas" ADD CONSTRAINT "formulas_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "formulas" ADD CONSTRAINT "formulas_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_starred_formulas" ADD CONSTRAINT "user_starred_formulas_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_starred_formulas" ADD CONSTRAINT "user_starred_formulas_formula_id_formulas_id_fk" FOREIGN KEY ("formula_id") REFERENCES "public"."formulas"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "formula_access_events" ADD CONSTRAINT "formula_access_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "formula_access_events" ADD CONSTRAINT "formula_access_events_formula_id_formulas_id_fk" FOREIGN KEY ("formula_id") REFERENCES "public"."formulas"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "formulas_subject_chapter_idx" ON "formulas" USING btree ("subject_id","chapter_id");
--> statement-breakpoint
CREATE INDEX "formulas_search_idx" ON "formulas" USING gin (to_tsvector('english', coalesce("name", '') || ' ' || coalesce("description", '')));
--> statement-breakpoint
CREATE UNIQUE INDEX "user_starred_formulas_user_formula_idx" ON "user_starred_formulas" USING btree ("user_id","formula_id");
--> statement-breakpoint
CREATE INDEX "formula_access_events_user_accessed_idx" ON "formula_access_events" USING btree ("user_id","accessed_at" desc);
--> statement-breakpoint
CREATE INDEX "formula_access_events_formula_idx" ON "formula_access_events" USING btree ("formula_id");
