import { and, eq } from "drizzle-orm";
import request from "supertest";
import { z } from "zod";

import { createApp } from "../server.js";
import { db, pool } from "../lib/db/index.js";
import { quizAttempts, quizQuestions, quizzes, userProgress } from "../lib/db/schema.js";

const quizSubmitResponseSchema = z.object({
  attemptId: z.string().uuid(),
  quizId: z.number().int().positive(),
  quizType: z.enum(["chapter_quiz", "mock_exam"]),
  score: z.number().int().nonnegative(),
  totalMarks: z.number().int().positive(),
  percentage: z.number().int().min(0).max(100),
  timeSpentSeconds: z.number().int().nonnegative(),
  completedAt: z.string().datetime(),
  questionResults: z.array(
    z.object({
      questionId: z.number().int().positive(),
      question: z.string(),
      selectedOption: z.enum(["a", "b", "c", "d"]).nullable(),
      correctOption: z.enum(["a", "b", "c", "d"]),
      isCorrect: z.boolean(),
      explanation: z.string(),
      marks: z.number().int().positive(),
      awardedMarks: z.number().int().nonnegative()
    })
  )
});

const run = async (): Promise<void> => {
  const app = createApp();
  const agent = request.agent(app);
  const email = `quiz_phase_${Date.now()}@example.com`;
  const password = "StrongPass123";

  const signUpResponse = await agent.post("/api/auth/sign-up/email").set("origin", "http://localhost:3000").send({
    name: "Quiz Verification User",
    email,
    password
  });

  if (signUpResponse.status >= 400) {
    throw new Error(`Sign-up failed: ${signUpResponse.status} ${JSON.stringify(signUpResponse.body)}`);
  }

  const sessionResponse = await agent.get("/api/auth/get-session").set("origin", "http://localhost:3000");
  const userId = z
    .object({
      user: z.object({
        id: z.string().min(1)
      })
    })
    .safeParse(sessionResponse.body).data?.user.id;

  if (!userId) {
    throw new Error(`Session fetch failed: ${sessionResponse.status} ${JSON.stringify(sessionResponse.body)}`);
  }

  const quizRows = await db
    .select({
      id: quizzes.id,
      chapterId: quizzes.chapterId
    })
    .from(quizzes)
    .where(eq(quizzes.type, "chapter_quiz"))
    .limit(1);
  const quizRow = quizRows[0];
  if (!quizRow) {
    throw new Error("No chapter quiz found. Seed data is required before verification.");
  }

  const questionRows = await db
    .select({
      id: quizQuestions.id,
      correctOption: quizQuestions.correctOption
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizRow.id));

  if (questionRows.length < 2) {
    throw new Error("Expected at least 2 quiz questions to verify best score retakes.");
  }

  const firstQuestion = questionRows[0];
  if (!firstQuestion) {
    throw new Error("First question missing unexpectedly.");
  }

  const firstAttemptAnswers: Record<string, "a" | "b" | "c" | "d"> = {
    [String(firstQuestion.id)]: firstQuestion.correctOption
  };

  const firstSubmitResponse = await agent.post("/api/quiz/submit").send({
    quizId: quizRow.id,
    answers: firstAttemptAnswers
  });

  if (firstSubmitResponse.status !== 200) {
    throw new Error(`Expected first quiz submission to return 200, got ${firstSubmitResponse.status}`);
  }

  const firstResult = quizSubmitResponseSchema.parse(firstSubmitResponse.body);

  const allCorrectAnswers = Object.fromEntries(
    questionRows.map((question) => [String(question.id), question.correctOption])
  ) as Record<string, "a" | "b" | "c" | "d">;

  const secondSubmitResponse = await agent.post("/api/quiz/submit").send({
    quizId: quizRow.id,
    answers: allCorrectAnswers
  });

  if (secondSubmitResponse.status !== 200) {
    throw new Error(`Expected second quiz submission to return 200, got ${secondSubmitResponse.status}`);
  }

  const secondResult = quizSubmitResponseSchema.parse(secondSubmitResponse.body);
  if (secondResult.score < firstResult.score) {
    throw new Error("Second score should not be lower than first when all answers are correct.");
  }

  const thirdSubmitResponse = await agent.post("/api/quiz/submit").send({
    quizId: quizRow.id,
    answers: {}
  });

  if (thirdSubmitResponse.status !== 200) {
    throw new Error(`Expected third quiz submission to return 200, got ${thirdSubmitResponse.status}`);
  }

  const thirdResult = quizSubmitResponseSchema.parse(thirdSubmitResponse.body);
  if (thirdResult.score > secondResult.score) {
    throw new Error("Third score should not exceed the all-correct second attempt.");
  }

  const attemptRows = await db
    .select({
      id: quizAttempts.id,
      score: quizAttempts.score
    })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizRow.id)));

  if (attemptRows.length !== 3) {
    throw new Error(`Expected 3 persisted quiz_attempts rows, found ${attemptRows.length}`);
  }

  const progressRows = await db
    .select({
      quizBestScore: userProgress.quizBestScore,
      quizAttemptsCount: userProgress.quizAttemptsCount
    })
    .from(userProgress)
    .where(and(eq(userProgress.userId, userId), eq(userProgress.chapterId, quizRow.chapterId)))
    .limit(1);
  const progressRow = progressRows[0];

  if (!progressRow) {
    throw new Error("Expected user_progress row to be upserted for quiz submissions.");
  }

  if (progressRow.quizAttemptsCount !== 3) {
    throw new Error(`Expected quizAttemptsCount=3, got ${progressRow.quizAttemptsCount}`);
  }

  if (progressRow.quizBestScore !== secondResult.score) {
    throw new Error(
      `Expected best score to remain second-attempt score ${secondResult.score}, got ${progressRow.quizBestScore}`
    );
  }

  console.log(`FIRST_SCORE=${firstResult.score}`);
  console.log(`SECOND_SCORE=${secondResult.score}`);
  console.log(`THIRD_SCORE=${thirdResult.score}`);
  console.log(`ATTEMPT_ROWS=${attemptRows.length}`);
  console.log(`PROGRESS_ATTEMPTS=${progressRow.quizAttemptsCount}`);
  console.log(`PROGRESS_BEST_SCORE=${progressRow.quizBestScore}`);
};

run()
  .catch((error) => {
    console.error("Quiz submit verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
