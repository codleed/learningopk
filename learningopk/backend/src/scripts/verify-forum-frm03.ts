import request from "supertest";
import { z } from "zod";

import { pool } from "../lib/db/index.js";
import { redis } from "../lib/redis.js";
import { createApp } from "../server.js";

const threadListSchema = z.object({
  threads: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string()
    })
  )
});

const signUp = async (agent: ReturnType<typeof request.agent>, label: string) => {
  const email = `${label}_${Date.now()}_${Math.floor(Math.random() * 100000)}@example.com`;
  const password = "StrongPass123";

  const signUpResponse = await agent.post("/api/auth/sign-up/email").set("origin", "http://localhost:3000").send({
    name: `${label} user`,
    email,
    password
  });
  if (signUpResponse.status >= 400) {
    throw new Error(`Sign-up failed for ${label}: ${signUpResponse.status}`);
  }
};

const createThread = async (agent: ReturnType<typeof request.agent>, payload: { title: string; body: string }) => {
  const response = await agent.post("/api/forum/threads").send(payload);
  if (response.status !== 201) {
    throw new Error(`Thread creation failed (${response.status}) for title "${payload.title}"`);
  }

  return z
    .object({
      thread: z.object({
        id: z.string().uuid()
      })
    })
    .parse(response.body).thread.id;
};

const run = async (): Promise<void> => {
  const app = createApp();
  const authorAgent = request.agent(app);
  const searchAgent = request(app);

  await signUp(authorAgent, "forum_search_author");

  const highRelevanceThreadId = await createThread(authorAgent, {
    title: "Acceleration acceleration acceleration strategy",
    body: "I keep missing acceleration steps. Need acceleration formulas and acceleration examples."
  });

  const mediumRelevanceThreadId = await createThread(authorAgent, {
    title: "Velocity problem in chapter 3",
    body: "I have one acceleration value but I am unsure how to continue."
  });

  const unrelatedThreadId = await createThread(authorAgent, {
    title: "How to remember trigonometry identities",
    body: "Sharing memorization tips for sine, cosine, and tangent."
  });

  const accelerationSearchResponse = await searchAgent
    .get("/api/forum/threads")
    .query({ q: "acceleration", limit: 10, solved: "unsolved" });
  if (accelerationSearchResponse.status !== 200) {
    throw new Error(`Expected acceleration search status 200, got ${accelerationSearchResponse.status}`);
  }

  const accelerationThreads = threadListSchema.parse(accelerationSearchResponse.body).threads;
  if (accelerationThreads.length < 2) {
    throw new Error("Expected at least two acceleration search results.");
  }

  const firstAccelerationResult = accelerationThreads[0];
  if (!firstAccelerationResult || firstAccelerationResult.id !== highRelevanceThreadId) {
    throw new Error("Expected highest relevance thread to be ranked first for acceleration search.");
  }

  const hasMediumRelevanceThread = accelerationThreads.some((thread) => thread.id === mediumRelevanceThreadId);
  if (!hasMediumRelevanceThread) {
    throw new Error("Expected medium relevance thread to appear in acceleration search results.");
  }

  const includesUnrelatedThread = accelerationThreads.some((thread) => thread.id === unrelatedThreadId);
  if (includesUnrelatedThread) {
    throw new Error("Unrelated thread should not appear in acceleration search results.");
  }

  const velocitySearchResponse = await searchAgent.get("/api/forum/threads").query({ q: "velocity", limit: 10 });
  if (velocitySearchResponse.status !== 200) {
    throw new Error(`Expected velocity search status 200, got ${velocitySearchResponse.status}`);
  }

  const velocityThreads = threadListSchema.parse(velocitySearchResponse.body).threads;
  const firstVelocityResult = velocityThreads[0];
  if (!firstVelocityResult || firstVelocityResult.id !== mediumRelevanceThreadId) {
    throw new Error("Expected velocity-focused thread to rank first for velocity search.");
  }

  console.log(`ACCELERATION_SEARCH_STATUS=${accelerationSearchResponse.status}`);
  console.log(`ACCELERATION_RESULTS=${accelerationThreads.length}`);
  console.log(`ACCELERATION_TOP_RESULT_ID=${firstAccelerationResult.id}`);
  console.log(`VELOCITY_SEARCH_STATUS=${velocitySearchResponse.status}`);
  console.log(`VELOCITY_TOP_RESULT_ID=${firstVelocityResult.id}`);
};

run()
  .catch((error) => {
    console.error("Forum FRM-03 verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
    if (redis.isOpen) {
      await redis.quit().catch(() => undefined);
    }
  });
