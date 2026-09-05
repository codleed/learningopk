import assert from "node:assert/strict";
import test from "node:test";

import { eq } from "drizzle-orm";
import request from "supertest";

import { db } from "../../lib/db/index.js";
import { boards, subjects, chapters, quizzes, quizQuestions, users } from "../../lib/db/schema.js";
import { createApp } from "../../server.js";

const APP_ORIGIN = "http://localhost:3000";
const TEST_PASSWORD = "StrongPass123";

/**
 * Helper to create a quiz fixture with board, subject, chapter
 */
const createQuizFixture = async () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // Create board
  const boardRows = await db
    .insert(boards)
    .values({
      name: `Quiz Test Board ${suffix}`,
      slug: `quiz-test-board-${suffix}`,
    })
    .returning({ id: boards.id, slug: boards.slug });

  const board = boardRows[0];
  assert.ok(board, "Expected board insert");

  // Create subject
  const subjectRows = await db
    .insert(subjects)
    .values({
      boardId: board.id,
      grade: "10",
      name: `Quiz Test Subject ${suffix}`,
      slug: `quiz-test-subject-${suffix}`,
    })
    .returning({ id: subjects.id, slug: subjects.slug });

  const subject = subjectRows[0];
  assert.ok(subject, "Expected subject insert");

  // Create chapter
  const chapterRows = await db
    .insert(chapters)
    .values({
      subjectId: subject.id,
      chapterNumber: 1,
      title: `Quiz Test Chapter ${suffix}`,
      slug: `quiz-test-chapter-${suffix}`,
      summary: "Test chapter for quiz.",
      isPublished: true,
    })
    .returning({ id: chapters.id });

  const chapter = chapterRows[0];
  assert.ok(chapter, "Expected chapter insert");

  return {
    boardId: board.id,
    subjectId: subject.id,
    chapterId: chapter.id,
    boardSlug: board.slug,
    subjectSlug: subject.slug,
  };
};

/**
 * Helper to create an admin user and log in
 */
const createAndLoginAdmin = async (agent: request.Agent, nameSuffix: string) => {
  const email = `tst_quiz_admin_${nameSuffix}_${Date.now()}@example.com`;
  const response = await agent
    .post("/api/auth/sign-up/email")
    .set("origin", APP_ORIGIN)
    .send({
      name: `Quiz Admin Test ${nameSuffix}`,
      email,
      password: TEST_PASSWORD,
    });

  assert.ok(
    response.status < 400,
    `Expected sign-up success, got ${response.status} ${JSON.stringify(response.body)}`
  );

  // Get session to get user ID and upgrade to admin
  const sessionResponse = await agent.get("/api/auth/get-session");
  const userId = sessionResponse.body?.user?.id;
  assert.ok(userId, "Expected user ID from session");

  // Upgrade user to admin via direct DB update (since we're in test)
  await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));

  return { email, userId };
};

