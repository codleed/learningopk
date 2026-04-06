CREATE TYPE "public"."study_group_activity_type" AS ENUM('chapter_completed', 'quiz_score_beaten');

CREATE TABLE "study_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "study_group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "study_group_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"actor_user_id" text NOT NULL,
	"recipient_user_id" text,
	"activity_type" "study_group_activity_type" NOT NULL,
	"chapter_id" integer,
	"quiz_attempt_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "study_groups" ADD CONSTRAINT "study_groups_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "study_group_members" ADD CONSTRAINT "study_group_members_group_id_study_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."study_groups"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "study_group_members" ADD CONSTRAINT "study_group_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "study_group_activities" ADD CONSTRAINT "study_group_activities_group_id_study_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."study_groups"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "study_group_activities" ADD CONSTRAINT "study_group_activities_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "study_group_activities" ADD CONSTRAINT "study_group_activities_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "study_group_activities" ADD CONSTRAINT "study_group_activities_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "study_group_activities" ADD CONSTRAINT "study_group_activities_quiz_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("quiz_attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX "study_groups_created_by_idx" ON "study_groups" USING btree ("created_by","created_at" desc);
CREATE UNIQUE INDEX "study_group_members_group_user_idx" ON "study_group_members" USING btree ("group_id","user_id");
CREATE INDEX "study_group_members_user_joined_idx" ON "study_group_members" USING btree ("user_id","joined_at" desc);
CREATE INDEX "study_group_activities_group_created_idx" ON "study_group_activities" USING btree ("group_id","created_at" desc);
CREATE INDEX "study_group_activities_recipient_created_idx" ON "study_group_activities" USING btree ("recipient_user_id","created_at" desc);
