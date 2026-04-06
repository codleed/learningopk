ALTER TABLE "subjects" ADD COLUMN "exam_date" timestamp with time zone;

CREATE TABLE "user_daily_momentum_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date_key" text NOT NULL,
	"focus_type" text NOT NULL,
	"chapter_id" integer,
	"xp_awarded" integer NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "user_daily_momentum_goals" ADD CONSTRAINT "user_daily_momentum_goals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_daily_momentum_goals" ADD CONSTRAINT "user_daily_momentum_goals_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;
CREATE UNIQUE INDEX "user_daily_momentum_goals_user_date_idx" ON "user_daily_momentum_goals" USING btree ("user_id","date_key");
CREATE INDEX "user_daily_momentum_goals_user_completed_idx" ON "user_daily_momentum_goals" USING btree ("user_id","completed_at" desc);
