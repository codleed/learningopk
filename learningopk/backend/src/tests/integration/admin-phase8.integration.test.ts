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

after(async () => {
  if (redis.isOpen) {
    await redis.quit();
  }
  await pool.end().catch(() => undefined);
});

test("admin curriculum management endpoints enforce auth/role and validate payloads", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);

  await signUp(adminAgent, "Curriculum Admin", `tst_curr_admin_${Date.now()}@example.com`);
  await signUp(memberAgent, "Curriculum Member", `tst_curr_member_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  await assignAdminRole(adminUser.id);

  const unauthenticated = await anonAgent.post("/api/admin/content/boards").send({
    name: "Punjab Board",
    slug: "punjab-board"
  });
  assert.equal(unauthenticated.status, 401);

  const forbidden = await memberAgent.post("/api/admin/content/boards").send({
    name: "Punjab Board",
    slug: "punjab-board"
  });
  assert.equal(forbidden.status, 403);

  const invalidBoard = await adminAgent.post("/api/admin/content/boards").send({
    name: "x",
    slug: ""
  });
  assert.equal(invalidBoard.status, 400);

  const invalidClass = await adminAgent.post("/api/admin/content/classes").send({
    boardId: "invalid",
    name: "",
    slug: ""
  });
  assert.equal(invalidClass.status, 400);

  const invalidSubject = await adminAgent.post("/api/admin/content/subjects").send({
    boardClassId: 1,
    name: "",
    slug: ""
  });
  assert.equal(invalidSubject.status, 400);

  const invalidChapter = await adminAgent.post("/api/admin/content/chapters").send({
    subjectId: 1,
    chapterNumber: 0,
    title: "",
    slug: "",
    summary: ""
  });
  assert.equal(invalidChapter.status, 400);
});

test("admin can create board class subject chapter hierarchy and fetch nested curriculum tree", async () => {
  const app = createApp();
  const adminAgent = request.agent(app);

  await signUp(adminAgent, "Hierarchy Admin", `tst_curr_hierarchy_admin_${Date.now()}@example.com`);
  const adminUser = await getSessionUser(adminAgent);
  await assignAdminRole(adminUser.id);

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const boardSlug = `balochistan-${suffix}`;
  const classSlug = `9th-${suffix}`;
  const subjectSlug = `physics-${suffix}`;
  const chapterSlug = `motion-${suffix}`;

  const boardResponse = await adminAgent.post("/api/admin/content/boards").send({
    name: "Balochistan Board",
    slug: boardSlug
  });
  assert.equal(boardResponse.status, 201);
  assert.equal(typeof boardResponse.body?.board?.id, "number");

  const boardId = boardResponse.body?.board?.id as number;

  const classResponse = await adminAgent.post("/api/admin/content/classes").send({
    boardId,
    name: "9th",
    slug: classSlug
  });
  assert.equal(classResponse.status, 201);
  const boardClassId = classResponse.body?.class?.id as number;
  assert.equal(typeof boardClassId, "number");

  const subjectResponse = await adminAgent.post("/api/admin/content/subjects").send({
    boardClassId,
    name: "Physics",
    slug: subjectSlug,
    description: "Physics for class 9"
  });
  assert.equal(subjectResponse.status, 201);
  const subjectId = subjectResponse.body?.subject?.id as number;
  assert.equal(typeof subjectId, "number");

  const chapterResponse = await adminAgent.post("/api/admin/content/chapters").send({
    subjectId,
    chapterNumber: 1,
    title: "Motion and Force",
    slug: chapterSlug,
    summary: "Intro summary for motion and force.",
    isPublished: false
  });
  assert.equal(chapterResponse.status, 201);
  const chapterId = chapterResponse.body?.chapter?.id as number;
  assert.equal(typeof chapterId, "number");

  const treeResponse = await adminAgent.get("/api/admin/content/curriculum");
  assert.equal(treeResponse.status, 200);

  const boardsPayload = treeResponse.body?.boards as
    | Array<{
        id: number;
        slug: string;
        classes: Array<{
          id: number;
          slug: string;
          subjects: Array<{
            id: number;
            slug: string;
            chapters: Array<{ id: number; slug: string }>;
          }>;
        }>;
      }>
    | undefined;

  assert.ok(Array.isArray(boardsPayload), "Expected curriculum board payload.");
  const createdBoard = boardsPayload?.find((entry) => entry.id === boardId);
  assert.ok(createdBoard, "Expected created board in curriculum tree.");

  const createdClass = createdBoard?.classes.find((entry) => entry.id === boardClassId);
  assert.ok(createdClass, "Expected created class in curriculum tree.");

  const createdSubject = createdClass?.subjects.find((entry) => entry.id === subjectId);
  assert.ok(createdSubject, "Expected created subject in curriculum tree.");

  const createdChapter = createdSubject?.chapters.find((entry) => entry.id === chapterId);
  assert.ok(createdChapter, "Expected created chapter in curriculum tree.");

  const auditRows = await pool.query<{
    scope: string;
    status: string;
    action: string;
    actor_id: string | null;
  }>(
    `
      select scope, status, action, actor_id
      from admin_audit_logs
      where scope = 'content'
        and actor_id = $1
        and action in ('Create board', 'Create class', 'Create subject', 'Create chapter')
      order by created_at desc
    `,
    [adminUser.id]
  );

  assert.ok(auditRows.rows.length >= 4, "Expected curriculum create audit rows.");
  assert.ok(
    auditRows.rows.some((row) => row.action === "Create board" && row.status === "success"),
    "Expected successful board create audit row."
  );
  assert.ok(
    auditRows.rows.some((row) => row.action === "Create class" && row.status === "success"),
    "Expected successful class create audit row."
  );
  assert.ok(
    auditRows.rows.some((row) => row.action === "Create subject" && row.status === "success"),
    "Expected successful subject create audit row."
  );
  assert.ok(
    auditRows.rows.some((row) => row.action === "Create chapter" && row.status === "success"),
    "Expected successful chapter create audit row."
  );
});



