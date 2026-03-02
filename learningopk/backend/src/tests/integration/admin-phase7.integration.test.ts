import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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
  name: string;
};

type SeedAuditLogInput = {
  id: string;
  scope: "content" | "forum" | "moderation" | "notifications" | "settings" | "users";
  action: string;
  target: string;
  status: "success" | "failed";
  message: string;
  actorId: string | null;
  actorName: string;
  createdAt: Date;
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
  assert.ok(user?.name, "Expected authenticated session user name.");
  return user;
};

const assignAdminRole = async (userId: string): Promise<void> => {
  await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
};

const suspendUser = async ({
  userId,
  suspendedBy,
  reason
}: {
  userId: string;
  suspendedBy: string;
  reason: string;
}): Promise<void> => {
  await db
    .update(users)
    .set({
      status: "suspended",
      suspendedAt: new Date(),
      suspendedReason: reason,
      suspendedBy
    })
    .where(eq(users.id, userId));
};

const seedModerationFlag = async ({
  status,
  targetSuffix,
  resolvedBy
}: {
  status: "open" | "resolved";
  targetSuffix: string;
  resolvedBy?: string;
}): Promise<void> => {
  const now = new Date();
  await pool.query(
    `
      insert into moderation_flags (
        id,
        created_at,
        target_type,
        target_id,
        target_label,
        reason,
        status,
        resolved_by,
        resolved_at,
        resolution_note
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      randomUUID(),
      now.toISOString(),
      "thread",
      `phase7-thread-${targetSuffix}`,
      `Phase7 thread ${targetSuffix}`,
      `Phase 7 moderation reason ${targetSuffix}`,
      status,
      status === "resolved" ? resolvedBy ?? null : null,
      status === "resolved" ? now.toISOString() : null,
      status === "resolved" ? "Resolved in test fixture" : null
    ]
  );
};

const seedAuditLog = async (input: SeedAuditLogInput): Promise<void> => {
  await pool.query(
    `
      insert into admin_audit_logs (
        id,
        scope,
        action,
        target,
        status,
        message,
        actor_id,
        actor_name,
        created_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      input.id,
      input.scope,
      input.action,
      input.target,
      input.status,
      input.message,
      input.actorId,
      input.actorName,
      input.createdAt.toISOString()
    ]
  );
};

const seedNotification = async ({
  title,
  message,
  createdBy,
  createdAt,
  audience = "students"
}: {
  title: string;
  message: string;
  createdBy: string;
  createdAt: Date;
  audience?: "all" | "students" | "admins";
}): Promise<void> => {
  await pool.query(
    `
      insert into admin_notifications (
        id,
        title,
        message,
        audience,
        status,
        created_by,
        created_at
      ) values ($1, $2, $3, $4, $5, $6, $7)
    `,
    [randomUUID(), title, message, audience, "sent", createdBy, createdAt.toISOString()]
  );
};

after(async () => {
  if (redis.isOpen) {
    await redis.quit();
  }
  await pool.end().catch(() => undefined);
});

