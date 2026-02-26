import request from "supertest";
import { z } from "zod";

import {
  FORUM_MUTATION_RATE_LIMIT_MAX_REQUESTS,
  FORUM_MUTATION_RATE_LIMIT_WINDOW_SECONDS
} from "../lib/ai-guardrails.js";
import { pool } from "../lib/db/index.js";
import { ensureRedisConnection, redis } from "../lib/redis.js";
import { createApp } from "../server.js";

const moderationErrorSchema = z.object({
  error: z.string(),
  reason: z.enum(["profanity", "harassment", "self_harm", "spam"])
});

const rateLimitErrorSchema = z.object({
  error: z.string(),
  retryAfterSeconds: z.number().int().positive()
});

const run = async (): Promise<void> => {
  const app = createApp();
  const agent = request.agent(app);
  const anonAgent = request(app);
  const email = `forum_frm04_${Date.now()}@example.com`;
  const password = "StrongPass123";

  const unauthMutationResponse = await anonAgent.post("/api/forum/threads").send({
    title: "Unauthenticated post",
    body: "Should not pass."
  });
  if (unauthMutationResponse.status !== 401) {
    throw new Error(`Expected unauthenticated forum mutation 401, got ${unauthMutationResponse.status}`);
  }

  const signUpResponse = await agent.post("/api/auth/sign-up/email").set("origin", "http://localhost:3000").send({
    name: "Forum FRM-04 User",
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
  if (!userId) {
    throw new Error(`Session fetch failed: ${sessionResponse.status}`);
  }

  const flaggedThreadResponse = await agent.post("/api/forum/threads").send({
    title: "Need study help",
    body: "You are stupid and useless."
  });
  if (flaggedThreadResponse.status !== 422) {
    throw new Error(`Expected moderation status 422, got ${flaggedThreadResponse.status}`);
  }
  const flaggedBody = moderationErrorSchema.parse(flaggedThreadResponse.body);

  const cleanThreadResponse = await agent.post("/api/forum/threads").send({
    title: "Need derivation help",
    body: "Please explain the derivation steps for this chapter equation."
  });
  if (cleanThreadResponse.status !== 201) {
    throw new Error(`Expected clean thread creation 201, got ${cleanThreadResponse.status}`);
  }
  const threadId = z
    .object({
      thread: z.object({
        id: z.string().uuid()
      })
    })
    .parse(cleanThreadResponse.body).thread.id;

  await ensureRedisConnection();
  const rateLimitBucket = Math.floor(Date.now() / (FORUM_MUTATION_RATE_LIMIT_WINDOW_SECONDS * 1000));
  const rateLimitKey = `ratelimit:forum:${userId}:${rateLimitBucket}`;
  await redis.set(rateLimitKey, String(FORUM_MUTATION_RATE_LIMIT_MAX_REQUESTS), {
    EX: FORUM_MUTATION_RATE_LIMIT_WINDOW_SECONDS
  });

  const overLimitResponse = await agent.post(`/api/forum/threads/${threadId}/replies`).send({
    body: "Trying to post while at rate limit."
  });
  if (overLimitResponse.status !== 429) {
    throw new Error(`Expected forum mutation rate-limit status 429, got ${overLimitResponse.status}`);
  }

  const overLimitBody = rateLimitErrorSchema.parse(overLimitResponse.body);
  const retryAfterHeader = overLimitResponse.header["retry-after"];
  if (!retryAfterHeader) {
    throw new Error("Expected retry-after header in 429 response.");
  }

  console.log(`UNAUTH_MUTATION_STATUS=${unauthMutationResponse.status}`);
  console.log(`MODERATION_STATUS=${flaggedThreadResponse.status}`);
  console.log(`MODERATION_REASON=${flaggedBody.reason}`);
  console.log(`RATE_LIMIT_STATUS=${overLimitResponse.status}`);
  console.log(`RATE_LIMIT_RETRY_AFTER=${overLimitBody.retryAfterSeconds}`);
  console.log(`RATE_LIMIT_RETRY_AFTER_HEADER=${retryAfterHeader}`);
};

run()
  .catch((error) => {
    console.error("Forum FRM-04 verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
    if (redis.isOpen) {
      await redis.quit().catch(() => undefined);
    }
  });
