import assert from "node:assert/strict";
import { after, test } from "node:test";

import { and, eq, sql } from "drizzle-orm";
import request from "supertest";

import { db, pool } from "../../lib/db/index.js";
import { boardClasses, boards, chapters, quizAttempts, quizQuestions, quizzes, subjects } from "../../lib/db/schema.js";
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

  assert.ok(response.status < 400, `Expected sign-up success, got ${response.status} ${JSON.stringify(response.body)}`);
};

const getSessionUserId = async (agent: AuthAgent): Promise<string> => {
  const response = await agent.get("/api/auth/get-session").set("origin", APP_ORIGIN);
  assert.ok(response.status < 400, `Expected session lookup success, got ${response.status} ${JSON.stringify(response.body)}`);

  const userId = response.body?.user?.id;
  assert.equal(typeof userId, "string");
  assert.ok(userId.length > 0, "Expected authenticated session user ID.");
  return userId;
};

const getWrongOption = (correctOption: "a" | "b" | "c" | "d"): "a" | "b" | "c" | "d" => {
  return correctOption === "a" ? "b" : "a";
};

const createChapterQuizFixture = async () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const [board] = await db.insert(boards).values({
    name: `Duel Board ${suffix}`,
    slug: `duel-board-${suffix}`
  }).returning({ id: boards.id });
  assert.ok(board, "Expected board fixture insert.");

  const [boardClass] = await db.insert(boardClasses).values({
    boardId: board.id,
    name: `Class ${suffix}`,
    slug: `class-${suffix}`
  }).returning({ id: boardClasses.id });
  assert.ok(boardClass, "Expected class fixture insert.");

  const [subject] = await db.insert(subjects).values({
    boardId: board.id,
    grade: "9",
    name: `Physics ${suffix}`,
    slug: `physics-${suffix}`,
    description: "Quiz duel fixture."
  }).returning({ id: subjects.id });
  assert.ok(subject, "Expected subject fixture insert.");

  void boardClass;

  const [chapter] = await db.insert(chapters).values({
    subjectId: subject.id,
    chapterNumber: 1,
    title: `Motion ${suffix}`,
    slug: `motion-${suffix}`,
    summary: "Published chapter for quiz duel test.",
    isPublished: true
  }).returning({ id: chapters.id });
  assert.ok(chapter, "Expected chapter fixture insert.");

  const [quiz] = await db.insert(quizzes).values({
    chapterId: chapter.id,
    title: `Chapter Quiz ${suffix}`,
    durationMinutes: 20,
    totalMarks: 10,
    type: "chapter_quiz"
  }).returning({ id: quizzes.id });
  assert.ok(quiz, "Expected quiz fixture insert.");

  const insertedQuestions = await db.insert(quizQuestions).values(
    Array.from({ length: 10 }, (_, index) => ({
      quizId: quiz.id,
      chapterId: chapter.id,
      question: `Question ${index + 1}`,
      optionA: `A${index + 1}`,
      optionB: `B${index + 1}`,
      optionC: `C${index + 1}`,
      optionD: `D${index + 1}`,
      correctOption: (index % 2 === 0 ? "a" : "b") as "a" | "b",
      explanation: `Explanation ${index + 1}`,
      marks: 1
    }))
  ).returning({
    id: quizQuestions.id,
    correctOption: quizQuestions.correctOption
  });

  assert.equal(insertedQuestions.length, 10, "Expected ten quiz questions.");

  return {
    quizId: quiz.id,
    questions: insertedQuestions
  };
};

after(async () => {
  if (redis.isOpen) {
    await redis.quit();
  }
  await pool.end().catch(() => undefined);
});

