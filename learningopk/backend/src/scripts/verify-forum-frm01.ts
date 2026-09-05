import { and, eq } from "drizzle-orm";
import request from "supertest";
import { z } from "zod";

import { db, pool } from "../lib/db/index.js";
import { forumReplies, forumThreads } from "../lib/db/schema.js";
import { redis } from "../lib/redis.js";
import { createApp } from "../server.js";

const createThreadResponseSchema = z.object({
  thread: z.object({
    id: z.string().uuid(),
  }),
});

const createReplyResponseSchema = z.object({
  reply: z.object({
    id: z.string().uuid(),
    parentReplyId: z.string().uuid().nullable(),
  }),
});

const threadDetailResponseSchema = z.object({
  thread: z.object({
    id: z.string().uuid(),
    views: z.number().int().nonnegative(),
    replyCount: z.number().int().nonnegative(),
    replies: z.array(
      z.object({
        id: z.string().uuid(),
        replies: z.array(
          z.object({
            id: z.string().uuid(),
            parentReplyId: z.string().uuid(),
          })
        ),
      })
    ),
  }),
});

const run = async (): Promise<void> => {
  const app = createApp();
  const agent = request.agent(app);
  const anonAgent = request(app);
  const email = `forum_frm01_${Date.now()}@example.com`;
  const password = "StrongPass123";

  const unauthCreateThread = await anonAgent.post("/api/forum/threads").send({
    title: "How can I solve this algebra equation?",
    body: "I tried isolating x but got stuck at the factoring step.",
  });
  if (unauthCreateThread.status !== 401) {
    throw new Error(
      `Expected 401 for unauthenticated thread create, got ${unauthCreateThread.status}`
    );
  }

  const signUpResponse = await agent
    .post("/api/auth/sign-up/email")
    .set("origin", "http://localhost:3000")
    .send({
      name: "Forum FRM-01 User",
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

  const sessionResponse = await agent
    .get("/api/auth/get-session")
    .set("origin", "http://localhost:3000");
  const userId = z
    .object({
      user: z.object({
        id: z.string().min(1),
      }),
    })
    .safeParse(sessionResponse.body).data?.user.id;
  if (!userId) {
    throw new Error(
      `Session fetch failed: ${sessionResponse.status} ${JSON.stringify(sessionResponse.body)}`
    );
  }

  const createThreadResponse = await agent.post("/api/forum/threads").send({
    title: "How can I solve this algebra equation?",
    body: "I tried isolating x but got stuck at the factoring step. Can someone explain a clean method?",
  });
  if (createThreadResponse.status !== 201) {
    throw new Error(`Expected thread create 201, got ${createThreadResponse.status}`);
  }

  const createdThread = createThreadResponseSchema.parse(createThreadResponse.body).thread;

  const persistedThreads = await db
    .select({
      id: forumThreads.id,
    })
    .from(forumThreads)
    .where(and(eq(forumThreads.id, createdThread.id), eq(forumThreads.userId, userId)))
    .limit(1);
  if (persistedThreads.length === 0) {
    throw new Error("Thread persistence verification failed.");
  }

  const unauthReplyResponse = await anonAgent
    .post(`/api/forum/threads/${createdThread.id}/replies`)
    .send({
      body: "This should fail because no session.",
    });
  if (unauthReplyResponse.status !== 401) {
    throw new Error(
      `Expected 401 for unauthenticated reply create, got ${unauthReplyResponse.status}`
    );
  }

  const topLevelReplyResponse = await agent
    .post(`/api/forum/threads/${createdThread.id}/replies`)
    .send({
      body: "A good start is moving all terms to one side, then use factoring.",
    });
  if (topLevelReplyResponse.status !== 201) {
    throw new Error(`Expected top-level reply create 201, got ${topLevelReplyResponse.status}`);
  }
  const topLevelReply = createReplyResponseSchema.parse(topLevelReplyResponse.body).reply;
  if (topLevelReply.parentReplyId !== null) {
    throw new Error("Top-level reply should have parentReplyId=null.");
  }

  const nestedReplyResponse = await agent
    .post(`/api/forum/threads/${createdThread.id}/replies`)
    .send({
      body: "Thanks! I retried and that worked.",
      parentReplyId: topLevelReply.id,
    });
  if (nestedReplyResponse.status !== 201) {
    throw new Error(`Expected nested reply create 201, got ${nestedReplyResponse.status}`);
  }
  const nestedReply = createReplyResponseSchema.parse(nestedReplyResponse.body).reply;
  if (nestedReply.parentReplyId !== topLevelReply.id) {
    throw new Error("Nested reply parentReplyId mismatch.");
  }

  const tooDeepReplyResponse = await agent
    .post(`/api/forum/threads/${createdThread.id}/replies`)
    .send({
      body: "Attempting a second nested level.",
      parentReplyId: nestedReply.id,
    });
  if (tooDeepReplyResponse.status !== 400) {
    throw new Error(
      `Expected 400 when nesting exceeds one level, got ${tooDeepReplyResponse.status}`
    );
  }

  const replyRows = await db
    .select({
      id: forumReplies.id,
      parentReplyId: forumReplies.parentReplyId,
    })
    .from(forumReplies)
    .where(eq(forumReplies.threadId, createdThread.id));
  if (replyRows.length !== 2) {
    throw new Error(`Expected exactly 2 persisted replies, found ${replyRows.length}.`);
  }

  const firstDetailResponse = await agent.get(`/api/forum/threads/${createdThread.id}`);
  if (firstDetailResponse.status !== 200) {
    throw new Error(`Expected first thread detail response 200, got ${firstDetailResponse.status}`);
  }
  const firstDetail = threadDetailResponseSchema.parse(firstDetailResponse.body).thread;

  const secondDetailResponse = await agent.get(`/api/forum/threads/${createdThread.id}`);
  if (secondDetailResponse.status !== 200) {
    throw new Error(
      `Expected second thread detail response 200, got ${secondDetailResponse.status}`
    );
  }
  const secondDetail = threadDetailResponseSchema.parse(secondDetailResponse.body).thread;

  if (secondDetail.views !== firstDetail.views + 1) {
    throw new Error(
      `Expected views to increment by 1 on open (${firstDetail.views} -> ${secondDetail.views}).`
    );
  }

  if (secondDetail.replyCount !== 2) {
    throw new Error(`Expected replyCount=2, got ${secondDetail.replyCount}.`);
  }

  const parentReply = secondDetail.replies.find((reply) => reply.id === topLevelReply.id);
  if (!parentReply) {
    throw new Error("Top-level reply missing from thread detail response.");
  }
  const foundNestedReply = parentReply.replies.some((reply) => reply.id === nestedReply.id);
  if (!foundNestedReply) {
    throw new Error("Nested reply missing from thread detail response.");
  }

  const feedResponse = await agent.get("/api/forum/threads").query({ limit: 10 });
  if (feedResponse.status !== 200) {
    throw new Error(`Expected forum feed 200, got ${feedResponse.status}`);
  }
  const feedRows = z
    .object({
      threads: z.array(
        z.object({
          id: z.string().uuid(),
        })
      ),
    })
    .parse(feedResponse.body).threads;
  const threadPresentInFeed = feedRows.some((thread) => thread.id === createdThread.id);
  if (!threadPresentInFeed) {
    throw new Error("Created thread was not found in forum feed.");
  }

  console.log(`UNAUTH_THREAD_CREATE_STATUS=${unauthCreateThread.status}`);
  console.log(`UNAUTH_REPLY_CREATE_STATUS=${unauthReplyResponse.status}`);
  console.log(`THREAD_ID=${createdThread.id}`);
  console.log(`TOP_LEVEL_REPLY_ID=${topLevelReply.id}`);
  console.log(`NESTED_REPLY_ID=${nestedReply.id}`);
  console.log(`OVER_NEST_LIMIT_STATUS=${tooDeepReplyResponse.status}`);
  console.log(`VIEWS_FIRST=${firstDetail.views}`);
  console.log(`VIEWS_SECOND=${secondDetail.views}`);
  console.log(`REPLY_COUNT=${secondDetail.replyCount}`);
  console.log(`FEED_THREAD_COUNT=${feedRows.length}`);
};

run()
  .catch((error) => {
    console.error("Forum FRM-01 verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
    if (redis.isOpen) {
      await redis.quit().catch(() => undefined);
    }
  });
