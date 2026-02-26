CREATE TYPE "public"."notification_audience" AS ENUM('all', 'students', 'admins');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('sent');--> statement-breakpoint
ALTER TYPE "public"."admin_audit_scope" ADD VALUE 'notifications';--> statement-breakpoint
ALTER TYPE "public"."admin_audit_scope" ADD VALUE 'settings';--> statement-breakpoint
CREATE TABLE "admin_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"audience" "notification_audience" NOT NULL,
	"status" "notification_status" DEFAULT 'sent' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_notifications_created_at_idx" ON "admin_notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_settings_updated_at_idx" ON "admin_settings" USING btree ("updated_at");