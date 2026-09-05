import { eq } from "drizzle-orm";
import request, { type Response } from "supertest";
import { z } from "zod";

import { db, pool } from "../lib/db/index.js";
import { chapters } from "../lib/db/schema.js";
import { redis } from "../lib/redis.js";
import { createApp } from "../server.js";

const CONCURRENT_REQUESTS = 20;

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
    chapterId: number;
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
          chunkCount,
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
    chunkCount: parsedBody.chunkCount ?? 0,
  };
};

const run = async (): Promise<void> => {
  const app = createApp();
  const agent = request.agent(app);
  const email = `ai_concurrency_${Date.now()}@example.com`;
  const password = "StrongPass123";

  const signUpResponse = await agent
    .post("/api/auth/sign-up/email")
    .set("origin", "http://localhost:3000")
    .send({
      name: "AI Concurrency User",
      email,
      password,
      class: "9th",
      board: "fbise",
    });

  if (signUpResponse.status >= 400) {
    throw new Error(
      `Sign-up failed: ${signUpResponse.status} ${JSON.stringify(signUpResponse.body)}`
    );
  }

  const chapterRows = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(eq(chapters.isPublished, true))
    .limit(1);
  const chapterId = chapterRows[0]?.id;
  if (!chapterId) {
    throw new Error(
      "No published chapter found. Seed data is required before AI concurrency verification."
    );
  }

  const startedAt = Date.now();
  const responses = await Promise.all(
    Array.from({ length: CONCURRENT_REQUESTS }, (_value, index) =>
      streamChat(agent, {
        chapterId,
        messages: [
          {
            role: "user",
            content: `Give me one concise hint for exercise strategy #${index + 1}.`,
          },
        ],
      })
    )
  );
  const durationMs = Date.now() - startedAt;

  const nonSuccessResponses = responses.filter((entry) => entry.response.status !== 200);
  if (nonSuccessResponses.length > 0) {
    const statusCounts = nonSuccessResponses.reduce<Record<string, number>>(
      (accumulator, entry) => {
        const key = String(entry.response.status);
        accumulator[key] = (accumulator[key] ?? 0) + 1;
        return accumulator;
      },
      {}
    );
    throw new Error(
      `Expected all concurrent AI requests to return 200. Failures: ${JSON.stringify(statusCounts)}`
    );
  }

  const emptyResponses = responses.filter((entry) => entry.text.trim().length === 0);
  if (emptyResponses.length > 0) {
    throw new Error(
      `Expected all concurrent AI responses to contain streamed text. Empty responses: ${emptyResponses.length}`
    );
  }

  const sessionHeaderCount = responses.filter((entry) => {
    const sessionId = entry.response.header["x-ai-session-id"];
    return typeof sessionId === "string" && z.string().uuid().safeParse(sessionId).success;
  }).length;

  const totalChunkCount = responses.reduce((sum, entry) => sum + entry.chunkCount, 0);
  const totalTextLength = responses.reduce((sum, entry) => sum + entry.text.trim().length, 0);
  const averageTextLength = Math.round(totalTextLength / responses.length);

  console.log(`AI_CONCURRENCY_REQUESTS=${CONCURRENT_REQUESTS}`);
  console.log(`AI_CONCURRENCY_DURATION_MS=${durationMs}`);
  console.log(`AI_CONCURRENCY_SUCCESS_COUNT=${responses.length}`);
  console.log(`AI_CONCURRENCY_NON_200_COUNT=${nonSuccessResponses.length}`);
  console.log(`AI_CONCURRENCY_EMPTY_RESPONSE_COUNT=${emptyResponses.length}`);
  console.log(`AI_CONCURRENCY_SESSION_HEADERS=${sessionHeaderCount}`);
  console.log(`AI_CONCURRENCY_TOTAL_CHUNKS=${totalChunkCount}`);
  console.log(`AI_CONCURRENCY_AVG_TEXT_LENGTH=${averageTextLength}`);
};

run()
  .catch((error) => {
    console.error("AI concurrency verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
    if (redis.isOpen) {
      await redis.quit().catch(() => undefined);
    }
  });
