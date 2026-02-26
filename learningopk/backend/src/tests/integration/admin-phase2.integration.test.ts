import assert from "node:assert/strict";
import { after, test } from "node:test";

import { eq } from "drizzle-orm";
import request from "supertest";

import { db, pool } from "../../lib/db/index.js";
import { forumThreads, users } from "../../lib/db/schema.js";
import { redis } from "../../lib/redis.js";
import { createApp } from "../../server.js";

const APP_ORIGIN = "http://localhost:3000";
const TEST_PASSWORD = "StrongPass123";

type AuthAgent = ReturnType<typeof request.agent>;
type SessionUser = {
  id: string;
};

type ModerationTargetType = "thread" | "reply" | "chapter";
type ModerationStatus = "open" | "resolved";

const signUp = async (agent: AuthAgent, name: string, email: string): Promise<void> => {
  const response = await agent.post("/api/auth/sign-up/email").set("origin", APP_ORIGIN).send({
    name,
    email,
    password: TEST_PASSWORD
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

const createThreadFixture = async (userId: string): Promise<{ id: string; title: string }> => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const threadRows = await db
    .insert(forumThreads)
    .values({
      userId,
      title: `Moderation Thread ${suffix}`,
      body: "Thread body fixture for admin moderation tests.",
      isPinned: false
    })
    .returning({
      id: forumThreads.id,
      title: forumThreads.title
    });

  const thread = threadRows[0];
  assert.ok(thread, "Expected thread fixture insert.");

  return thread;
};

const createModerationFlagFixture = async ({
  targetType,
  targetId,
  targetLabel,
  reason,
  status
}: {
  targetType: ModerationTargetType;
  targetId: string;
  targetLabel: string;
  reason: string;
  status: ModerationStatus;
}): Promise<string> => {
  const result = await pool.query<{ id: string }>(
    `
      insert into moderation_flags (target_type, target_id, target_label, reason, status)
      values ($1, $2, $3, $4, $5)
      returning id
    `,
    [targetType, targetId, targetLabel, reason, status]
  );

  const row = result.rows[0];
  assert.ok(row?.id, "Expected moderation flag fixture insert.");

  return row.id;
};

after(async () => {
  if (redis.isOpen) {
    await redis.quit();
  }
  await pool.end().catch(() => undefined);
});

test("admin moderation flags listing enforces auth/role and supports status + targetType filters", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);

  await signUp(adminAgent, "Moderation Admin", `tst_mod_admin_${Date.now()}@example.com`);
  await signUp(memberAgent, "Moderation Member", `tst_mod_member_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  const memberUser = await getSessionUser(memberAgent);
  await assignAdminRole(adminUser.id);

  const openThread = await createThreadFixture(memberUser.id);
  const resolvedThread = await createThreadFixture(memberUser.id);

  await createModerationFlagFixture({
    targetType: "thread",
    targetId: openThread.id,
    targetLabel: openThread.title,
    reason: "Abusive language",
    status: "open"
  });

  await createModerationFlagFixture({
    targetType: "reply",
    targetId: `reply-${Date.now()}`,
    targetLabel: "Reply snippet fixture",
    reason: "Spam",
    status: "open"
  });

  await createModerationFlagFixture({
    targetType: "thread",
    targetId: resolvedThread.id,
    targetLabel: resolvedThread.title,
    reason: "Off-topic",
    status: "resolved"
  });

  const unauthenticated = await anonAgent.get("/api/admin/moderation/flags");
  assert.equal(unauthenticated.status, 401);

  const forbidden = await memberAgent.get("/api/admin/moderation/flags");
  assert.equal(forbidden.status, 403);

  const openThreads = await adminAgent.get("/api/admin/moderation/flags").query({
    status: "open",
    targetType: "thread",
    page: 1,
    pageSize: 10
  });
  assert.equal(openThreads.status, 200);
  assert.ok(Array.isArray(openThreads.body?.entries), "Expected moderation entries payload.");
  assert.ok(openThreads.body.entries.length >= 1, "Expected at least one open thread moderation entry.");
  assert.ok(openThreads.body.entries.every((row: { status: string }) => row.status === "open"));
  assert.ok(openThreads.body.entries.every((row: { targetType: string }) => row.targetType === "thread"));
});

test("admin moderation resolve requires note, persists lifecycle fields, and writes moderation audit log", async () => {
  const app = createApp();
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);

  await signUp(adminAgent, "Resolve Admin", `tst_mod_resolve_admin_${Date.now()}@example.com`);
  await signUp(memberAgent, "Resolve Member", `tst_mod_resolve_member_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  const memberUser = await getSessionUser(memberAgent);
  await assignAdminRole(adminUser.id);

  const thread = await createThreadFixture(memberUser.id);
  const flagId = await createModerationFlagFixture({
    targetType: "thread",
    targetId: thread.id,
    targetLabel: thread.title,
    reason: "Harassment",
    status: "open"
  });

  const shortNote = await adminAgent.post(`/api/admin/moderation/flags/${flagId}/resolve`).send({ note: "short" });
  assert.equal(shortNote.status, 400);

  const success = await adminAgent
    .post(`/api/admin/moderation/flags/${flagId}/resolve`)
    .send({ note: "Resolved after verifying context and evidence." });
  assert.equal(success.status, 200);
  assert.equal(success.body.flag.status, "resolved");
  assert.equal(typeof success.body.flag.resolvedAt, "string");

  const conflict = await adminAgent
    .post(`/api/admin/moderation/flags/${flagId}/resolve`)
    .send({ note: "Attempting a second resolve should fail." });
  assert.equal(conflict.status, 409);

  const persistedFlag = await pool.query<{
    status: string;
    resolved_at: string | null;
    resolution_note: string | null;
    resolved_by: string | null;
  }>(
    `
      select status, resolved_at, resolution_note, resolved_by
      from moderation_flags
      where id = $1
    `,
    [flagId]
  );

  const persisted = persistedFlag.rows[0];
  assert.ok(persisted, "Expected persisted moderation flag.");
  assert.equal(persisted.status, "resolved");
  assert.equal(persisted.resolution_note, "Resolved after verifying context and evidence.");
  assert.equal(persisted.resolved_by, adminUser.id);
  assert.ok(persisted.resolved_at, "Expected resolved_at timestamp.");

  const moderationAuditRows = await pool.query<{
    scope: string;
    status: string;
    message: string;
    actor_id: string | null;
  }>(
    `
      select scope, status, message, actor_id
      from admin_audit_logs
      where scope = 'moderation'
      order by created_at desc
      limit 1
    `
  );

  const moderationAudit = moderationAuditRows.rows[0];
  assert.ok(moderationAudit, "Expected moderation audit log entry.");
  assert.equal(moderationAudit.scope, "moderation");
  assert.equal(moderationAudit.status, "success");
  assert.equal(moderationAudit.actor_id, adminUser.id);
  assert.match(moderationAudit.message, /Resolved after verifying context and evidence/i);
});
