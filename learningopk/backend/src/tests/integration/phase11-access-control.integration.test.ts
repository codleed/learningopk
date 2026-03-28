import assert from "node:assert/strict";
import test from "node:test";

import { eq } from "drizzle-orm";
import request from "supertest";

import { db } from "../../lib/db/index.js";
import {
  boards,
  subjects,
  chapters,
  quizzes,
  quizQuestions,
  mockExams,
  quizAttempts,
  users
} from "../../lib/db/schema.js";
import { createApp } from "../../server.js";

const APP_ORIGIN = "http://localhost:3000";
const TEST_PASSWORD = "StrongPass123";

/**
 * Helper to create a complete mock exam fixture with board, subject, chapter, quiz, and questions
 */
const createMockExamFixture = async () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // Create board
  const [board] = await db
    .insert(boards)
    .values({
      name: `Mock Exam Test Board ${suffix}`,
      slug: `mock-exam-test-board-${suffix}`
    })
    .returning({ id: boards.id });

  // Create subject
  const [subject] = await db
    .insert(subjects)
    .values({
      boardId: board.id,
      grade: "10",
      name: `Mock Exam Test Subject ${suffix}`,
      slug: `mock-exam-test-subject-${suffix}`
    })
    .returning({ id: subjects.id });

  // Create chapter
  const [chapter] = await db
    .insert(chapters)
    .values({
      subjectId: subject.id,
      chapterNumber: 1,
      title: `Mock Exam Test Chapter ${suffix}`,
      slug: `mock-exam-test-chapter-${suffix}`,
      summary: "Test chapter for mock exam.",
      isPublished: true
    })
    .returning({ id: chapters.id });

  // Create quiz (mock_exam type)
  const [quiz] = await db
    .insert(quizzes)
    .values({
      chapterId: chapter.id,
      title: `Mock Exam Quiz ${suffix}`,
      durationMinutes: 60,
      totalMarks: 50,
      type: "mock_exam"
    })
    .returning({ id: quizzes.id, type: quizzes.type });

  // Create quiz questions
  await db.insert(quizQuestions).values([
    {
      quizId: quiz.id,
      chapterId: chapter.id,
      question: "What is 2 + 2?",
      optionA: "3",
      optionB: "4",
      optionC: "5",
      optionD: "6",
      correctOption: "b",
      explanation: "Basic arithmetic: 2 + 2 = 4",
      marks: 5
    },
    {
      quizId: quiz.id,
      chapterId: chapter.id,
      question: "What is the capital of France?",
      optionA: "London",
      optionB: "Berlin",
      optionC: "Paris",
      optionD: "Madrid",
      correctOption: "c",
      explanation: "Paris is the capital of France",
      marks: 5
    }
  ]);

  // Create mock exam entry
  const [mockExam] = await db
    .insert(mockExams)
    .values({
      quizId: quiz.id,
      year: 2024,
      boardId: board.id,
      subjectId: subject.id,
      grade: "10"
    })
    .returning({
      id: mockExams.id,
      quizId: mockExams.quizId
    });

  return {
    mockExamId: mockExam.id,
    quizId: mockExam.quizId,
    boardSlug: board.slug,
    subjectSlug: subject.slug,
    grade: "10"
  };
};

/**
 * Helper to create a user and log in
 */
const createAndLoginUser = async (agent: request.Agent, nameSuffix: string) => {
  const email = `tst_mock_${nameSuffix}_${Date.now()}@example.com`;
  const response = await agent
    .post("/api/auth/sign-up/email")
    .set("origin", APP_ORIGIN)
    .send({
      name: `Mock Test ${nameSuffix}`,
      email,
      password: TEST_PASSWORD
    });

  assert.ok(
    response.status < 400,
    `Expected sign-up success, got ${response.status} ${JSON.stringify(response.body)}`
  );
};

