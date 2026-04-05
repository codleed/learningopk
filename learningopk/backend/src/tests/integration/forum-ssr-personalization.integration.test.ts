import assert from "node:assert/strict";
import { after, test } from "node:test";

import request from "supertest";

import { db, pool } from "../../lib/db/index.js";
import { redis } from "../../lib/redis.js";
import { createApp } from "../../server.js";

const APP_ORIGIN = "http://localhost:3000";
const TEST_PASSWORD = "StrongPass123";
type AuthAgent = ReturnType<typeof request.agent>;

const signUp = async (agent: AuthAgent, name: string, email: string): Promise<void> => {
  const response = await agent.post("/api/auth/sign-up/email").set("origin", APP_ORIGIN).send({
    name,
    email,
    password: TEST_PASSWORD,
    class: "9th",
    board: "fbise"
  });

  assert.ok(
    response.status < 400,
    `Expected sign-up success for ${email}, got ${response.status} ${JSON.stringify(response.body)}`
  );
};

after(async () => {
  await redis.quit();
  await pool.end();
});

test("GET /api/forum/threads/:threadId returns viewerVoteType for authenticated user", async () => {
  const app = createApp();
  const authorAgent = request.agent(app);
  const voterAgent = request.agent(app);
  const anonAgent = request(app);

  await signUp(authorAgent, "Thread Author SSR", `tst_ssr_author_${Date.now()}@example.com`);
  await signUp(voterAgent, "Voter User SSR", `tst_ssr_voter_${Date.now()}@example.com`);

  // Create a thread
  const threadResponse = await authorAgent.post("/api/forum/threads").send({
    title: "SSR personalization test thread",
    body: "This thread tests that viewerVoteType is returned correctly during SSR."
  });
  assert.equal(threadResponse.status, 201);
  const threadId = threadResponse.body?.thread?.id as string | undefined;
  assert.ok(threadId, "Expected created thread ID.");

  // Create a reply
  const replyResponse = await voterAgent.post(`/api/forum/threads/${threadId}/replies`).send({
    body: "A reply that we will vote on."
  });
  assert.equal(replyResponse.status, 201);
  const replyId = replyResponse.body?.reply?.id as string | undefined;
  assert.ok(replyId, "Expected created reply ID.");

  // Vote on the reply as the author
  const voteResponse = await authorAgent.post(`/api/forum/replies/${replyId}/vote`).send({
    voteType: "upvote"
  });
  assert.equal(voteResponse.status, 200);

  // Fetch thread detail as authenticated voter (who has NOT voted) — viewerVoteType should be null
  const voterThreadResponse = await voterAgent.get(`/api/forum/threads/${threadId}`);
  assert.equal(voterThreadResponse.status, 200);
  const voterThread = voterThreadResponse.body?.thread;
  assert.ok(voterThread, "Expected thread payload.");
  assert.ok(Array.isArray(voterThread.replies), "Expected replies array.");
  const voterReply = voterThread.replies.find(
    (r: { id: string }) => r.id === replyId
  ) as { viewerVoteType: string | null } | undefined;
  assert.ok(voterReply, "Expected reply in thread detail.");
  assert.equal(voterReply.viewerVoteType, null, "Voter has not voted yet, viewerVoteType should be null.");

  // Fetch thread detail as authenticated author (who HAS voted) — viewerVoteType should be "upvote"
  const authorThreadResponse = await authorAgent.get(`/api/forum/threads/${threadId}`);
  assert.equal(authorThreadResponse.status, 200);
  const authorThread = authorThreadResponse.body?.thread;
  assert.ok(authorThread, "Expected thread payload.");
  const authorReply = authorThread.replies.find(
    (r: { id: string }) => r.id === replyId
  ) as { viewerVoteType: string | null } | undefined;
  assert.ok(authorReply, "Expected reply in thread detail.");
  assert.equal(authorReply.viewerVoteType, "upvote", "Author voted upvote, viewerVoteType should reflect that.");

  // Fetch thread detail as anonymous user — viewerVoteType should be null for all replies
  const anonThreadResponse = await anonAgent.get(`/api/forum/threads/${threadId}`);
  assert.equal(anonThreadResponse.status, 200);
  const anonThread = anonThreadResponse.body?.thread;
  assert.ok(anonThread, "Expected thread payload for anon.");
  const anonReply = anonThread.replies.find(
    (r: { id: string }) => r.id === replyId
  ) as { viewerVoteType: string | null } | undefined;
  assert.ok(anonReply, "Expected reply in thread detail for anon.");
  assert.equal(anonReply.viewerVoteType, null, "Anonymous user should see viewerVoteType as null.");
});

