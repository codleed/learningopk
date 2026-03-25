CREATE TABLE "institutes" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "institutes_slug_idx" ON "institutes" USING btree ("slug");
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "avatar_url" text;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "institute_id" integer;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_online" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_seen" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_institute_id_institutes_id_fk"
FOREIGN KEY ("institute_id")
REFERENCES "public"."institutes"("id")
ON DELETE set null
ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "privacy_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "who_can_find_me" "who_can_find_me" DEFAULT 'everyone' NOT NULL,
  "who_can_send_request" "who_can_send_request" DEFAULT 'everyone' NOT NULL,
  "show_online_status" boolean DEFAULT true NOT NULL,
  "show_last_seen" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "privacy_settings"
ADD CONSTRAINT "privacy_settings_user_id_user_id_fk"
FOREIGN KEY ("user_id")
REFERENCES "public"."user"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "privacy_settings_user_id_idx" ON "privacy_settings" USING btree ("user_id");
--> statement-breakpoint
CREATE TABLE "blocked_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "blocker_id" text NOT NULL,
  "blocked_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blocked_users"
ADD CONSTRAINT "blocked_users_blocker_id_user_id_fk"
FOREIGN KEY ("blocker_id")
REFERENCES "public"."user"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "blocked_users"
ADD CONSTRAINT "blocked_users_blocked_id_user_id_fk"
FOREIGN KEY ("blocked_id")
REFERENCES "public"."user"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "blocked_users_blocker_blocked_idx" ON "blocked_users" USING btree ("blocker_id","blocked_id");
--> statement-breakpoint
CREATE INDEX "blocked_users_blocker_idx" ON "blocked_users" USING btree ("blocker_id");
--> statement-breakpoint
CREATE INDEX "blocked_users_blocked_idx" ON "blocked_users" USING btree ("blocked_id");
--> statement-breakpoint
CREATE TABLE "friend_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sender_id" text NOT NULL,
  "receiver_id" text NOT NULL,
  "status" "friend_request_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "friend_requests"
ADD CONSTRAINT "friend_requests_sender_id_user_id_fk"
FOREIGN KEY ("sender_id")
REFERENCES "public"."user"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "friend_requests"
ADD CONSTRAINT "friend_requests_receiver_id_user_id_fk"
FOREIGN KEY ("receiver_id")
REFERENCES "public"."user"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "friend_requests_sender_receiver_idx" ON "friend_requests" USING btree ("sender_id","receiver_id");
--> statement-breakpoint
CREATE INDEX "friend_requests_sender_idx" ON "friend_requests" USING btree ("sender_id");
--> statement-breakpoint
CREATE INDEX "friend_requests_receiver_idx" ON "friend_requests" USING btree ("receiver_id");
--> statement-breakpoint
CREATE INDEX "friend_requests_status_idx" ON "friend_requests" USING btree ("status");
--> statement-breakpoint
CREATE TABLE "friendships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "friend_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "friendships"
ADD CONSTRAINT "friendships_user_id_user_id_fk"
FOREIGN KEY ("user_id")
REFERENCES "public"."user"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "friendships"
ADD CONSTRAINT "friendships_friend_id_user_id_fk"
FOREIGN KEY ("friend_id")
REFERENCES "public"."user"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "friendships_user_friend_idx" ON "friendships" USING btree ("user_id","friend_id");
--> statement-breakpoint
CREATE INDEX "friendships_user_idx" ON "friendships" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "friendships_friend_idx" ON "friendships" USING btree ("friend_id");
--> statement-breakpoint
CREATE TABLE "conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "participant_one_id" text NOT NULL,
  "participant_two_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations"
ADD CONSTRAINT "conversations_participant_one_id_user_id_fk"
FOREIGN KEY ("participant_one_id")
REFERENCES "public"."user"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "conversations"
ADD CONSTRAINT "conversations_participant_two_id_user_id_fk"
FOREIGN KEY ("participant_two_id")
REFERENCES "public"."user"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_participants_idx" ON "conversations" USING btree ("participant_one_id","participant_two_id");
--> statement-breakpoint
CREATE INDEX "conversations_participant_one_idx" ON "conversations" USING btree ("participant_one_id");
--> statement-breakpoint
CREATE INDEX "conversations_participant_two_idx" ON "conversations" USING btree ("participant_two_id");
--> statement-breakpoint
CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL,
  "sender_id" text NOT NULL,
  "content" text NOT NULL,
  "message_type" "message_type" DEFAULT 'text' NOT NULL,
  "media_url" text,
  "media_mime_type" text,
  "file_size" integer,
  "read_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages"
ADD CONSTRAINT "messages_conversation_id_conversations_id_fk"
FOREIGN KEY ("conversation_id")
REFERENCES "public"."conversations"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "messages"
ADD CONSTRAINT "messages_sender_id_user_id_fk"
FOREIGN KEY ("sender_id")
REFERENCES "public"."user"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id");
--> statement-breakpoint
CREATE INDEX "messages_sender_idx" ON "messages" USING btree ("sender_id");
--> statement-breakpoint
CREATE INDEX "messages_created_idx" ON "messages" USING btree ("created_at");
--> statement-breakpoint
CREATE TABLE "message_read_receipts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "read_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_read_receipts"
ADD CONSTRAINT "message_read_receipts_message_id_messages_id_fk"
FOREIGN KEY ("message_id")
REFERENCES "public"."messages"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "message_read_receipts"
ADD CONSTRAINT "message_read_receipts_user_id_user_id_fk"
FOREIGN KEY ("user_id")
REFERENCES "public"."user"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "message_read_receipts_message_user_idx" ON "message_read_receipts" USING btree ("message_id","user_id");
--> statement-breakpoint
CREATE TABLE "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "type" "notification_type" NOT NULL,
  "reference_id" text,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_user_id_user_id_fk"
FOREIGN KEY ("user_id")
REFERENCES "public"."user"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read");
