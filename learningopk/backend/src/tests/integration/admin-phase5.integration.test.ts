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

const assignRole = async (userId: string, role: "student" | "admin"): Promise<void> => {
  await db.update(users).set({ role }).where(eq(users.id, userId));
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

test("admin users listing supports status filter with suspension metadata", async () => {
  const app = createApp();
  const adminAgent = request.agent(app);
  const studentOneAgent = request.agent(app);
  const studentTwoAgent = request.agent(app);

  await signUp(adminAgent, "Status Admin", `tst_phase5_status_admin_${Date.now()}@example.com`);
  await signUp(studentOneAgent, "Status Student One", `tst_phase5_status_student1_${Date.now()}@example.com`);
  await signUp(studentTwoAgent, "Status Student Two", `tst_phase5_status_student2_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  const studentOneUser = await getSessionUser(studentOneAgent);
  await assignAdminRole(adminUser.id);

  const suspendResponse = await adminAgent.post(`/api/admin/users/${studentOneUser.id}/suspension`).send({
    action: "suspend",
    reason: "Repeated policy violations in forum posts requiring temporary suspension."
  });
  assert.equal(suspendResponse.status, 200);

  const suspendedListing = await adminAgent.get("/api/admin/users").query({
    status: "suspended",
    page: 1,
    pageSize: 20
  });
  assert.equal(suspendedListing.status, 200);
  assert.ok(Array.isArray(suspendedListing.body?.entries), "Expected suspended users listing entries payload.");
  assert.ok(suspendedListing.body.entries.length >= 1, "Expected at least one suspended user row.");
  assert.ok(
    suspendedListing.body.entries.every((row: { status: string }) => row.status === "suspended"),
    "Expected all rows to be suspended."
  );

  const activeListing = await adminAgent.get("/api/admin/users").query({
    status: "active",
    page: 1,
    pageSize: 20
  });
  assert.equal(activeListing.status, 200);
  assert.ok(Array.isArray(activeListing.body?.entries), "Expected active users listing entries payload.");
  assert.ok(activeListing.body.entries.some((row: { status: string }) => row.status === "active"));
});

test("admin suspension mutation is students-only, requires reason, and supports reactivation", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);
  const studentAgent = request.agent(app);
  const adminTargetAgent = request.agent(app);

  await signUp(adminAgent, "Suspend Admin", `tst_phase5_suspend_admin_${Date.now()}@example.com`);
  await signUp(memberAgent, "Suspend Member", `tst_phase5_suspend_member_${Date.now()}@example.com`);
  await signUp(studentAgent, "Suspend Student", `tst_phase5_suspend_student_${Date.now()}@example.com`);
  await signUp(adminTargetAgent, "Suspend Admin Target", `tst_phase5_suspend_target_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  const studentUser = await getSessionUser(studentAgent);
  const adminTargetUser = await getSessionUser(adminTargetAgent);
  await assignRole(adminUser.id, "admin");
  await assignRole(adminTargetUser.id, "admin");

  const unauthenticated = await anonAgent.post(`/api/admin/users/${studentUser.id}/suspension`).send({
    action: "suspend",
    reason: "No auth should fail."
  });
  assert.equal(unauthenticated.status, 401);

  const forbidden = await memberAgent.post(`/api/admin/users/${studentUser.id}/suspension`).send({
    action: "suspend",
    reason: "Non-admin should fail."
  });
  assert.equal(forbidden.status, 403);

  const missingReason = await adminAgent.post(`/api/admin/users/${studentUser.id}/suspension`).send({
    action: "suspend",
    reason: ""
  });
  assert.equal(missingReason.status, 400);

  const suspended = await adminAgent.post(`/api/admin/users/${studentUser.id}/suspension`).send({
    action: "suspend",
    reason: "Repeated policy violations in forum posts."
  });
  assert.equal(suspended.status, 200);
  assert.equal(suspended.body.user.status, "suspended");

  const duplicateSuspend = await adminAgent.post(`/api/admin/users/${studentUser.id}/suspension`).send({
    action: "suspend",
    reason: "Second suspend attempt should conflict."
  });
  assert.equal(duplicateSuspend.status, 409);

  const nonStudentAttempt = await adminAgent.post(`/api/admin/users/${adminTargetUser.id}/suspension`).send({
    action: "suspend",
    reason: "Should fail for non-student role."
  });
  assert.equal(nonStudentAttempt.status, 409);

  const reactivated = await adminAgent.post(`/api/admin/users/${studentUser.id}/suspension`).send({
    action: "reactivate"
  });
  assert.equal(reactivated.status, 200);
  assert.equal(reactivated.body.user.status, "active");

  const duplicateReactivate = await adminAgent.post(`/api/admin/users/${studentUser.id}/suspension`).send({
    action: "reactivate"
  });
  assert.equal(duplicateReactivate.status, 409);
});
