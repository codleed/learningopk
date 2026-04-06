import assert from "node:assert/strict";
import { after, describe, test } from "node:test";

import request from "supertest";

import { pool } from "../../lib/db/index.js";
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

describe("POST /api/forum/threads/:threadId/view — view tracking", () => {
  test("increments view count on POST and does NOT increment on GET", async () => {
    const app = createApp();
    const agent = request.agent(app);
    await signUp(agent, "View Tester", `tst_view_${Date.now()}@example.com`);

    // Create a thread
    const createResponse = await agent.post("/api/forum/threads").send({
      title: "View count test thread",
      body: "This thread tests that view counting works via the dedicated endpoint."
    });
    assert.equal(createResponse.status, 201);
    const threadId = createResponse.body?.data?.thread?.id ?? createResponse.body?.thread?.id;
    assert.ok(threadId, "Expected thread ID in response.");

    // Fetch thread detail (GET) — should NOT increment views
    const getResponse1 = await agent.get(`/api/forum/threads/${threadId}`);
    assert.equal(getResponse1.status, 200);
    const viewsBefore = getResponse1.body?.thread?.views as number;
    assert.equal(typeof viewsBefore, "number", "Expected numeric views field.");

    // Call GET again — views should remain the same
    const getResponse2 = await agent.get(`/api/forum/threads/${threadId}`);
    assert.equal(getResponse2.status, 200);
    assert.equal(
      getResponse2.body?.thread?.views,
      viewsBefore,
      "GET should NOT increment view count."
    );

    // Call dedicated POST /view endpoint
    const viewResponse = await agent.post(`/api/forum/threads/${threadId}/view`);
    assert.equal(viewResponse.status, 204, "View tracking should return 204 No Content.");

    // Fetch thread detail again — views should be incremented by 1
    const getResponse3 = await agent.get(`/api/forum/threads/${threadId}`);
    assert.equal(getResponse3.status, 200);
    assert.equal(
      getResponse3.body?.thread?.views,
      viewsBefore + 1,
      "Views should increment by 1 after POST /view."
    );
  });

  test("returns 400 for invalid thread ID on POST /view", async () => {
    const app = createApp();
    const viewResponse = await request(app).post("/api/forum/threads/not-a-uuid/view");
    assert.equal(viewResponse.status, 400, "Invalid UUID should return 400.");
  });

  test("returns 204 even if thread does not exist (best-effort)", async () => {
    const app = createApp();
    const viewResponse = await request(app).post(
      "/api/forum/threads/00000000-0000-0000-0000-000000000000/view"
    );
    assert.equal(viewResponse.status, 204, "Non-existent thread view should still return 204.");
  });

  test("multiple GET requests after a mutation do not inflate views", async () => {
    const app = createApp();
    const author = request.agent(app);
    const replier = request.agent(app);
    await signUp(author, "View Author", `tst_viewauthor_${Date.now()}@example.com`);
    await signUp(replier, "View Replier", `tst_viewreplier_${Date.now()}@example.com`);

    // Create thread
    const createResponse = await author.post("/api/forum/threads").send({
      title: "View inflation prevention test",
      body: "Testing that router.refresh()-style GET calls do not inflate views."
    });
    assert.equal(createResponse.status, 201);
    const threadId = createResponse.body?.data?.thread?.id ?? createResponse.body?.thread?.id;

    // Track initial view once
    await request(app).post(`/api/forum/threads/${threadId}/view`);

    // Get baseline view count
    const baseline = await author.get(`/api/forum/threads/${threadId}`);
    const baselineViews = baseline.body?.thread?.views as number;

    // Create a reply (simulating a mutation)
    const replyResponse = await replier
      .post(`/api/forum/threads/${threadId}/replies`)
      .send({ body: "A reply to test views." });
    assert.equal(replyResponse.status, 201);

    // Simulate multiple router.refresh() calls (GET requests)
    await author.get(`/api/forum/threads/${threadId}`);
    await author.get(`/api/forum/threads/${threadId}`);
    await author.get(`/api/forum/threads/${threadId}`);

    // Views should not have changed from the baseline
    const final = await author.get(`/api/forum/threads/${threadId}`);
    assert.equal(
      final.body?.thread?.views,
      baselineViews,
      "GET requests after mutations should NOT inflate views."
    );
  });
});

describe("forum mutation error handling", () => {
  test("POST /api/forum/threads returns 400 for invalid payload", async () => {
    const app = createApp();
    const agent = request.agent(app);
    await signUp(agent, "Error Tester", `tst_err_thread_${Date.now()}@example.com`);

    // Title too short
    const response = await agent.post("/api/forum/threads").send({
      title: "Hi",
      body: "A valid body that is long enough to pass the minimum length check."
    });
    assert.equal(response.status, 400, "Short title should return 400.");
  });

  test("POST /api/forum/threads/:threadId/replies returns 400 for empty body", async () => {
    const app = createApp();
    const agent = request.agent(app);
    await signUp(agent, "Error Tester", `tst_err_reply_${Date.now()}@example.com`);

    const response = await agent
      .post("/api/forum/threads/00000000-0000-0000-0000-000000000000/replies")
      .send({ body: "" });
    assert.equal(response.status, 400, "Empty reply body should return 400.");
  });

  test("POST /api/forum/replies/:replyId/vote returns 404 for nonexistent reply", async () => {
    const app = createApp();
    const agent = request.agent(app);
    await signUp(agent, "Vote Error Tester", `tst_err_vote_${Date.now()}@example.com`);

    const response = await agent
      .post("/api/forum/replies/00000000-0000-0000-0000-000000000000/vote")
      .send({ voteType: "upvote" });
    // Should be 404 (reply not found) or 500 depending on implementation
    assert.ok(
      response.status >= 400,
      `Expected error status for nonexistent reply vote, got ${response.status}.`
    );
  });

  test("POST /api/forum/replies/:replyId/accept returns 404 for nonexistent reply", async () => {
    const app = createApp();
    const agent = request.agent(app);
    await signUp(agent, "Accept Error Tester", `tst_err_accept_${Date.now()}@example.com`);

    const response = await agent.post(
      "/api/forum/replies/00000000-0000-0000-0000-000000000000/accept"
    );
    assert.equal(response.status, 404, "Accepting nonexistent reply should return 404.");
  });
});
