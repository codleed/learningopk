CREATE TYPE "streak_wager_status" AS ENUM('active', 'won', 'lost');
--> statement-breakpoint
CREATE TABLE "streak_wagers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"bonus_xp" integer NOT NULL,
	"protected_date" text NOT NULL,
	"status" "streak_wager_status" DEFAULT 'active' NOT NULL,
	"completed_goal" boolean,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"settled_at" timestamp with time zone,
	"recovered_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "streak_wagers" ADD CONSTRAINT "streak_wagers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "streak_wagers_user_protected_date_idx" ON "streak_wagers" USING btree ("user_id","protected_date");
--> statement-breakpoint
CREATE INDEX "streak_wagers_user_status_idx" ON "streak_wagers" USING btree ("user_id","status","placed_at" desc);
