import { and, eq } from "drizzle-orm";
import request, { type Response } from "supertest";
import { z } from "zod";

import { createApp } from "../server.js";
import { AI_CHAT_RATE_LIMIT_MAX_REQUESTS, AI_CHAT_RATE_LIMIT_WINDOW_SECONDS } from "../lib/ai-guardrails.js";
import { db, pool } from "../lib/db/index.js";
import { aiChatSessions, aiMessages, aiUsageLogs, chapters } from "../lib/db/schema.js";
import { ensureRedisConnection, redis } from "../lib/redis.js";

const aiChatErrorSchema = z.object({
  error: z.string(),
  reason: z.string().optional(),
  retryAfterSeconds: z.number().int().nonnegative().optional()
});

type RequestAgent = ReturnType<typeof request.agent>;

type StreamedChatResponse = {
  response: Response;
  text: string;
  chunkCount: number;
};

const streamChat = async (
  agent: RequestAgent,
  payload: {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    chapterId?: number;
    sessionId?: string;
  }
): Promise<StreamedChatResponse> => {
  const response = await agent
    .post("/api/ai/chat")
    .set("content-type", "application/json")
    .buffer(true)
    .parse((res, callback) => {
      const chunks: Buffer[] = [];
      let chunkCount = 0;
      res.on("data", (chunk: Buffer | string) => {
        chunkCount += 1;
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      res.on("end", () => {
        callback(null, {
          text: Buffer.concat(chunks).toString("utf8"),
          chunkCount
        });
      });
      res.on("error", (error: Error) => {
        callback(error, null);
      });
    })
    .send(payload);

  const parsedBody = response.body as { text?: string; chunkCount?: number };

  return {
    response,
    text: parsedBody.text ?? "",
    chunkCount: parsedBody.chunkCount ?? 0
  };
};

const run = async (): Promise<void> => {
  const app = createApp();
  const agent = request.agent(app);
  const email = `ai_phase_${Date.now()}@example.com`;
  const password = "StrongPass123";

  const signUpResponse = await agent.post("/api/auth/sign-up/email").set("origin", "http://localhost:3000").send({
    name: "AI Verification User",
    email,
    password
  });

  if (signUpResponse.status >= 400) {
    throw new Error(`Sign-up failed: ${signUpResponse.status} ${JSON.stringify(signUpResponse.body)}`);
  }

  const sessionResponse = await agent.get("/api/auth/get-session").set("origin", "http://localhost:3000");
  const userId = z
    .object({
      user: z.object({
        id: z.string().min(1)
      })
    })
    .safeParse(sessionResponse.body).data?.user.id;

  if (sessionResponse.status >= 400 || !userId) {
    throw new Error(`Session fetch failed: ${sessionResponse.status} ${JSON.stringify(sessionResponse.body)}`);
  }

  const chapterRows = await db.select({ id: chapters.id }).from(chapters).where(eq(chapters.isPublished, true)).limit(1);
  const chapterId = chapterRows[0]?.id;
  if (!chapterId) {
    throw new Error("No published chapter found. Seed data is required before AI verification.");
  }

  const streamed = await streamChat(agent, {
    chapterId,
    messages: [{ role: "user", content: "Help me understand Newton's third law with a guiding question first." }]
  });

  if (streamed.response.status !== 200) {
    throw new Error(
      `Expected AI chat success (200), got ${streamed.response.status}: ${JSON.stringify(streamed.response.body)}`
    );
  }

  const contentTypeHeader = streamed.response.header["content-type"];
  if (typeof contentTypeHeader !== "string" || !contentTypeHeader.startsWith("text/plain")) {
    throw new Error(`Expected text/plain streamed response, got: ${String(contentTypeHeader)}`);
  }

  if (streamed.text.trim().length === 0) {
    throw new Error("AI chat returned an empty text stream.");
  }

  const sessionIdHeader = streamed.response.header["x-ai-session-id"];
  if (typeof sessionIdHeader !== "string" || sessionIdHeader.length === 0) {
    throw new Error("Expected x-ai-session-id response header.");
  }

  const persistedSession = await db
    .select({
      id: aiChatSessions.id
    })
    .from(aiChatSessions)
    .where(and(eq(aiChatSessions.id, sessionIdHeader), eq(aiChatSessions.userId, userId)))
    .limit(1);

  if (persistedSession.length === 0) {
    throw new Error("ai_chat_sessions persistence verification failed.");
  }

  const persistedMessages = await db
    .select({
      role: aiMessages.role
    })
    .from(aiMessages)
    .where(eq(aiMessages.sessionId, sessionIdHeader));

  const hasUserMessage = persistedMessages.some((message) => message.role === "user");
  const hasAssistantMessage = persistedMessages.some((message) => message.role === "assistant");
  if (!hasUserMessage || !hasAssistantMessage) {
    throw new Error("ai_messages persistence verification failed (expected user + assistant messages).");
  }

  const persistedUsageLogs = await db
    .select({
      id: aiUsageLogs.id,
      promptTokens: aiUsageLogs.promptTokens,
      completionTokens: aiUsageLogs.completionTokens
    })
    .from(aiUsageLogs)
    .where(eq(aiUsageLogs.sessionId, sessionIdHeader));

  if (persistedUsageLogs.length === 0) {
    throw new Error("ai_usage_logs persistence verification failed.");
  }

  const flaggedResponse = await agent.post("/api/ai/chat").send({
    chapterId,
    messages: [{ role: "user", content: "You are stupid and useless." }]
  });

  if (flaggedResponse.status !== 422) {
    throw new Error(`Expected 422 for flagged AI input, got ${flaggedResponse.status}`);
  }

  const flaggedBody = aiChatErrorSchema.parse(flaggedResponse.body);
  if (!flaggedBody.reason) {
    throw new Error("Expected moderation reason in 422 response body.");
  }

  await ensureRedisConnection();
  const rateLimitBucket = Math.floor(Date.now() / (AI_CHAT_RATE_LIMIT_WINDOW_SECONDS * 1000));
  const rateLimitKey = `ratelimit:ai-chat:${userId}:${rateLimitBucket}`;
  await redis.set(rateLimitKey, String(AI_CHAT_RATE_LIMIT_MAX_REQUESTS), {
    EX: AI_CHAT_RATE_LIMIT_WINDOW_SECONDS
  });

  const overLimitResponse = await agent.post("/api/ai/chat").send({
    chapterId,
    messages: [{ role: "user", content: "Give me one short hint for this chapter." }]
  });

  if (overLimitResponse.status !== 429) {
    throw new Error(`Expected 429 for AI rate limit, got ${overLimitResponse.status}`);
  }

  const overLimitBody = aiChatErrorSchema.parse(overLimitResponse.body);
  if (typeof overLimitBody.retryAfterSeconds !== "number" || overLimitBody.retryAfterSeconds <= 0) {
    throw new Error("Expected retryAfterSeconds in 429 response.");
  }

  console.log(`STREAM_STATUS=${streamed.response.status}`);
  console.log(`STREAM_CHUNKS=${streamed.chunkCount}`);
  console.log(`STREAM_TEXT_LENGTH=${streamed.text.trim().length}`);
  console.log(`AI_SESSION_ID=${sessionIdHeader}`);
  console.log(`PERSISTED_MESSAGES=${persistedMessages.length}`);
  console.log(`PERSISTED_USAGE_LOGS=${persistedUsageLogs.length}`);
  console.log(`FLAGGED_STATUS=${flaggedResponse.status}`);
  console.log(`FLAGGED_REASON=${flaggedBody.reason}`);
  console.log(`OVER_LIMIT_STATUS=${overLimitResponse.status}`);
  console.log(`OVER_LIMIT_RETRY_AFTER=${overLimitBody.retryAfterSeconds}`);
};

run()
  .catch((error) => {
    console.error("AI verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
    if (redis.isOpen) {
      await redis.quit().catch(() => undefined);
    }
  });
