import assert from "node:assert/strict";
import { after, test } from "node:test";

import { eq } from "drizzle-orm";
import request from "supertest";

import { db, pool } from "../../lib/db/index.js";
import { aiChatSessions, aiConversationEvents, chapters, forumThreads, users } from "../../lib/db/schema.js";
import { redis } from "../../lib/redis.js";
import { createApp } from "../../server.js";

const APP_ORIGIN = "http://localhost:3000";
const TEST_PASSWORD = "StrongPass123";

type AuthAgent = ReturnType<typeof request.agent>;
type SessionUser = {
  id: string;
};

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

const getSessionUser = async (agent: AuthAgent): Promise<SessionUser> => {
  const response = await agent.get("/api/auth/get-session").set("origin", APP_ORIGIN);

  assert.ok(
    response.status < 400,
    `Expected session lookup success, got ${response.status} ${JSON.stringify(response.body)}`
  );

  const user = response.body?.user as SessionUser | undefined;
  assert.ok(user?.id, "Expected authenticated session user ID.");

  return user;
};

const assignAdminRole = async (userId: string): Promise<void> => {
  await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
};

const createThreadFixture = async ({
  userId,
  titlePrefix,
  isPinned,
  isSolved
}: {
  userId: string;
  titlePrefix: string;
  isPinned: boolean;
  isSolved: boolean;
}): Promise<{ id: string; title: string }> => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const rows = await db
    .insert(forumThreads)
    .values({
      userId,
      title: `${titlePrefix} ${suffix}`,
      body: "Community moderation fixture body.",
      isPinned,
      isSolved
    })
    .returning({
      id: forumThreads.id,
      title: forumThreads.title
    });

  const thread = rows[0];
  assert.ok(thread, "Expected thread fixture insert.");

  return thread;
};

const createOpenThreadFlag = async ({ targetId, targetLabel }: { targetId: string; targetLabel: string }): Promise<void> => {
  await pool.query(
    `
      insert into moderation_flags (target_type, target_id, target_label, reason, status)
      values ('thread', $1, $2, 'Community policy violation', 'open')
    `,
    [targetId, targetLabel]
  );
};

after(async () => {
  if (redis.isOpen) {
    await redis.quit();
  }
  await pool.end().catch(() => undefined);
});

test("admin community threads listing enforces auth/role and supports solved+pinned+flag filters", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);

  await signUp(adminAgent, "Community Admin", `tst_phase3_admin_${Date.now()}@example.com`);
  await signUp(memberAgent, "Community Member", `tst_phase3_member_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  const memberUser = await getSessionUser(memberAgent);
  await assignAdminRole(adminUser.id);

  const expected = await createThreadFixture({
    userId: memberUser.id,
    titlePrefix: "Expected community thread",
    isPinned: false,
    isSolved: false
  });
  await createOpenThreadFlag({
    targetId: expected.id,
    targetLabel: expected.title
  });

  await createThreadFixture({
    userId: memberUser.id,
    titlePrefix: "Excluded solved thread",
    isPinned: false,
    isSolved: true
  }).then((thread) =>
    createOpenThreadFlag({
      targetId: thread.id,
      targetLabel: thread.title
    })
  );

  await createThreadFixture({
    userId: memberUser.id,
    titlePrefix: "Excluded pinned thread",
    isPinned: true,
    isSolved: false
  }).then((thread) =>
    createOpenThreadFlag({
      targetId: thread.id,
      targetLabel: thread.title
    })
  );

  await createThreadFixture({
    userId: memberUser.id,
    titlePrefix: "Excluded no-flag thread",
    isPinned: false,
    isSolved: false
  });

  const unauthenticated = await anonAgent.get("/api/admin/community/threads");
  assert.equal(unauthenticated.status, 401);

  const forbidden = await memberAgent.get("/api/admin/community/threads");
  assert.equal(forbidden.status, 403);

  const filtered = await adminAgent.get("/api/admin/community/threads").query({
    solved: "unsolved",
    pinned: "unpinned",
    flagState: "openFlags",
    page: 1,
    pageSize: 10
  });

  assert.equal(filtered.status, 200);
  assert.ok(Array.isArray(filtered.body?.entries), "Expected community entries payload.");
  assert.ok(filtered.body.entries.length >= 1, "Expected at least one matching community thread.");
  assert.ok(filtered.body.entries.every((row: { isSolved: boolean }) => row.isSolved === false));
  assert.ok(filtered.body.entries.every((row: { isPinned: boolean }) => row.isPinned === false));
  assert.ok(filtered.body.entries.every((row: { openFlagCount: number }) => row.openFlagCount > 0));
});

test("admin analytics overview enforces auth/role and returns windowed KPI aggregates", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);

  await signUp(adminAgent, "Analytics Admin", `tst_phase3_analytics_admin_${Date.now()}@example.com`);
  await signUp(memberAgent, "Analytics Member", `tst_phase3_analytics_member_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  const memberUser = await getSessionUser(memberAgent);
  await assignAdminRole(adminUser.id);

  const chapterRows = await db.select({ id: chapters.id }).from(chapters).limit(1);
  const chapterId = chapterRows[0]?.id;
  assert.ok(chapterId, "Expected a chapter fixture for analytics confusion test.");

  const insertedSessionRows = await db
    .insert(aiChatSessions)
    .values({
      userId: memberUser.id,
      chapterId,
      title: "Confusion analytics fixture"
    })
    .returning({
      id: aiChatSessions.id
    });
  const insertedSessionId = insertedSessionRows[0]?.id;
  assert.ok(insertedSessionId, "Expected ai_chat_sessions fixture insert.");

  await db.insert(aiConversationEvents).values({
    sessionId: insertedSessionId,
    eventType: "confusion_detected",
    metadata: {
      topic: "Fixture topic",
      message: "It looks like you're working through Fixture topic. Would you like me to break this down differently?",
      reasons: ["short_consecutive_messages"]
    }
  });

  const unauthenticated = await anonAgent.get("/api/admin/analytics/overview");
  assert.equal(unauthenticated.status, 401);

  const forbidden = await memberAgent.get("/api/admin/analytics/overview");
  assert.equal(forbidden.status, 403);

  const analytics = await adminAgent.get("/api/admin/analytics/overview").query({ windowDays: 30 });
  assert.equal(analytics.status, 200);
  assert.equal(analytics.body.windowDays, 30);
  assert.equal(typeof analytics.body.summary?.activeStudents, "number");
  assert.equal(typeof analytics.body.summary?.quizAttempts, "number");
  assert.equal(typeof analytics.body.summary?.averageQuizScorePercent, "number");
  assert.equal(typeof analytics.body.summary?.threadsCreated, "number");
  assert.equal(typeof analytics.body.summary?.openModerationFlags, "number");
  assert.equal(typeof analytics.body.summary?.confusionEvents, "number");
  assert.ok(Array.isArray(analytics.body.subjectPerformance), "Expected subject performance list.");
  assert.ok(Array.isArray(analytics.body.confusionByChapter), "Expected confusion by chapter list.");
});