test("admin overview enforces auth/role and validates query", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);

  await signUp(adminAgent, "Phase7 Admin", `tst_phase7_admin_${Date.now()}@example.com`);
  await signUp(memberAgent, "Phase7 Member", `tst_phase7_member_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  await assignAdminRole(adminUser.id);

  const unauthenticated = await anonAgent.get("/api/admin/overview");
  assert.equal(unauthenticated.status, 401);

  const forbidden = await memberAgent.get("/api/admin/overview");
  assert.equal(forbidden.status, 403);

  const invalidQuery = await adminAgent.get("/api/admin/overview").query({
    windowDays: 11
  });
  assert.equal(invalidQuery.status, 400);
});

test("admin overview returns KPIs, alerts, and recent activity", async () => {
  const app = createApp();
  const adminAgent = request.agent(app);
  const suspendedOneAgent = request.agent(app);
  const suspendedTwoAgent = request.agent(app);

  await signUp(adminAgent, "Phase7 Ops Admin", `tst_phase7_ops_admin_${Date.now()}@example.com`);
  await signUp(suspendedOneAgent, "Phase7 Suspended One", `tst_phase7_suspend1_${Date.now()}@example.com`);
  await signUp(suspendedTwoAgent, "Phase7 Suspended Two", `tst_phase7_suspend2_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  const suspendedOneUser = await getSessionUser(suspendedOneAgent);
  const suspendedTwoUser = await getSessionUser(suspendedTwoAgent);
  await assignAdminRole(adminUser.id);
  await suspendUser({
    userId: suspendedOneUser.id,
    suspendedBy: adminUser.id,
    reason: "Suspended for Phase 7 threshold fixture one"
  });
  await suspendUser({
    userId: suspendedTwoUser.id,
    suspendedBy: adminUser.id,
    reason: "Suspended for Phase 7 threshold fixture two"
  });

  for (let index = 0; index < 10; index += 1) {
    await seedModerationFlag({
      status: "open",
      targetSuffix: `open-${Date.now()}-${index}`
    });
  }

  await seedModerationFlag({
    status: "resolved",
    targetSuffix: `resolved-${Date.now()}`,
    resolvedBy: adminUser.id
  });

  const now = Date.now();
  for (let index = 0; index < 5; index += 1) {
    await seedAuditLog({
      id: randomUUID(),
      scope: "users",
      action: `Phase7 failed action ${index + 1}`,
      target: `phase7-user-${index}`,
      status: "failed",
      message: `Phase7 failed admin action in last 24h ${index + 1}`,
      actorId: adminUser.id,
      actorName: adminUser.name,
      createdAt: new Date(now - (index + 1) * 60_000)
    });
  }

  await seedAuditLog({
    id: randomUUID(),
    scope: "settings",
    action: "Phase7 old failed action",
    target: "phase7-old",
    status: "failed",
    message: "Old failed action should not count toward 24h KPI",
    actorId: adminUser.id,
    actorName: adminUser.name,
    createdAt: new Date(now - 72 * 60 * 60 * 1000)
  });

  await seedAuditLog({
    id: randomUUID(),
    scope: "moderation",
    action: "Phase7 success action",
    target: "phase7-success",
    status: "success",
    message: "Success action for mixed fixture",
    actorId: adminUser.id,
    actorName: adminUser.name,
    createdAt: new Date(now - 30_000)
  });

  const activityNewest = new Date(now + 2 * 60_000);
  const activityMiddle = new Date(now + 60_000);
  const activityOldest = new Date(now + 30_000);

  await seedAuditLog({
    id: randomUUID(),
    scope: "notifications",
    action: "Phase7 activity oldest",
    target: "phase7-activity-oldest",
    status: "success",
    message: "Phase7 activity ordering oldest",
    actorId: adminUser.id,
    actorName: adminUser.name,
    createdAt: activityOldest
  });

  await seedAuditLog({
    id: randomUUID(),
    scope: "users",
    action: "Phase7 activity middle",
    target: "phase7-activity-middle",
    status: "failed",
    message: "Phase7 activity ordering middle",
    actorId: adminUser.id,
    actorName: adminUser.name,
    createdAt: activityMiddle
  });

  await seedAuditLog({
    id: randomUUID(),
    scope: "content",
    action: "Phase7 activity newest",
    target: "phase7-activity-newest",
    status: "success",
    message: "Phase7 activity ordering newest",
    actorId: adminUser.id,
    actorName: adminUser.name,
    createdAt: activityNewest
  });

  await seedNotification({
    title: "Phase7 recent notification one",
    message: "Phase7 notification inside 30 day window one",
    createdBy: adminUser.id,
    createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000)
  });
  await seedNotification({
    title: "Phase7 recent notification two",
    message: "Phase7 notification inside 30 day window two",
    createdBy: adminUser.id,
    createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000)
  });
  await seedNotification({
    title: "Phase7 recent notification three",
    message: "Phase7 notification inside 30 day window three",
    createdBy: adminUser.id,
    createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000)
  });

  const response = await adminAgent.get("/api/admin/overview").query({
    windowDays: 30
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.windowDays, 30);
  assert.ok(response.body?.kpis, "Expected kpis payload.");
  assert.ok(response.body?.alerts, "Expected alerts payload.");
  assert.ok(Array.isArray(response.body?.recentActivity), "Expected recent activity array.");

  assert.ok(response.body.kpis.openModerationFlags >= 10, "Expected open moderation KPI to include seeded fixtures.");
  assert.ok(response.body.kpis.suspendedUsers >= 2, "Expected suspended users KPI to include seeded fixtures.");
  assert.ok(
    response.body.kpis.failedAdminActionsLast24h >= 5,
    "Expected failed-actions-24h KPI to include seeded fixtures."
  );
  assert.ok(
    response.body.kpis.notificationsSentInWindow >= 3,
    "Expected notifications-window KPI to include seeded fixtures."
  );

  assert.equal(response.body.alerts.showHighPriorityBanner, true);
  assert.ok(Array.isArray(response.body.alerts.reasons), "Expected alert reasons array.");
  assert.ok(response.body.alerts.reasons.length >= 1, "Expected at least one alert reason when threshold is exceeded.");

  assert.ok(response.body.recentActivity.length >= 3, "Expected at least three recent activity rows.");

  const newestIndex = response.body.recentActivity.findIndex(
    (row: { action: string }) => row.action === "Phase7 activity newest"
  );
  const middleIndex = response.body.recentActivity.findIndex(
    (row: { action: string }) => row.action === "Phase7 activity middle"
  );
  const oldestIndex = response.body.recentActivity.findIndex(
    (row: { action: string }) => row.action === "Phase7 activity oldest"
  );

  assert.ok(newestIndex >= 0, "Expected newest fixture in activity stream.");
  assert.ok(middleIndex >= 0, "Expected middle fixture in activity stream.");
  assert.ok(oldestIndex >= 0, "Expected oldest fixture in activity stream.");
  assert.ok(newestIndex < middleIndex, "Expected newest fixture to appear before middle fixture.");
  assert.ok(middleIndex < oldestIndex, "Expected middle fixture to appear before oldest fixture.");
});

