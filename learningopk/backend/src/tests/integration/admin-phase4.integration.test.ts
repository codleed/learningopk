import assert from "node:assert/strict";
import { after, test } from "node:test";

import { eq } from "drizzle-orm";
import request from "supertest";

import { db, pool } from "../../lib/db/index.js";
import { users } from "../../lib/db/schema.js";
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

after(async () => {
  if (redis.isOpen) {
    await redis.quit();
  }
  await pool.end().catch(() => undefined);
});

test("admin notifications listing and creation enforce auth/role with validation", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);

  await signUp(adminAgent, "Phase4 Admin", `tst_phase4_admin_${Date.now()}@example.com`);
  await signUp(memberAgent, "Phase4 Member", `tst_phase4_member_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  await assignAdminRole(adminUser.id);

  const unauthenticated = await anonAgent.get("/api/admin/notifications");
  assert.equal(unauthenticated.status, 401);

  const forbidden = await memberAgent.get("/api/admin/notifications");
  assert.equal(forbidden.status, 403);

  const invalidCreate = await adminAgent.post("/api/admin/notifications").send({
    title: "Hi",
    message: "short",
    audience: "all"
  });
  assert.equal(invalidCreate.status, 400);

  const created = await adminAgent.post("/api/admin/notifications").send({
    title: "Maintenance window",
    message: "Platform maintenance starts at 10 PM with expected 15 minute downtime.",
    audience: "students"
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.notification.audience, "students");
  assert.equal(created.body.notification.status, "sent");

  const listing = await adminAgent.get("/api/admin/notifications").query({ page: 1, pageSize: 10 });
  assert.equal(listing.status, 200);
  assert.ok(Array.isArray(listing.body.entries), "Expected notifications entries payload.");
  assert.ok(
    listing.body.entries.some((row: { id: string }) => row.id === created.body.notification.id),
    "Expected notifications listing to include the newly created record."
  );

  const notificationAuditRows = await pool.query<{
    scope: string;
    status: string;
    actor_id: string | null;
    message: string;
  }>(
    `
      select scope, status, actor_id, message
      from admin_audit_logs
      where scope = 'notifications'
      order by created_at desc
      limit 1
    `
  );

  const notificationAudit = notificationAuditRows.rows[0];
  assert.ok(notificationAudit, "Expected notifications audit log entry.");
  assert.equal(notificationAudit.scope, "notifications");
  assert.equal(notificationAudit.status, "success");
  assert.equal(notificationAudit.actor_id, adminUser.id);
  assert.match(notificationAudit.message, /Maintenance window/i);
});
