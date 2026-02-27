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

test("admin user role mutation enforces auth/role and applies promote/demote guards", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);
  const studentAgent = request.agent(app);

  await signUp(adminAgent, "Lifecycle Admin", `tst_phase5_admin_${Date.now()}@example.com`);
  await signUp(memberAgent, "Lifecycle Member", `tst_phase5_member_${Date.now()}@example.com`);
  await signUp(studentAgent, "Lifecycle Student", `tst_phase5_student_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  const studentUser = await getSessionUser(studentAgent);
  await assignAdminRole(adminUser.id);

  const unauthenticated = await anonAgent.post(`/api/admin/users/${studentUser.id}/role`).send({ role: "admin" });
  assert.equal(unauthenticated.status, 401);

  const forbidden = await memberAgent.post(`/api/admin/users/${studentUser.id}/role`).send({ role: "admin" });
  assert.equal(forbidden.status, 403);

  const invalidBody = await adminAgent.post(`/api/admin/users/${studentUser.id}/role`).send({ role: "superadmin" });
  assert.equal(invalidBody.status, 400);

  const notFound = await adminAgent.post("/api/admin/users/non-existent-user/role").send({ role: "admin" });
  assert.equal(notFound.status, 404);

  const promoted = await adminAgent.post(`/api/admin/users/${studentUser.id}/role`).send({ role: "admin" });
  assert.equal(promoted.status, 200);
  assert.equal(promoted.body.user.role, "admin");

  const noOp = await adminAgent.post(`/api/admin/users/${studentUser.id}/role`).send({ role: "admin" });
  assert.equal(noOp.status, 409);

  const selfMutation = await adminAgent.post(`/api/admin/users/${adminUser.id}/role`).send({ role: "student" });
  assert.equal(selfMutation.status, 409);

  const demoted = await adminAgent.post(`/api/admin/users/${studentUser.id}/role`).send({ role: "student" });
  assert.equal(demoted.status, 200);
  assert.equal(demoted.body.user.role, "student");
});
