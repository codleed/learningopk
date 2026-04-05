import assert from "node:assert/strict";
import { after, describe, test } from "node:test";

import request from "supertest";

import { db, pool } from "../../lib/db/index.js";
import { redis } from "../../lib/redis.js";
import {
  boards,
  subjects,
  chapters,
  quizzes,
  quizQuestions,
  mockExams,
  quizAttempts
} from "../../lib/db/schema.js";
import { createApp } from "../../server.js";

const APP_ORIGIN = "http://localhost:3000";
const TEST_PASSWORD = "StrongPass123!";

after(async () => {
  await redis.quit();
  await pool.end();
});

/**
 * Creates a full mock exam fixture (board → subject → chapter → quiz → questions → mock_exam)
 * and returns the mock exam ID and quiz ID.
 */
const createMockExamFixture = async () => {
  const suffix = `sol_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  const [board] = await db
    .insert(boards)
    .values({ name: `Board ${suffix}`, slug: `board-${suffix}` })
    .returning({ id: boards.id });
  assert.ok(board, "board created");

  const [subject] = await db
    .insert(subjects)
    .values({
      boardId: board.id,
      grade: "10",
      name: `Subject ${suffix}`,
      slug: `subject-${suffix}`
    })
    .returning({ id: subjects.id });
  assert.ok(subject, "subject created");

  const [chapter] = await db
    .insert(chapters)
    .values({
      subjectId: subject.id,
      chapterNumber: 1,
      title: `Chapter ${suffix}`,
      slug: `chapter-${suffix}`,
      summary: "Test chapter",
      isPublished: true
    })
    .returning({ id: chapters.id });
  assert.ok(chapter, "chapter created");

  const [quiz] = await db
    .insert(quizzes)
    .values({
      chapterId: chapter.id,
      title: `Quiz ${suffix}`,
      durationMinutes: 60,
      totalMarks: 10,
      type: "mock_exam"
    })
    .returning({ id: quizzes.id });
  assert.ok(quiz, "quiz created");

  await db.insert(quizQuestions).values({
    quizId: quiz.id,
    chapterId: chapter.id,
    question: "What is 1 + 1?",
    optionA: "1",
    optionB: "2",
    optionC: "3",
    optionD: "4",
    correctOption: "b",
    explanation: "1 + 1 = 2",
    marks: 10
  });

  const [mockExam] = await db
    .insert(mockExams)
    .values({
      quizId: quiz.id,
      year: 2024,
      boardId: board.id,
      subjectId: subject.id,
      grade: "10",
      title: `Mock Exam ${suffix}`,
      durationMinutes: 60,
      totalMarks: 10
    })
    .returning({ id: mockExams.id, quizId: mockExams.quizId });
  assert.ok(mockExam, "mock exam created");

  return { mockExamId: mockExam.id, quizId: mockExam.quizId };
};

/**
 * Registers a new user via the auth API and returns the authenticated agent.
 */
const signUpAndLogin = async (app: ReturnType<typeof createApp>) => {
  const agent = request.agent(app);
  const email = `sol_test_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;

  const res = await agent
    .post("/api/auth/sign-up/email")
    .set("origin", APP_ORIGIN)
    .send({ name: "Solution Tester", email, password: TEST_PASSWORD });

  assert.ok(res.status < 400, `sign-up failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
};

describe("GET /api/mock-exams/:id/questions – solution access control", () => {
  test("unauthenticated request returns 401", async () => {
    const app = createApp();
    const { mockExamId } = await createMockExamFixture();

    const res = await request(app)
      .get(`/api/mock-exams/${mockExamId}/questions`)
      .set("origin", APP_ORIGIN);

    assert.equal(res.status, 401, "Expected 401 for unauthenticated access");
  });

  test("authenticated user without a completed attempt receives 403 EXAM_NOT_COMPLETED", async () => {
    const app = createApp();
    const agent = await signUpAndLogin(app);
    const { mockExamId } = await createMockExamFixture();

    const res = await agent
      .get(`/api/mock-exams/${mockExamId}/questions`)
      .set("origin", APP_ORIGIN);

    assert.equal(res.status, 403, "Expected 403 when exam not attempted");
    assert.equal(
      res.body.code,
      "EXAM_NOT_COMPLETED",
      "Expected EXAM_NOT_COMPLETED error code"
    );
    assert.ok(
      typeof res.body.error === "string" && res.body.error.length > 0,
      "Expected a descriptive error message"
    );
  });

  test("authenticated user with a completed attempt receives 200 with questions and correct answers", async () => {
    const app = createApp();
    const agent = await signUpAndLogin(app);
    const { mockExamId, quizId } = await createMockExamFixture();

    // Retrieve authenticated user's ID from session
    const sessionRes = await agent
      .get("/api/auth/get-session")
      .set("origin", APP_ORIGIN);
    const userId: unknown = sessionRes.body?.user?.id;
    assert.ok(typeof userId === "string" && userId.length > 0, "Expected user ID from session");

    // Insert a completed quiz attempt
    await db.insert(quizAttempts).values({
      userId: userId as string,
      quizId,
      type: "mock_exam",
      answers: {},
      score: 10,
      totalMarks: 10,
      completedAt: new Date()
    });

    const res = await agent
      .get(`/api/mock-exams/${mockExamId}/questions`)
      .set("origin", APP_ORIGIN);

    assert.equal(res.status, 200, "Expected 200 after exam completion");
    assert.ok(Array.isArray(res.body.questions), "Expected questions array in response");
    assert.ok(res.body.questions.length > 0, "Expected at least one question");

    // Verify that correct answers are included (this is the key security invariant)
    const firstQuestion = res.body.questions[0];
    assert.ok(
      typeof firstQuestion.correctOption === "string",
      "Expected correctOption to be present in the response"
    );
  });
});
