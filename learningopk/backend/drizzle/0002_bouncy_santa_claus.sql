CREATE TYPE "public"."admin_audit_scope" AS ENUM('content', 'forum');--> statement-breakpoint
CREATE TYPE "public"."admin_audit_status" AS ENUM('success', 'failed');--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" "admin_audit_scope" NOT NULL,
	"action" text NOT NULL,
	"target" text NOT NULL,
	"status" "admin_audit_status" NOT NULL,
	"message" text NOT NULL,
	"actor_id" text,
	"actor_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_scope_created_at_idx" ON "admin_audit_logs" USING btree ("scope","created_at");