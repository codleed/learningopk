CREATE TABLE "quiz_duel_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" integer NOT NULL,
	"challenger_user_id" text NOT NULL,
	"challenger_attempt_id" uuid NOT NULL,
	"recipient_user_id" text,
	"recipient_attempt_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiz_duel_challenges" ADD CONSTRAINT "quiz_duel_challenges_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_duel_challenges" ADD CONSTRAINT "quiz_duel_challenges_challenger_user_id_user_id_fk" FOREIGN KEY ("challenger_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_duel_challenges" ADD CONSTRAINT "quiz_duel_challenges_challenger_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("challenger_attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_duel_challenges" ADD CONSTRAINT "quiz_duel_challenges_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_duel_challenges" ADD CONSTRAINT "quiz_duel_challenges_recipient_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("recipient_attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_duel_challenges_quiz_id_idx" ON "quiz_duel_challenges" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_duel_challenges_challenger_user_idx" ON "quiz_duel_challenges" USING btree ("challenger_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_duel_challenges_recipient_attempt_unique" ON "quiz_duel_challenges" USING btree ("recipient_attempt_id");
