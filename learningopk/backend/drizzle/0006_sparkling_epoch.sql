CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended');--> statement-breakpoint
ALTER TYPE "public"."admin_audit_scope" ADD VALUE 'users';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "status" "user_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "suspended_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "suspended_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_suspended_by_user_id_fk" FOREIGN KEY ("suspended_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;