test("Quiz CRUD operations (TASK-QUIZ-CUD)", async () => {
  const app = createApp();
  const agent = request.agent(app);

  // Create admin user and authenticate
  const { userId } = await createAndLoginAdmin(agent, "quiz_admin");

  // Create quiz fixture
  const { chapterId } = await createQuizFixture();

  // TEST 1: Create a new quiz via upsert
  const createResponse = await agent
    .post("/api/admin/content/quizzes")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId,
      title: "Test Quiz",
      durationMinutes: 30,
      type: "chapter_quiz",
    });

  assert.equal(createResponse.status, 201, `Expected 201 Created, got ${createResponse.status}`);
  assert.equal(createResponse.body.created, true, "Expected created=true for new quiz");
  assert.ok(createResponse.body.data?.id, "Expected quiz ID in response");
  assert.equal(createResponse.body.data.title, "Test Quiz");
  assert.equal(createResponse.body.data.durationMinutes, 30);
  assert.equal(createResponse.body.data.totalMarks, 0, "Initial totalMarks should be 0");

  const quizId = createResponse.body.data.id;

  // TEST 2: Upsert the same quiz again (should update, not create)
  const upsertResponse = await agent
    .post("/api/admin/content/quizzes")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId,
      title: "Updated Quiz Title",
      durationMinutes: 45,
      type: "chapter_quiz",
    });

  assert.equal(
    upsertResponse.status,
    200,
    `Expected 200 OK for upsert, got ${upsertResponse.status}`
  );
  assert.equal(upsertResponse.body.created, false, "Expected created=false for existing quiz");
  assert.equal(upsertResponse.body.data.id, quizId, "Quiz ID should remain the same");
  assert.equal(upsertResponse.body.data.title, "Updated Quiz Title");
  assert.equal(upsertResponse.body.data.durationMinutes, 45);

  // TEST 3: Get quiz by chapterId
  const getResponse = await agent
    .get(`/api/admin/content/quizzes?chapterId=${chapterId}`)
    .set("origin", APP_ORIGIN);

  assert.equal(getResponse.status, 200, `Expected 200 OK, got ${getResponse.status}`);
  assert.ok(getResponse.body.data, "Expected quiz data");
  assert.equal(getResponse.body.data.id, quizId);
  assert.equal(getResponse.body.data.title, "Updated Quiz Title");

  // TEST 4: Get quiz with non-existent chapterId returns null data
  const getNullResponse = await agent
    .get("/api/admin/content/quizzes?chapterId=99999")
    .set("origin", APP_ORIGIN);

  assert.equal(getNullResponse.status, 200, `Expected 200 OK, got ${getNullResponse.status}`);
  assert.equal(getNullResponse.body.data, null, "Expected null for non-existent chapter");

  // TEST 5: Update quiz metadata
  const updateResponse = await agent
    .post(`/api/admin/content/quizzes/${quizId}/update`)
    .set("origin", APP_ORIGIN)
    .send({
      title: "Final Quiz Title",
      durationMinutes: 60,
      type: "chapter_quiz",
    });

  assert.equal(updateResponse.status, 200, `Expected 200 OK, got ${updateResponse.status}`);
  assert.equal(updateResponse.body.data.title, "Final Quiz Title");
  assert.equal(updateResponse.body.data.durationMinutes, 60);

  // TEST 6: Add quiz question
  const addQuestionResponse = await agent
    .post("/api/admin/content/quiz-questions")
    .set("origin", APP_ORIGIN)
    .send({
      quizId,
      chapterId,
      question: "What is 2 + 2?",
      optionA: "3",
      optionB: "4",
      optionC: "5",
      optionD: "6",
      correctOption: "b",
      explanation: "Basic arithmetic",
      marks: 5,
    });

  assert.equal(
    addQuestionResponse.status,
    201,
    `Expected 201 Created, got ${addQuestionResponse.status}`
  );
  assert.ok(addQuestionResponse.body.data?.id, "Expected question ID");
  assert.equal(addQuestionResponse.body.data.question, "What is 2 + 2?");
  assert.equal(addQuestionResponse.body.data.marks, 5);

  const questionId = addQuestionResponse.body.data.id;

  // Verify quiz totalMarks was updated
  const quizAfterQuestion = await db
    .select({ totalMarks: quizzes.totalMarks })
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);

  const quizRow1 = quizAfterQuestion[0];
  assert.ok(quizRow1, "Expected quiz after adding question");
  assert.equal(quizRow1.totalMarks, 5, "totalMarks should be updated to 5");

  // TEST 7: Add another question
  const addQuestion2Response = await agent
    .post("/api/admin/content/quiz-questions")
    .set("origin", APP_ORIGIN)
    .send({
      quizId,
      chapterId,
      question: "What is the capital of France?",
      optionA: "London",
      optionB: "Berlin",
      optionC: "Paris",
      optionD: "Madrid",
      correctOption: "c",
      explanation: "Paris is the capital",
      marks: 10,
    });

  assert.equal(addQuestion2Response.status, 201);

  // Verify quiz totalMarks is now 15
  const quizAfter2Questions = await db
    .select({ totalMarks: quizzes.totalMarks })
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);

  const quizRow2 = quizAfter2Questions[0];
  assert.ok(quizRow2, "Expected quiz after adding 2nd question");
  assert.equal(quizRow2.totalMarks, 15, "totalMarks should be updated to 15");

  // TEST 8: List quiz questions
  const listQuestionsResponse = await agent
    .get(`/api/admin/content/quiz-questions?quizId=${quizId}`)
    .set("origin", APP_ORIGIN);

  assert.equal(listQuestionsResponse.status, 200);
  assert.ok(Array.isArray(listQuestionsResponse.body.data), "Expected questions array");
  assert.equal(listQuestionsResponse.body.data.length, 2, "Should have 2 questions");

  // TEST 9: Update quiz question
  const updateQuestionResponse = await agent
    .post(`/api/admin/content/quiz-questions/${questionId}/update`)
    .set("origin", APP_ORIGIN)
    .send({
      question: "What is 3 + 3?",
      optionA: "4",
      optionB: "5",
      optionC: "6",
      optionD: "7",
      correctOption: "c",
      explanation: "Basic arithmetic: 3 + 3 = 6",
      marks: 8,
    });

  assert.equal(updateQuestionResponse.status, 200);
  assert.equal(updateQuestionResponse.body.data.question, "What is 3 + 3?");
  assert.equal(updateQuestionResponse.body.data.marks, 8);

  // Verify quiz totalMarks was recalculated (5 + 8 = 13)
  const quizAfterUpdate = await db
    .select({ totalMarks: quizzes.totalMarks })
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);

  const quizRow3 = quizAfterUpdate[0];
  assert.ok(quizRow3, "Expected quiz after updating question");
  assert.equal(quizRow3.totalMarks, 13, "totalMarks should be updated to 13");

  // TEST 10: Delete quiz question
  const deleteQuestionResponse = await agent
    .post(`/api/admin/content/quiz-questions/${questionId}/delete`)
    .set("origin", APP_ORIGIN);

  assert.equal(deleteQuestionResponse.status, 200);
  assert.equal(deleteQuestionResponse.body.success, true);
  assert.equal(deleteQuestionResponse.body.deletedId, questionId);

  // Verify quiz totalMarks was recalculated (8 only)
  const quizAfterDelete = await db
    .select({ totalMarks: quizzes.totalMarks })
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);

  const quizRow4 = quizAfterDelete[0];
  assert.ok(quizRow4, "Expected quiz after deleting question");
  assert.equal(quizRow4.totalMarks, 8, "totalMarks should be updated to 8 after deletion");

  // TEST 11: Delete quiz (should cascade delete questions)
  const deleteQuizResponse = await agent
    .post(`/api/admin/content/quizzes/${quizId}/delete`)
    .set("origin", APP_ORIGIN);

  assert.equal(deleteQuizResponse.status, 200);
  assert.equal(deleteQuizResponse.body.success, true);
  assert.equal(deleteQuizResponse.body.deletedId, quizId);

  // Verify quiz is deleted
  const deletedQuiz = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);
  assert.equal(deletedQuiz.length, 0, "Quiz should be deleted");

  // Verify questions were cascade deleted
  const deletedQuestions = await db
    .select({ id: quizQuestions.id })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId));
  assert.equal(deletedQuestions.length, 0, "Questions should be cascade deleted");

  // TEST 12: Quiz not found for update/delete
  const notFoundResponse = await agent
    .post("/api/admin/content/quizzes/99999/update")
    .set("origin", APP_ORIGIN)
    .send({ title: "Test" });

  assert.equal(notFoundResponse.status, 404, "Expected 404 for non-existent quiz");

  const notFoundDeleteResponse = await agent
    .post("/api/admin/content/quizzes/99999/delete")
    .set("origin", APP_ORIGIN);

  assert.equal(notFoundDeleteResponse.status, 404, "Expected 404 for non-existent quiz");

  // TEST 13: Question not found
  const questionNotFoundResponse = await agent
    .post("/api/admin/content/quiz-questions/99999/update")
    .set("origin", APP_ORIGIN)
    .send({
      question: "Test",
      optionA: "A",
      optionB: "B",
      optionC: "C",
      optionD: "D",
      correctOption: "a",
      explanation: "Test",
    });

  assert.equal(questionNotFoundResponse.status, 404, "Expected 404 for non-existent question");

  // TEST 14: Validation errors
  const invalidQuizResponse = await agent
    .post("/api/admin/content/quizzes")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId: "invalid",
      title: "",
    });

  assert.equal(invalidQuizResponse.status, 400, "Expected 400 for invalid input");

  const invalidQuestionResponse = await agent
    .post("/api/admin/content/quiz-questions")
    .set("origin", APP_ORIGIN)
    .send({
      quizId: 1,
      question: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctOption: "invalid",
      explanation: "",
    });

  assert.equal(invalidQuestionResponse.status, 400, "Expected 400 for invalid question input");

  // TEST 15: Get quiz without chapterId returns error
  const missingChapterIdResponse = await agent
    .get("/api/admin/content/quizzes")
    .set("origin", APP_ORIGIN);

  assert.equal(missingChapterIdResponse.status, 400, "Expected 400 when chapterId is missing");
});

