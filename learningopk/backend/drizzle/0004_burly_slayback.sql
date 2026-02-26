CREATE TYPE "public"."moderation_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."moderation_target_type" AS ENUM('thread', 'reply', 'chapter');--> statement-breakpoint
ALTER TYPE "public"."admin_audit_scope" ADD VALUE 'moderation';--> statement-breakpoint
CREATE TABLE "moderation_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"target_type" "moderation_target_type" NOT NULL,
	"target_id" text NOT NULL,
	"target_label" text NOT NULL,
	"reason" text NOT NULL,
	"status" "moderation_status" DEFAULT 'open' NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	"resolution_note" text
);
--> statement-breakpoint
ALTER TABLE "moderation_flags" ADD CONSTRAINT "moderation_flags_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_flags_status_target_type_created_at_idx" ON "moderation_flags" USING btree ("status","target_type","created_at");