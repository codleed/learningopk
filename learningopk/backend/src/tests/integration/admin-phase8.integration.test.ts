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

  const invalidExercise = await adminAgent.post("/api/admin/content/exercises").send({
    chapterId: 1,
    exerciseNumber: "",
    question: "",
    solution: "",
    type: "short"
  });
  assert.equal(invalidExercise.status, 400);
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

  const exerciseResponse = await adminAgent.post("/api/admin/content/exercises").send({
    chapterId,
    exerciseNumber: "Q1",
    question: "Define motion.",
    solution: "Motion is change in position over time.",
    difficulty: "easy",
    type: "short"
  });
  assert.equal(exerciseResponse.status, 201);
  const exerciseId = exerciseResponse.body?.exercise?.id as number;
  assert.equal(typeof exerciseId, "number");

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
        and action in ('Create board', 'Create class', 'Create subject', 'Create chapter', 'Create exercise')
      order by created_at desc
    `,
    [adminUser.id]
  );

  assert.ok(auditRows.rows.length >= 5, "Expected curriculum create audit rows.");
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
  assert.ok(
    auditRows.rows.some((row) => row.action === "Create exercise" && row.status === "success"),
    "Expected successful exercise create audit row."
  );
});

test("admin can read update and delete board class chapter and exercise entities", async () => {
  const app = createApp();
  const adminAgent = request.agent(app);

  await signUp(adminAgent, "CRUD Admin", `tst_curr_crud_admin_${Date.now()}@example.com`);
  const adminUser = await getSessionUser(adminAgent);
  await assignAdminRole(adminUser.id);

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const boardName = `CRUD Board ${suffix}`;
  const boardSlug = `crud-board-${suffix}`;
  const className = `9th ${suffix}`;
  const classSlug = `9th-${suffix}`;
  const subjectName = `Physics ${suffix}`;
  const subjectSlug = `physics-${suffix}`;
  const chapterTitle = `Motion ${suffix}`;
  const chapterSlug = `motion-${suffix}`;

  const boardResponse = await adminAgent.post("/api/admin/content/boards").send({
    name: boardName,
    slug: boardSlug
  });
  assert.equal(boardResponse.status, 201);
  const boardId = boardResponse.body?.board?.id as number;
  assert.equal(typeof boardId, "number");

  const classResponse = await adminAgent.post("/api/admin/content/classes").send({
    boardId,
    name: className,
    slug: classSlug
  });
  assert.equal(classResponse.status, 201);
  const boardClassId = classResponse.body?.class?.id as number;
  assert.equal(typeof boardClassId, "number");

  const subjectResponse = await adminAgent.post("/api/admin/content/subjects").send({
    boardClassId,
    name: subjectName,
    slug: subjectSlug
  });
  assert.equal(subjectResponse.status, 201);
  const subjectId = subjectResponse.body?.subject?.id as number;
  assert.equal(typeof subjectId, "number");

  const chapterResponse = await adminAgent.post("/api/admin/content/chapters").send({
    subjectId,
    chapterNumber: 1,
    title: chapterTitle,
    slug: chapterSlug,
    summary: "Initial summary."
  });
  assert.equal(chapterResponse.status, 201);
  const chapterId = chapterResponse.body?.chapter?.id as number;
  assert.equal(typeof chapterId, "number");

  const exerciseResponse = await adminAgent.post("/api/admin/content/exercises").send({
    chapterId,
    exerciseNumber: "Q1",
    question: "Initial question",
    solution: "Initial solution",
    difficulty: "easy",
    type: "short"
  });
  assert.equal(exerciseResponse.status, 201);
  const exerciseId = exerciseResponse.body?.exercise?.id as number;
  assert.equal(typeof exerciseId, "number");

  const exerciseReadResponse = await adminAgent.get(`/api/admin/content/exercises?chapterId=${chapterId}`);
  assert.equal(exerciseReadResponse.status, 200);
  assert.equal(exerciseReadResponse.body?.exercises?.length, 1);
  assert.equal(exerciseReadResponse.body?.exercises?.[0]?.id, exerciseId);

  const updateBoardResponse = await adminAgent.post(`/api/admin/content/boards/${boardId}/update`).send({
    name: `Updated ${boardName}`,
    slug: `updated-${boardSlug}`
  });
  assert.equal(updateBoardResponse.status, 200);
  assert.equal(updateBoardResponse.body?.board?.name, `Updated ${boardName}`);

  const updateClassResponse = await adminAgent.post(`/api/admin/content/classes/${boardClassId}/update`).send({
    name: `Updated ${className}`,
    slug: `updated-${classSlug}`
  });
  assert.equal(updateClassResponse.status, 200);
  assert.equal(updateClassResponse.body?.class?.name, `Updated ${className}`);

  const updateChapterResponse = await adminAgent.post(`/api/admin/content/chapters/${chapterId}/update`).send({
    chapterNumber: 2,
    title: `Updated ${chapterTitle}`,
    slug: `updated-${chapterSlug}`
  });
  assert.equal(updateChapterResponse.status, 200);
  assert.equal(updateChapterResponse.body?.chapter?.chapterNumber, 2);
  assert.equal(updateChapterResponse.body?.chapter?.title, `Updated ${chapterTitle}`);

  const updateExerciseResponse = await adminAgent.post(`/api/admin/content/exercises/${exerciseId}/update`).send({
    exerciseNumber: "Q2",
    question: "Updated question",
    solution: "Updated solution",
    difficulty: "medium",
    type: "mcq"
  });
  assert.equal(updateExerciseResponse.status, 200);
  assert.equal(updateExerciseResponse.body?.exercise?.exerciseNumber, "Q2");
  assert.equal(updateExerciseResponse.body?.exercise?.difficulty, "medium");
  assert.equal(updateExerciseResponse.body?.exercise?.type, "mcq");

  const readAfterUpdateResponse = await adminAgent.get(`/api/admin/content/exercises?chapterId=${chapterId}`);
  assert.equal(readAfterUpdateResponse.status, 200);
  assert.equal(readAfterUpdateResponse.body?.exercises?.length, 1);
  assert.equal(readAfterUpdateResponse.body?.exercises?.[0]?.exerciseNumber, "Q2");

  const deleteExerciseResponse = await adminAgent.post(`/api/admin/content/exercises/${exerciseId}/delete`).send();
  assert.equal(deleteExerciseResponse.status, 200);

  const readAfterDeleteExerciseResponse = await adminAgent.get(`/api/admin/content/exercises?chapterId=${chapterId}`);
  assert.equal(readAfterDeleteExerciseResponse.status, 200);
  assert.equal(readAfterDeleteExerciseResponse.body?.exercises?.length, 0);

  const deleteChapterResponse = await adminAgent.post(`/api/admin/content/chapters/${chapterId}/delete`).send();
  assert.equal(deleteChapterResponse.status, 200);

  const deleteClassResponse = await adminAgent.post(`/api/admin/content/classes/${boardClassId}/delete`).send();
  assert.equal(deleteClassResponse.status, 200);

  const deleteBoardResponse = await adminAgent.post(`/api/admin/content/boards/${boardId}/delete`).send();
  assert.equal(deleteBoardResponse.status, 200);

  const treeAfterDeleteResponse = await adminAgent.get("/api/admin/content/curriculum");
  assert.equal(treeAfterDeleteResponse.status, 200);
  const boardsPayload = treeAfterDeleteResponse.body?.boards as Array<{ id: number }> | undefined;
  assert.ok(Array.isArray(boardsPayload), "Expected curriculum board payload after deletes.");
  assert.equal(
    boardsPayload.some((entry) => entry.id === boardId),
    false,
    "Expected deleted board to be absent from curriculum tree."
  );

  const auditRows = await pool.query<{
    action: string;
    status: string;
  }>(
    `
      select action, status
      from admin_audit_logs
      where scope = 'content'
        and actor_id = $1
        and action in (
          'Update board',
          'Update class',
          'Update chapter',
          'Update exercise',
          'Delete exercise',
          'Delete chapter',
          'Delete class',
          'Delete board'
        )
      order by created_at desc
    `,
    [adminUser.id]
  );

  assert.ok(auditRows.rows.length >= 8, "Expected CRUD update/delete audit rows.");
  assert.ok(
    auditRows.rows.some((row) => row.action === "Update board" && row.status === "success"),
    "Expected successful board update audit row."
  );
  assert.ok(
    auditRows.rows.some((row) => row.action === "Update class" && row.status === "success"),
    "Expected successful class update audit row."
  );
  assert.ok(
    auditRows.rows.some((row) => row.action === "Update chapter" && row.status === "success"),
    "Expected successful chapter update audit row."
  );
  assert.ok(
    auditRows.rows.some((row) => row.action === "Update exercise" && row.status === "success"),
    "Expected successful exercise update audit row."
  );
  assert.ok(
    auditRows.rows.some((row) => row.action === "Delete exercise" && row.status === "success"),
    "Expected successful exercise delete audit row."
  );
  assert.ok(
    auditRows.rows.some((row) => row.action === "Delete chapter" && row.status === "success"),
    "Expected successful chapter delete audit row."
  );
  assert.ok(
    auditRows.rows.some((row) => row.action === "Delete class" && row.status === "success"),
    "Expected successful class delete audit row."
  );
  assert.ok(
    auditRows.rows.some((row) => row.action === "Delete board" && row.status === "success"),
    "Expected successful board delete audit row."
  );
});



