import assert from "node:assert/strict";
import { after, test } from "node:test";

import { eq } from "drizzle-orm";
import request from "supertest";

import { db, pool } from "../../lib/db/index.js";
import { classrooms, classroomStudents, users } from "../../lib/db/schema.js";
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

const getSessionUser = async (agent: AuthAgent): Promise<{ id: string; role?: string }> => {
  const response = await agent.get("/api/auth/get-session").set("origin", APP_ORIGIN);
  assert.equal(response.status, 200);
  return response.body.user;
};

const makeEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;

const app = createApp();

after(async () => {
  await redis.quit();
  await pool.end();
});

test("Teacher creates classroom, student joins, and teacher views roster", async () => {
  const teacherAgent = request.agent(app);
  const studentAgent = request.agent(app);

  // Sign up teacher
  await signUp(teacherAgent, "Teacher Test", makeEmail("teacher"));
  // Set teacher role
  const teacherUser = await getSessionUser(teacherAgent);
  await db.update(users).set({ role: "teacher" }).where(eq(users.id, teacherUser.id));

  // Sign up student
  await signUp(studentAgent, "Student Test", makeEmail("student"));

  // Teacher creates classroom
  const createRes = await teacherAgent
    .post("/api/teacher/classrooms")
    .send({ name: "Test Class 9A", boardId: 1, grade: "9" });
  assert.equal(createRes.status, 201, `Create classroom: ${JSON.stringify(createRes.body)}`);
  assert.ok(createRes.body.data.inviteCode?.length === 6, "Expected 6-char invite code");

  const inviteCode = createRes.body.data.inviteCode;
  const classroomId = createRes.body.data.id;

  // Student joins with invite code
  const joinRes = await studentAgent
    .post("/api/classrooms/join")
    .send({ inviteCode });
  assert.equal(joinRes.status, 200, `Join classroom: ${JSON.stringify(joinRes.body)}`);
  assert.equal(joinRes.body.data.name, "Test Class 9A");

  // Teacher views roster
  const rosterRes = await teacherAgent
    .get(`/api/teacher/classrooms/${classroomId}/students`);
  assert.equal(rosterRes.status, 200);
  assert.equal(rosterRes.body.data.length, 1, `Expected 1 student, got ${rosterRes.body.data.length}`);

  // Cleanup
  await db.delete(classroomStudents).where(eq(classroomStudents.classroomId, classroomId));
  await db.delete(classrooms).where(eq(classrooms.id, classroomId));
  await db.delete(users).where(eq(users.id, teacherUser.id));
  const studentUser = await getSessionUser(studentAgent);
  await db.delete(users).where(eq(users.id, studentUser.id));
});

test("Teacher creates assignment and views submissions", async () => {
  const teacherAgent = request.agent(app);
  const studentAgent = request.agent(app);

  await signUp(teacherAgent, "Teacher Test 2", makeEmail("teacher"));
  const teacherUser = await getSessionUser(teacherAgent);
  await db.update(users).set({ role: "teacher" }).where(eq(users.id, teacherUser.id));

  await signUp(studentAgent, "Student Test 2", makeEmail("student"));

  const createRes = await teacherAgent
    .post("/api/teacher/classrooms")
    .send({ name: "Assignment Test Class", boardId: 1, grade: "10" });
  const classroomId = createRes.body.data.id;
  const inviteCode = createRes.body.data.inviteCode;

  await studentAgent.post("/api/classrooms/join").send({ inviteCode });

  // Create assignment
  const assignRes = await teacherAgent
    .post(`/api/teacher/classrooms/${classroomId}/assignments`)
    .send({
      type: "quiz",
      targetId: 1,
      title: "Test Assignment",
      description: "A test assignment",
    });
  assert.equal(assignRes.status, 201, `Create assignment: ${JSON.stringify(assignRes.body)}`);

  // List assignments
  const listRes = await teacherAgent
    .get(`/api/teacher/classrooms/${classroomId}/assignments`);
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.data.length, 1);

  // Cleanup
  const studentUser = await getSessionUser(studentAgent);
  await db.delete(classroomStudents).where(eq(classroomStudents.classroomId, classroomId));
  await db.delete(classrooms).where(eq(classrooms.id, classroomId));
  await db.delete(users).where(eq(users.id, teacherUser.id));
  await db.delete(users).where(eq(users.id, studentUser.id));
});

test("Non-teacher gets 403 on teacher endpoints", async () => {
  const studentAgent = request.agent(app);

  await signUp(studentAgent, "NonTeacher Test", makeEmail("student2"));

  const res = await studentAgent.get("/api/teacher/classrooms");
  assert.equal(res.status, 403, `Expected 403, got ${res.status}`);

  // Cleanup
  const user = await getSessionUser(studentAgent);
  await db.delete(users).where(eq(users.id, user.id));
});

test("Teacher cannot access another teacher's classroom", async () => {
  const teacher1Agent = request.agent(app);
  const teacher2Agent = request.agent(app);

  await signUp(teacher1Agent, "T1", makeEmail("teacher"));
  const t1 = await getSessionUser(teacher1Agent);
  await db.update(users).set({ role: "teacher" }).where(eq(users.id, t1.id));

  await signUp(teacher2Agent, "T2", makeEmail("student"));
  const t2 = await getSessionUser(teacher2Agent);
  await db.update(users).set({ role: "teacher" }).where(eq(users.id, t2.id));

  // T1 creates classroom
  const createRes = await teacher1Agent
    .post("/api/teacher/classrooms")
    .send({ name: "T1 Class", boardId: 1, grade: "9" });
  const classroomId = createRes.body.data.id;

  // T2 tries to access
  const res = await teacher2Agent.get(`/api/teacher/classrooms/${classroomId}/students`);
  assert.equal(res.status, 403, `Expected 403 for cross-teacher access, got ${res.status}`);

  // Cleanup
  await db.delete(classrooms).where(eq(classrooms.id, classroomId));
  await db.delete(users).where(eq(users.id, t1.id));
  await db.delete(users).where(eq(users.id, t2.id));
});

