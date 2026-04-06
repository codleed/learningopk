ALTER TABLE "ai_usage_logs"
ADD COLUMN "model_tier" text NOT NULL DEFAULT 'mistral-small';
