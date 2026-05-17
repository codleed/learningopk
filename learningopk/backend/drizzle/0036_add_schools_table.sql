CREATE TABLE IF NOT EXISTS "schools" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "board" text NOT NULL,
  "invite_code" text NOT NULL,
  "admin_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "student_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "schools_slug_unique" ON "schools" USING btree ("slug");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "schools_invite_code_unique" ON "schools" USING btree ("invite_code");
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "school_id" integer REFERENCES "schools"("id") ON DELETE SET NULL;