test("Invalid invite code returns 404", async () => {
  const studentAgent = request.agent(app);

  await signUp(studentAgent, "Invalid Invite Student", makeEmail("student2"));

  const res = await studentAgent.post("/api/classrooms/join").send({ inviteCode: "ZZZZZZ" });
  assert.equal(res.status, 404, `Expected 404, got ${res.status}`);

  // Cleanup
  const user = await getSessionUser(studentAgent);
  await db.delete(users).where(eq(users.id, user.id));
});

test("Teacher posts and views announcements", async () => {
  const teacherAgent = request.agent(app);

  await signUp(teacherAgent, "Announcement Test T", makeEmail("teacher"));
  const t = await getSessionUser(teacherAgent);
  await db.update(users).set({ role: "teacher" }).where(eq(users.id, t.id));

  const createRes = await teacherAgent
    .post("/api/teacher/classrooms")
    .send({ name: "Announcement Class", boardId: 1, grade: "9" });
  const classroomId = createRes.body.data.id;

  // Post announcement
  const postRes = await teacherAgent
    .post(`/api/teacher/classrooms/${classroomId}/announcements`)
    .send({ content: "Welcome to the class!" });
  assert.equal(postRes.status, 201, `Post announcement: ${JSON.stringify(postRes.body)}`);

  // View announcements
  const viewRes = await teacherAgent
    .get(`/api/teacher/classrooms/${classroomId}/announcements`);
  assert.equal(viewRes.status, 200);
  assert.equal(viewRes.body.data.length, 1);
  assert.equal(viewRes.body.data[0].content, "Welcome to the class!");

  // Cleanup
  await db.delete(classrooms).where(eq(classrooms.id, classroomId));
  await db.delete(users).where(eq(users.id, t.id));
});

test("Student cannot join the same classroom twice", async () => {
  const teacherAgent = request.agent(app);
  const studentAgent = request.agent(app);

  await signUp(teacherAgent, "Teacher Dupe", makeEmail("teacher"));
  const teacherUser = await getSessionUser(teacherAgent);
  await db.update(users).set({ role: "teacher" }).where(eq(users.id, teacherUser.id));

  await signUp(studentAgent, "Student Dupe", makeEmail("student"));

  const createRes = await teacherAgent
    .post("/api/teacher/classrooms")
    .send({ name: "Dupe Join Test", boardId: 1, grade: "9" });
  const inviteCode = createRes.body.data.inviteCode;
  const classroomId = createRes.body.data.id;

  // First join should succeed
  const join1 = await studentAgent.post("/api/classrooms/join").send({ inviteCode });
  assert.equal(join1.status, 200, `First join: ${JSON.stringify(join1.body)}`);

  // Second join should be rejected (409)
  const join2 = await studentAgent.post("/api/classrooms/join").send({ inviteCode });
  assert.equal(join2.status, 409, `Expected 409 for duplicate join, got ${join2.status}: ${JSON.stringify(join2.body)}`);

  // Cleanup
  await db.delete(classroomStudents).where(eq(classroomStudents.classroomId, classroomId));
  await db.delete(classrooms).where(eq(classrooms.id, classroomId));
  const studentUser = await getSessionUser(studentAgent);
  await db.delete(users).where(eq(users.id, teacherUser.id));
  await db.delete(users).where(eq(users.id, studentUser.id));
});

test("Teacher cannot delete another teacher's announcement", async () => {
  const teacher1Agent = request.agent(app);
  const teacher2Agent = request.agent(app);

  await signUp(teacher1Agent, "T1 Ann", makeEmail("teacher"));
  const t1 = await getSessionUser(teacher1Agent);
  await db.update(users).set({ role: "teacher" }).where(eq(users.id, t1.id));

  await signUp(teacher2Agent, "T2 Ann", makeEmail("student"));
  const t2 = await getSessionUser(teacher2Agent);
  await db.update(users).set({ role: "teacher" }).where(eq(users.id, t2.id));

  // T1 creates classroom and announcement
  const createRes = await teacher1Agent
    .post("/api/teacher/classrooms")
    .send({ name: "T1 Announcement Class", boardId: 1, grade: "9" });
  const classroomId = createRes.body.data.id;

  const announceRes = await teacher1Agent
    .post(`/api/teacher/classrooms/${classroomId}/announcements`)
    .send({ content: "T1 announcement" });
  assert.equal(announceRes.status, 201);
  const announcementId = announceRes.body.data.id;

  // T2 tries to delete T1's announcement (should fail with 403 because T2 doesn't own the classroom)
  const deleteRes = await teacher2Agent
    .delete(`/api/teacher/classrooms/${classroomId}/announcements/${announcementId}`);
  assert.equal(deleteRes.status, 403, `Expected 403 for cross-teacher delete, got ${deleteRes.status}: ${JSON.stringify(deleteRes.body)}`);

  // T1 CAN delete their own announcement
  const selfDeleteRes = await teacher1Agent
    .delete(`/api/teacher/classrooms/${classroomId}/announcements/${announcementId}`);
  assert.equal(selfDeleteRes.status, 200, `Expected 200 for own delete, got ${selfDeleteRes.status}: ${JSON.stringify(selfDeleteRes.body)}`);

  // Cleanup
  await db.delete(classrooms).where(eq(classrooms.id, classroomId));
  await db.delete(users).where(eq(users.id, t1.id));
  await db.delete(users).where(eq(users.id, t2.id));
});
