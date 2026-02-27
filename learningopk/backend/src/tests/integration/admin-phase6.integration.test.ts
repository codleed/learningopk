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
  assert.ok(user?.name, "Expected authenticated session user name.");
  return user;
};

const assignAdminRole = async (userId: string): Promise<void> => {
  await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
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

after(async () => {
  if (redis.isOpen) {
    await redis.quit();
  }
  await pool.end().catch(() => undefined);
});

test("admin aggregated audit logs enforce auth/role and support scope+status+search filters", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);

  await signUp(adminAgent, "Phase6 Admin", `tst_phase6_admin_${Date.now()}@example.com`);
  await signUp(memberAgent, "Phase6 Member", `tst_phase6_member_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  const memberUser = await getSessionUser(memberAgent);
  await assignAdminRole(adminUser.id);

  const now = Date.now();
  await seedAuditLog({
    id: randomUUID(),
    scope: "users",
    action: "Promote user role",
    target: "Ali Hassan <ali.hassan@example.com>",
    status: "success",
    message: "Updated role to admin",
    actorId: adminUser.id,
    actorName: adminUser.name,
    createdAt: new Date(now - 2000)
  });
  await seedAuditLog({
    id: randomUUID(),
    scope: "users",
    action: "Demote user role",
    target: "Fatima Noor <fatima.noor@example.com>",
    status: "failed",
    message: "Self role mutation is not allowed",
    actorId: adminUser.id,
    actorName: adminUser.name,
    createdAt: new Date(now - 1500)
  });
  await seedAuditLog({
    id: randomUUID(),
    scope: "moderation",
    action: "Resolve flag",
    target: "thread:Kinematics help",
    status: "success",
    message: "Resolved abusive report",
    actorId: memberUser.id,
    actorName: memberUser.name,
    createdAt: new Date(now - 1000)
  });
  await seedAuditLog({
    id: randomUUID(),
    scope: "settings",
    action: "Update setting",
    target: "forum_auto_lock_hours",
    status: "success",
    message: "Updated forum_auto_lock_hours to 48",
    actorId: adminUser.id,
    actorName: adminUser.name,
    createdAt: new Date(now - 500)
  });

  const unauthenticated = await anonAgent.get("/api/admin/audit-logs");
  assert.equal(unauthenticated.status, 401);

  const forbidden = await memberAgent.get("/api/admin/audit-logs");
  assert.equal(forbidden.status, 403);

  const listing = await adminAgent.get("/api/admin/audit-logs").query({
    page: 1,
    pageSize: 50
  });
  assert.equal(listing.status, 200);
  assert.ok(Array.isArray(listing.body?.entries), "Expected audit entries payload.");
  assert.ok(listing.body.entries.length >= 4, "Expected seeded audit rows in aggregate listing.");

  const usersOnly = await adminAgent.get("/api/admin/audit-logs").query({
    scope: "users",
    page: 1,
    pageSize: 50
  });
  assert.equal(usersOnly.status, 200);
  assert.ok(usersOnly.body.entries.length >= 2, "Expected users-scope rows.");
  assert.ok(
    usersOnly.body.entries.every((row: { scope: string }) => row.scope === "users"),
    "Expected all scoped rows to match users."
  );

  const successOnly = await adminAgent.get("/api/admin/audit-logs").query({
    status: "success",
    page: 1,
    pageSize: 50
  });
  assert.equal(successOnly.status, 200);
  assert.ok(successOnly.body.entries.length >= 3, "Expected success rows.");
  assert.ok(
    successOnly.body.entries.every((row: { status: string }) => row.status === "success"),
    "Expected all status-filtered rows to be success."
  );

  const searchHit = await adminAgent.get("/api/admin/audit-logs").query({
    q: "auto_lock",
    page: 1,
    pageSize: 50
  });
  assert.equal(searchHit.status, 200);
  assert.ok(
    searchHit.body.entries.some((row: { message: string; target: string }) =>
      `${row.message} ${row.target}`.toLowerCase().includes("auto_lock")
    ),
    "Expected search query to match seeded setting audit row."
  );
});

test("admin aggregated audit logs paginate deterministically", async () => {
  const app = createApp();
  const adminAgent = request.agent(app);

  await signUp(adminAgent, "Phase6 Pagination Admin", `tst_phase6_pagination_admin_${Date.now()}@example.com`);
  const adminUser = await getSessionUser(adminAgent);
  await assignAdminRole(adminUser.id);

  const base = Date.now();
  const seededIds = [randomUUID(), randomUUID(), randomUUID()];
  await seedAuditLog({
    id: seededIds[0],
    scope: "content",
    action: "Publish chapter",
    target: "Physics - Motion",
    status: "success",
    message: "Chapter published successfully.",
    actorId: adminUser.id,
    actorName: adminUser.name,
    createdAt: new Date(base - 3000)
  });
  await seedAuditLog({
    id: seededIds[1],
    scope: "forum",
    action: "Pin thread",
    target: "Need help with vectors",
    status: "success",
    message: "Thread pinned successfully.",
    actorId: adminUser.id,
    actorName: adminUser.name,
    createdAt: new Date(base - 2000)
  });
  await seedAuditLog({
    id: seededIds[2],
    scope: "users",
    action: "Suspend user",
    target: "Ahsan <ahsan@example.com>",
    status: "success",
    message: "Suspended user for repeated policy violations.",
    actorId: adminUser.id,
    actorName: adminUser.name,
    createdAt: new Date(base - 1000)
  });

  const pageOne = await adminAgent.get("/api/admin/audit-logs").query({
    page: 1,
    pageSize: 1
  });
  assert.equal(pageOne.status, 200);
  assert.equal(pageOne.body.page, 1);
  assert.equal(pageOne.body.pageSize, 1);
  assert.equal(pageOne.body.entries.length, 1);
  assert.equal(pageOne.body.hasMore, true);

  const firstId = pageOne.body.entries[0]?.id as string;
  assert.ok(firstId, "Expected first page entry id.");

  const pageTwo = await adminAgent.get("/api/admin/audit-logs").query({
    page: 2,
    pageSize: 1
  });
  assert.equal(pageTwo.status, 200);
  assert.equal(pageTwo.body.page, 2);
  assert.equal(pageTwo.body.pageSize, 1);
  assert.equal(pageTwo.body.entries.length, 1);

  const secondId = pageTwo.body.entries[0]?.id as string;
  assert.ok(secondId, "Expected second page entry id.");
  assert.notEqual(firstId, secondId, "Expected different audit rows across pages.");
});