test("GET /api/forum/threads/:threadId returns viewerVoteType for nested replies", async () => {
  const app = createApp();
  const authorAgent = request.agent(app);
  const replierAgent = request.agent(app);

  await signUp(authorAgent, "Nested Author", `tst_nested_author_${Date.now()}@example.com`);
  await signUp(replierAgent, "Nested Replier", `tst_nested_replier_${Date.now()}@example.com`);

  // Create thread
  const threadResponse = await authorAgent.post("/api/forum/threads").send({
    title: "Nested reply vote test",
    body: "Testing viewerVoteType on nested replies."
  });
  assert.equal(threadResponse.status, 201);
  const threadId = threadResponse.body?.thread?.id as string;

  // Create top-level reply
  const topReplyResponse = await replierAgent.post(`/api/forum/threads/${threadId}/replies`).send({
    body: "Top-level reply."
  });
  assert.equal(topReplyResponse.status, 201);
  const topReplyId = topReplyResponse.body?.reply?.id as string;

  // Create nested reply
  const nestedReplyResponse = await authorAgent.post(`/api/forum/threads/${threadId}/replies`).send({
    body: "Nested reply under top-level.",
    parentReplyId: topReplyId
  });
  assert.equal(nestedReplyResponse.status, 201);
  const nestedReplyId = nestedReplyResponse.body?.reply?.id as string;

  // Vote on nested reply as replier
  const voteResponse = await replierAgent.post(`/api/forum/replies/${nestedReplyId}/vote`).send({
    voteType: "downvote"
  });
  assert.equal(voteResponse.status, 200);

  // Fetch thread as replier — nested reply should show viewerVoteType "downvote"
  const detailResponse = await replierAgent.get(`/api/forum/threads/${threadId}`);
  assert.equal(detailResponse.status, 200);

  const topReply = detailResponse.body?.thread?.replies?.find(
    (r: { id: string }) => r.id === topReplyId
  ) as { replies: Array<{ id: string; viewerVoteType: string | null }> } | undefined;
  assert.ok(topReply, "Expected top-level reply.");
  assert.ok(Array.isArray(topReply.replies), "Expected nested replies array.");

  const nestedReply = topReply.replies.find((r) => r.id === nestedReplyId);
  assert.ok(nestedReply, "Expected nested reply.");
  assert.equal(nestedReply.viewerVoteType, "downvote", "Replier voted downvote on nested reply.");
});

test("forum thread detail endpoint is publicly accessible without authentication", async () => {
  const app = createApp();
  const authorAgent = request.agent(app);
  const anonAgent = request(app);

  await signUp(authorAgent, "Public Thread Author", `tst_public_author_${Date.now()}@example.com`);

  const threadResponse = await authorAgent.post("/api/forum/threads").send({
    title: "Public access test thread",
    body: "This thread should be accessible without authentication."
  });
  assert.equal(threadResponse.status, 201);
  const threadId = threadResponse.body?.thread?.id as string;

  // Anonymous access should succeed
  const anonResponse = await anonAgent.get(`/api/forum/threads/${threadId}`);
  assert.equal(anonResponse.status, 200);
  assert.ok(anonResponse.body?.thread, "Expected thread payload for anonymous user.");
  assert.equal(anonResponse.body.thread.id, threadId);
});

test("forum thread list endpoint is publicly accessible", async () => {
  const app = createApp();
  const anonAgent = request(app);

  const response = await anonAgent.get("/api/forum/threads");
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body?.threads), "Expected threads array.");
});

test("forum mutation endpoints require authentication", async () => {
  const app = createApp();
  const anonAgent = request(app);

  const threadCreateResponse = await anonAgent.post("/api/forum/threads").send({
    title: "Unauthenticated thread attempt",
    body: "This should fail because no session exists."
  });
  assert.equal(threadCreateResponse.status, 401, "Creating a thread without auth should return 401.");

  const replyCreateResponse = await anonAgent.post("/api/forum/threads/00000000-0000-0000-0000-000000000000/replies").send({
    body: "Unauthenticated reply attempt."
  });
  assert.equal(replyCreateResponse.status, 401, "Creating a reply without auth should return 401.");

  const voteResponse = await anonAgent.post("/api/forum/replies/00000000-0000-0000-0000-000000000000/vote").send({
    voteType: "upvote"
  });
  assert.equal(voteResponse.status, 401, "Voting without auth should return 401.");
});