test("quiz duel flow creates a challenge and returns side-by-side duel scores", async () => {
  const app = createApp();
  const creatorAgent = request.agent(app);
  const recipientAgent = request.agent(app);

  await signUp(creatorAgent, "Creator", `creator-${Date.now()}@example.com`);
  await signUp(recipientAgent, "Recipient", `recipient-${Date.now()}@example.com`);

  const creatorUserId = await getSessionUserId(creatorAgent);
  const recipientUserId = await getSessionUserId(recipientAgent);
  const fixture = await createChapterQuizFixture();

  const creatorAnswers = Object.fromEntries(
    fixture.questions.map((question) => [String(question.id), question.correctOption])
  ) as Record<string, "a" | "b" | "c" | "d">;

  const creatorSubmitResponse = await creatorAgent.post("/api/quiz/submit").send({
    quizId: fixture.quizId,
    answers: creatorAnswers
  });

  assert.equal(creatorSubmitResponse.status, 200);
  assert.equal(creatorSubmitResponse.body?.score, 10);

  const createChallengeResponse = await creatorAgent.post("/api/quiz/challenges").send({
    quizId: fixture.quizId,
    attemptId: creatorSubmitResponse.body?.attemptId
  });

  assert.equal(createChallengeResponse.status, 201);
  assert.equal(typeof createChallengeResponse.body?.data?.challengeId, "string");
  assert.equal(createChallengeResponse.body?.data?.quizId, fixture.quizId);

  const challengeId = createChallengeResponse.body.data.challengeId as string;

  const fetchChallengeResponse = await recipientAgent.get(`/api/quiz/challenges/${challengeId}`);
  assert.equal(fetchChallengeResponse.status, 200);
  assert.equal(fetchChallengeResponse.body?.data?.status, "open");
  assert.equal(fetchChallengeResponse.body?.data?.quizId, fixture.quizId);
  assert.equal(fetchChallengeResponse.body?.data?.challenger?.score, 10);
  assert.equal(fetchChallengeResponse.body?.data?.challenger?.percentage, 100);

  const recipientAnswers = Object.fromEntries(
    fixture.questions.map((question, index) => [
      String(question.id),
      index < 5 ? question.correctOption : getWrongOption(question.correctOption)
    ])
  ) as Record<string, "a" | "b" | "c" | "d">;

  const recipientSubmitResponse = await recipientAgent.post("/api/quiz/submit").send({
    quizId: fixture.quizId,
    answers: recipientAnswers,
    challengeId
  });

  assert.equal(recipientSubmitResponse.status, 200);
  assert.equal(recipientSubmitResponse.body?.score, 5);
  assert.equal(recipientSubmitResponse.body?.duel?.challengeId, challengeId);
  assert.equal(recipientSubmitResponse.body?.duel?.challenger?.score, 10);
  assert.equal(recipientSubmitResponse.body?.duel?.recipient?.score, 5);
  assert.equal(recipientSubmitResponse.body?.duel?.recipient?.isCurrentUser, true);

  const recipientAttempts = await db.select({ id: quizAttempts.id }).from(quizAttempts).where(
    and(eq(quizAttempts.userId, recipientUserId), eq(quizAttempts.quizId, fixture.quizId))
  );

  assert.equal(recipientAttempts.length, 1);

  const creatorAttempts = await db.select({ id: quizAttempts.id }).from(quizAttempts).where(
    and(eq(quizAttempts.userId, creatorUserId), eq(quizAttempts.quizId, fixture.quizId))
  );

  assert.equal(creatorAttempts.length, 1);
});

test("quiz duel challenge expires after 48 hours", async () => {
  const app = createApp();
  const creatorAgent = request.agent(app);
  const recipientAgent = request.agent(app);

  await signUp(creatorAgent, "Creator Expiry", `creator-expiry-${Date.now()}@example.com`);
  await signUp(recipientAgent, "Recipient Expiry", `recipient-expiry-${Date.now()}@example.com`);

  const fixture = await createChapterQuizFixture();
  const creatorAnswers = Object.fromEntries(
    fixture.questions.map((question) => [String(question.id), question.correctOption])
  ) as Record<string, "a" | "b" | "c" | "d">;

  const creatorSubmitResponse = await creatorAgent.post("/api/quiz/submit").send({
    quizId: fixture.quizId,
    answers: creatorAnswers
  });

  assert.equal(creatorSubmitResponse.status, 200);

  const createChallengeResponse = await creatorAgent.post("/api/quiz/challenges").send({
    quizId: fixture.quizId,
    attemptId: creatorSubmitResponse.body?.attemptId
  });

  assert.equal(createChallengeResponse.status, 201);

  const challengeId = createChallengeResponse.body.data.challengeId as string;

  await db.execute(sql`update quiz_duel_challenges set expires_at = now() - interval '1 hour' where id = ${challengeId}`);

  const fetchChallengeResponse = await recipientAgent.get(`/api/quiz/challenges/${challengeId}`);
  assert.equal(fetchChallengeResponse.status, 200);
  assert.equal(fetchChallengeResponse.body?.data?.status, "expired");

  const expiredSubmitResponse = await recipientAgent.post("/api/quiz/submit").send({
    quizId: fixture.quizId,
    answers: creatorAnswers,
    challengeId
  });

  assert.equal(expiredSubmitResponse.status, 410);
});