test("Quiz enforces ONE quiz per chapter via upsert", async () => {
  const app = createApp();
  const agent = request.agent(app);

  // Create admin user
  await createAndLoginAdmin(agent, "upsert_test");

  // Create fixture
  const { chapterId } = await createQuizFixture();

  // Create first quiz
  const firstCreate = await agent
    .post("/api/admin/content/quizzes")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId,
      title: "First Quiz",
      durationMinutes: 30,
    });

  assert.equal(firstCreate.status, 201);
  assert.equal(firstCreate.body.created, true);
  const firstQuizId = firstCreate.body.data.id;

  // Create second quiz for same chapter - should UPDATE the first
  const secondCreate = await agent
    .post("/api/admin/content/quizzes")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId,
      title: "Second Quiz (Updated)",
      durationMinutes: 45,
    });

  assert.equal(secondCreate.status, 200);
  assert.equal(secondCreate.body.created, false);
  assert.equal(secondCreate.body.data.id, firstQuizId, "Should return same quiz ID");
  assert.equal(secondCreate.body.data.title, "Second Quiz (Updated)");

  // Verify only ONE quiz exists for this chapter
  const allQuizzesForChapter = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .where(eq(quizzes.chapterId, chapterId));

  assert.equal(allQuizzesForChapter.length, 1, "Should only have ONE quiz per chapter");
});