test("admin overview applies windowDays to notifications KPI", async () => {
  const app = createApp();
  const adminAgent = request.agent(app);

  await signUp(adminAgent, "Phase7 Window Admin", `tst_phase7_window_admin_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  await assignAdminRole(adminUser.id);

  const now = Date.now();
  await seedNotification({
    title: "Phase7 7day fixture",
    message: "Inside both 7 and 30 windows",
    createdBy: adminUser.id,
    createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000)
  });
  await seedNotification({
    title: "Phase7 30day-only fixture",
    message: "Inside 30 window but outside 7 window",
    createdBy: adminUser.id,
    createdAt: new Date(now - 20 * 24 * 60 * 60 * 1000)
  });

  const windowSeven = await adminAgent.get("/api/admin/overview").query({
    windowDays: 7
  });
  const windowThirty = await adminAgent.get("/api/admin/overview").query({
    windowDays: 30
  });

  assert.equal(windowSeven.status, 200);
  assert.equal(windowThirty.status, 200);
  assert.equal(windowSeven.body.windowDays, 7);
  assert.equal(windowThirty.body.windowDays, 30);

  const countSeven = windowSeven.body.kpis.notificationsSentInWindow as number;
  const countThirty = windowThirty.body.kpis.notificationsSentInWindow as number;

  assert.ok(countThirty >= countSeven, "Expected 30-day notification count to be >= 7-day count.");
  assert.ok(countThirty - countSeven >= 1, "Expected 30-day count to include at least one additional seeded notification.");
});


