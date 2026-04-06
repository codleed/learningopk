CREATE TABLE "ai_conversation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "ai_conversation_events" ADD CONSTRAINT "ai_conversation_events_session_id_ai_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_chat_sessions"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "ai_conversation_events_session_created_idx" ON "ai_conversation_events" USING btree ("session_id","created_at" desc);
CREATE INDEX "ai_conversation_events_event_type_created_idx" ON "ai_conversation_events" USING btree ("event_type","created_at" desc);