test("Mock exam solutions endpoint requires completion (TASK-59)", async () => {
  const app = createApp();
  const agent = request.agent(app);

  // Create user and authenticate
  await createAndLoginUser(agent, "user1");

  // Create mock exam fixture
  const { mockExamId } = await createMockExamFixture();

  // Test 1: Without attempting exam, accessing questions should return 403
  let response = await agent
    .get(`/api/mock-exams/${mockExamId}/questions`)
    .set("origin", APP_ORIGIN);

  assert.equal(response.status, 403, "Expected 403 for unattempted exam");
  assert.equal(response.body.code, "EXAM_NOT_COMPLETED", "Expected error code EXAM_NOT_COMPLETED");
  assert.ok(
    response.body.error.includes("Solutions only available after completing the exam"),
    "Expected clear error message about completion"
  );

  // Test 2: After completing exam, should return 200 with questions
  // First, get the quiz details to know quizId
  const mockExamResponse = await agent
    .get(`/api/mock-exams/${mockExamId}`)
    .set("origin", APP_ORIGIN);
  assert.equal(mockExamResponse.status, 200);
  const quizId = mockExamResponse.body.mockExam.quizId;

  // Create a completed quiz attempt (simulate exam submission)
  const sessionResponse = await agent.get("/api/auth/get-session");
  const userId = sessionResponse.body?.user?.id;
  assert.ok(userId, "Expected user ID from session");

  await db.insert(quizAttempts).values({
    userId,
    quizId,
    type: "mock_exam",
    answers: {},
    score: 40,
    totalMarks: 50,
    completedAt: new Date()
  });

  response = await agent
    .get(`/api/mock-exams/${mockExamId}/questions`)
    .set("origin", APP_ORIGIN);

  assert.equal(response.status, 200, "Expected 200 after completing exam");
  assert.ok(Array.isArray(response.body.questions), "Expected questions array");
  assert.ok(response.body.questions.length > 0, "Expected non-empty questions");

  // Test 3: Non-existent mock exam returns 404
  response = await agent
    .get("/api/mock-exams/999999/questions")
    .set("origin", APP_ORIGIN);

  assert.equal(response.status, 404, "Expected 404 for non-existent exam");
});

test("Subject progress route uses scoped identifiers (TASK-60)", async () => {
  const app = createApp();
  const agent = request.agent(app);

  // Create two boards with same named subjects to test ambiguity
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // Board A - FBISE
  const [boardA] = await db
    .insert(boards)
    .values({
      name: `FBISE Board ${suffix}`,
      slug: `fbise-${suffix}`
    })
    .returning({ id: boards.id });

  // Board B - BISE
  const [boardB] = await db
    .insert(boards)
    .values({
      name: `BISE Board ${suffix}`,
      slug: `bise-${suffix}`
    })
    .returning({ id: boards.id });

  // Both boards have "Mathematics" subject for grade 10
  const subjectSlug = `mathematics-${suffix}`;

  await db
    .insert(subjects)
    .values([
      {
        boardId: boardA.id,
        grade: "10",
        name: "Mathematics",
        slug: subjectSlug
      },
      {
        boardId: boardB.id,
        grade: "10",
        name: "Mathematics",
        slug: subjectSlug
      }
    ]);

  // Create a user and enroll in board A (simulate via user.board field)
  await createAndLoginUser(agent, "user2");

  // Get session to update user's board - we'll need to update the user record directly
  const session = await agent.get("/api/auth/get-session");
  const userId = session.body?.user?.id;
  assert.ok(userId, "Expected user ID");

  // Update user's board to boardA
  await db
    .update(users)
    .set({ board: boardA.slug })
    .where(eq(users.id, userId));

  // Create chapter for subject in board A
  const [chapterA] = await db
    .insert(chapters)
    .values({
      subjectId: (await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.boardId, boardA.id)))[0].id,
      chapterNumber: 1,
      title: "Algebra Basics",
      slug: `algebra-basics-${suffix}`,
      summary: "Basic algebra chapter",
      isPublished: true
    })
    .returning({ id: chapters.id });

  // Test: Call progress endpoint with boardSlug, grade, subjectSlug
  const response = await agent
    .get(`/api/progress/dashboard/${boardA.slug}/10/${subjectSlug}`)
    .set("origin", APP_ORIGIN);

  assert.equal(response.status, 200, "Expected 200 for valid scoped subject");
  assert.equal(response.body.subject.boardName, boardA.name);
  assert.equal(response.body.subject.name, "Mathematics");

  // Test: Verify we don't get board B subject accidentally
  // If we query with boardB slug, we should get 404 (no progress data)
  const responseB = await agent
    .get(`/api/progress/dashboard/${boardB.slug}/10/${subjectSlug}`)
    .set("origin", APP_ORIGIN);

  assert.equal(
    responseB.status,
    404,
    "Expected 404 when different board has same subject slug but no user progress"
  );

  // Test: Invalid board/grade/subject combination returns 404
  const responseInvalid = await agent
    .get(`/api/progress/dashboard/nonexistent-board/10/${subjectSlug}`)
    .set("origin", APP_ORIGIN);

  assert.equal(responseInvalid.status, 404, "Expected 404 for invalid board");
});

// Run tests
console.log("Running TASK-59 and TASK-60 integration tests...");
