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

const app = createApp();

after(async () => {
  await redis.quit();
  await pool.end();
});

const TEST_TEACHER_EMAIL = `teacher-test-${Date.now()}@test.com`;
const TEST_STUDENT_EMAIL = `student-test-${Date.now()}@test.com`;
const TEST_STUDENT_2_EMAIL = `student2-test-${Date.now()}@test.com`;

test("Teacher creates classroom, student joins, and teacher views roster", async () => {
  const teacherAgent = request.agent(app);
  const studentAgent = request.agent(app);

  // Sign up teacher
  await signUp(teacherAgent, "Teacher Test", TEST_TEACHER_EMAIL);
  // Set teacher role
  const teacherUser = await getSessionUser(teacherAgent);
  await db.update(users).set({ role: "teacher" }).where(eq(users.id, teacherUser.id));

  // Sign up student
  await signUp(studentAgent, "Student Test", TEST_STUDENT_EMAIL);

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

  await signUp(teacherAgent, "Teacher Test 2", TEST_TEACHER_EMAIL);
  const teacherUser = await getSessionUser(teacherAgent);
  await db.update(users).set({ role: "teacher" }).where(eq(users.id, teacherUser.id));

  await signUp(studentAgent, "Student Test 2", TEST_STUDENT_EMAIL);

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

  await signUp(studentAgent, "NonTeacher Test", TEST_STUDENT_2_EMAIL);

  const res = await studentAgent.get("/api/teacher/classrooms");
  assert.equal(res.status, 403, `Expected 403, got ${res.status}`);

  // Cleanup
  const user = await getSessionUser(studentAgent);
  await db.delete(users).where(eq(users.id, user.id));
});

test("Teacher cannot access another teacher's classroom", async () => {
  const teacher1Agent = request.agent(app);
  const teacher2Agent = request.agent(app);

  await signUp(teacher1Agent, "T1", TEST_TEACHER_EMAIL);
  const t1 = await getSessionUser(teacher1Agent);
  await db.update(users).set({ role: "teacher" }).where(eq(users.id, t1.id));

  await signUp(teacher2Agent, "T2", TEST_STUDENT_EMAIL);
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

  await signUp(studentAgent, "Invalid Invite Student", TEST_STUDENT_2_EMAIL);

  const res = await studentAgent.post("/api/classrooms/join").send({ inviteCode: "ZZZZZZ" });
  assert.equal(res.status, 404, `Expected 404, got ${res.status}`);

  // Cleanup
  const user = await getSessionUser(studentAgent);
  await db.delete(users).where(eq(users.id, user.id));
});

test("Teacher posts and views announcements", async () => {
  const teacherAgent = request.agent(app);

  await signUp(teacherAgent, "Announcement Test T", TEST_TEACHER_EMAIL);
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
