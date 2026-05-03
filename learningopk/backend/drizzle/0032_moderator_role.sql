-- Migration: Add moderator role, moderation_warnings, and soft-delete
ALTER TYPE "user_role" ADD VALUE 'moderator';

CREATE TABLE "moderation_warnings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "warned_by" text REFERENCES "user"("id") ON DELETE SET NULL,
  "reason" text NOT NULL,
  "acknowledged" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "moderation_warnings_user_id_idx" ON "moderation_warnings" ("user_id", "created_at" DESC);

ALTER TABLE "forum_threads" ADD COLUMN "is_deleted" boolean NOT NULL DEFAULT false;
ALTER TABLE "forum_replies" ADD COLUMN "is_deleted" boolean NOT NULL DEFAULT false;
