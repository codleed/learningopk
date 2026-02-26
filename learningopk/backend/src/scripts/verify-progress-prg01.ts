import { and, eq } from "drizzle-orm";
import request from "supertest";
import { z } from "zod";

import { db, pool } from "../lib/db/index.js";
import { quizQuestions, quizzes, userProgress } from "../lib/db/schema.js";
import { createApp } from "../server.js";

const progressEventResponseSchema = z.object({
  eventType: z.enum(["chapter_visit", "exercise_view", "flashcard_complete", "quiz_submit"]),
  progress: z.object({
    chapterId: z.number().int().positive(),
    visitedAt: z.string().datetime(),
    exercisesViewed: z.number().int().nonnegative(),
    flashcardsCompleted: z.boolean(),
    quizBestScore: z.number().int().nonnegative(),
    quizAttemptsCount: z.number().int().nonnegative()
  })
});

const quizSubmitResponseSchema = z.object({
  score: z.number().int().nonnegative()
});

const delay = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

const getProgressRow = async (userId: string, chapterId: number) => {
  const rows = await db
    .select({
      visitedAt: userProgress.visitedAt,
      exercisesViewed: userProgress.exercisesViewed,
      flashcardsCompleted: userProgress.flashcardsCompleted,
      quizBestScore: userProgress.quizBestScore,
      quizAttemptsCount: userProgress.quizAttemptsCount
    })
    .from(userProgress)
    .where(and(eq(userProgress.userId, userId), eq(userProgress.chapterId, chapterId)))
    .limit(1);

  return rows[0] ?? null;
};

const run = async (): Promise<void> => {
  const app = createApp();
  const agent = request.agent(app);
  const anonAgent = request(app);
  const email = `progress_prg01_${Date.now()}@example.com`;
  const password = "StrongPass123";

  const unauthProgressMutation = await anonAgent.post("/api/progress/events").send({
    eventType: "chapter_visit",
    chapterId: 1
  });
  if (unauthProgressMutation.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated progress mutation, got ${unauthProgressMutation.status}`);
  }

  const unauthQuizMutation = await anonAgent.post("/api/quiz/submit").send({
    quizId: 1,
    answers: {}
  });
  if (unauthQuizMutation.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated quiz mutation, got ${unauthQuizMutation.status}`);
  }

  const signUpResponse = await agent.post("/api/auth/sign-up/email").set("origin", "http://localhost:3000").send({
    name: "Progress Verification User",
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

  const invalidPayloadResponse = await agent.post("/api/progress/events").send({
    eventType: "chapter_visit"
  });
  if (invalidPayloadResponse.status !== 400) {
    throw new Error(`Expected 400 for invalid progress payload, got ${invalidPayloadResponse.status}`);
  }

  const chapterQuizRows = await db
    .select({
      quizId: quizzes.id,
      chapterId: quizzes.chapterId
    })
    .from(quizzes)
    .where(eq(quizzes.type, "chapter_quiz"))
    .limit(1);
  const chapterQuiz = chapterQuizRows[0];
  if (!chapterQuiz) {
    throw new Error("No chapter quiz found. Seed data is required before verification.");
  }

  const missingChapterResponse = await agent.post("/api/progress/events").send({
    eventType: "chapter_visit",
    chapterId: 9999999
  });
  if (missingChapterResponse.status !== 404) {
    throw new Error(`Expected 404 for missing chapter, got ${missingChapterResponse.status}`);
  }

  const chapterVisitResponse = await agent.post("/api/progress/events").send({
    eventType: "chapter_visit",
    chapterId: chapterQuiz.chapterId
  });
  if (chapterVisitResponse.status !== 200) {
    throw new Error(`Expected chapter visit to return 200, got ${chapterVisitResponse.status}`);
  }
  progressEventResponseSchema.parse(chapterVisitResponse.body);

  const progressAfterFirstVisit = await getProgressRow(userId, chapterQuiz.chapterId);
  if (!progressAfterFirstVisit) {
    throw new Error("Expected user_progress row after chapter visit.");
  }

  await delay(15);

  const secondChapterVisitResponse = await agent.post("/api/progress/events").send({
    eventType: "chapter_visit",
    chapterId: chapterQuiz.chapterId
  });
  if (secondChapterVisitResponse.status !== 200) {
    throw new Error(`Expected second chapter visit to return 200, got ${secondChapterVisitResponse.status}`);
  }

  const progressAfterSecondVisit = await getProgressRow(userId, chapterQuiz.chapterId);
  if (!progressAfterSecondVisit) {
    throw new Error("Expected user_progress row after second chapter visit.");
  }
  if (progressAfterSecondVisit.visitedAt.getTime() <= progressAfterFirstVisit.visitedAt.getTime()) {
    throw new Error("Expected chapter visit to update visitedAt timestamp.");
  }

  const firstExerciseView = await agent.post("/api/progress/events").send({
    eventType: "exercise_view",
    chapterId: chapterQuiz.chapterId
  });
  if (firstExerciseView.status !== 200) {
    throw new Error(`Expected first exercise view to return 200, got ${firstExerciseView.status}`);
  }

  const secondExerciseView = await agent.post("/api/progress/events").send({
    eventType: "exercise_view",
    chapterId: chapterQuiz.chapterId
  });
  if (secondExerciseView.status !== 200) {
    throw new Error(`Expected second exercise view to return 200, got ${secondExerciseView.status}`);
  }

  const progressAfterExerciseViews = await getProgressRow(userId, chapterQuiz.chapterId);
  if (!progressAfterExerciseViews) {
    throw new Error("Expected user_progress row after exercise views.");
  }
  if (progressAfterExerciseViews.exercisesViewed !== 2) {
    throw new Error(`Expected exercisesViewed=2, got ${progressAfterExerciseViews.exercisesViewed}`);
  }

  const flashcardCompleteResponse = await agent.post("/api/progress/events").send({
    eventType: "flashcard_complete",
    chapterId: chapterQuiz.chapterId
  });
  if (flashcardCompleteResponse.status !== 200) {
    throw new Error(`Expected flashcard complete to return 200, got ${flashcardCompleteResponse.status}`);
  }

  const progressAfterFlashcards = await getProgressRow(userId, chapterQuiz.chapterId);
  if (!progressAfterFlashcards?.flashcardsCompleted) {
    throw new Error("Expected flashcardsCompleted=true after flashcard completion event.");
  }

  const quizSubmitEventOne = await agent.post("/api/progress/events").send({
    eventType: "quiz_submit",
    chapterId: chapterQuiz.chapterId,
    score: 5
  });
  if (quizSubmitEventOne.status !== 200) {
    throw new Error(`Expected first quiz_submit progress event to return 200, got ${quizSubmitEventOne.status}`);
  }

  const quizSubmitEventTwo = await agent.post("/api/progress/events").send({
    eventType: "quiz_submit",
    chapterId: chapterQuiz.chapterId,
    score: 3
  });
  if (quizSubmitEventTwo.status !== 200) {
    throw new Error(`Expected second quiz_submit progress event to return 200, got ${quizSubmitEventTwo.status}`);
  }

  const progressAfterQuizEvents = await getProgressRow(userId, chapterQuiz.chapterId);
  if (!progressAfterQuizEvents) {
    throw new Error("Expected user_progress row after quiz_submit events.");
  }
  if (progressAfterQuizEvents.quizAttemptsCount !== 2) {
    throw new Error(`Expected quizAttemptsCount=2 after quiz_submit events, got ${progressAfterQuizEvents.quizAttemptsCount}`);
  }
  if (progressAfterQuizEvents.quizBestScore !== 5) {
    throw new Error(`Expected quizBestScore=5 after quiz_submit events, got ${progressAfterQuizEvents.quizBestScore}`);
  }

  const questionRows = await db
    .select({
      id: quizQuestions.id,
      correctOption: quizQuestions.correctOption
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, chapterQuiz.quizId));
  if (questionRows.length < 2) {
    throw new Error("Expected at least 2 quiz questions to verify quiz submit progression.");
  }

  const firstQuestion = questionRows[0];
  if (!firstQuestion) {
    throw new Error("Expected at least one question.");
  }

  const beforeQuizSubmitRow = await getProgressRow(userId, chapterQuiz.chapterId);
  if (!beforeQuizSubmitRow) {
    throw new Error("Expected user_progress row before /api/quiz/submit verification.");
  }

  const firstQuizSubmit = await agent.post("/api/quiz/submit").send({
    quizId: chapterQuiz.quizId,
    answers: { [String(firstQuestion.id)]: firstQuestion.correctOption }
  });
  if (firstQuizSubmit.status !== 200) {
    throw new Error(`Expected first /api/quiz/submit to return 200, got ${firstQuizSubmit.status}`);
  }
  const firstQuizResult = quizSubmitResponseSchema.parse(firstQuizSubmit.body);

  const allCorrectAnswers = Object.fromEntries(
    questionRows.map((question) => [String(question.id), question.correctOption])
  ) as Record<string, "a" | "b" | "c" | "d">;

  const secondQuizSubmit = await agent.post("/api/quiz/submit").send({
    quizId: chapterQuiz.quizId,
    answers: allCorrectAnswers
  });
  if (secondQuizSubmit.status !== 200) {
    throw new Error(`Expected second /api/quiz/submit to return 200, got ${secondQuizSubmit.status}`);
  }
  const secondQuizResult = quizSubmitResponseSchema.parse(secondQuizSubmit.body);

  const thirdQuizSubmit = await agent.post("/api/quiz/submit").send({
    quizId: chapterQuiz.quizId,
    answers: {}
  });
  if (thirdQuizSubmit.status !== 200) {
    throw new Error(`Expected third /api/quiz/submit to return 200, got ${thirdQuizSubmit.status}`);
  }
  const thirdQuizResult = quizSubmitResponseSchema.parse(thirdQuizSubmit.body);

  if (thirdQuizResult.score > secondQuizResult.score) {
    throw new Error("Expected third score to be less than or equal to second score.");
  }

  const afterQuizSubmitRow = await getProgressRow(userId, chapterQuiz.chapterId);
  if (!afterQuizSubmitRow) {
    throw new Error("Expected user_progress row after /api/quiz/submit verification.");
  }

  const expectedAttempts = beforeQuizSubmitRow.quizAttemptsCount + 3;
  if (afterQuizSubmitRow.quizAttemptsCount !== expectedAttempts) {
    throw new Error(`Expected quizAttemptsCount=${expectedAttempts}, got ${afterQuizSubmitRow.quizAttemptsCount}`);
  }

  const expectedBestScore = Math.max(
    beforeQuizSubmitRow.quizBestScore,
    firstQuizResult.score,
    secondQuizResult.score,
    thirdQuizResult.score
  );
  if (afterQuizSubmitRow.quizBestScore !== expectedBestScore) {
    throw new Error(`Expected quizBestScore=${expectedBestScore}, got ${afterQuizSubmitRow.quizBestScore}`);
  }

  console.log(`UNAUTH_PROGRESS_STATUS=${unauthProgressMutation.status}`);
  console.log(`UNAUTH_QUIZ_STATUS=${unauthQuizMutation.status}`);
  console.log(`INVALID_PAYLOAD_STATUS=${invalidPayloadResponse.status}`);
  console.log(`MISSING_CHAPTER_STATUS=${missingChapterResponse.status}`);
  console.log(`VISITED_AT_UPDATED=${progressAfterSecondVisit.visitedAt.toISOString()}`);
  console.log(`EXERCISES_VIEWED=${progressAfterExerciseViews.exercisesViewed}`);
  console.log(`FLASHCARDS_COMPLETED=${progressAfterFlashcards.flashcardsCompleted}`);
  console.log(`QUIZ_EVENT_ATTEMPTS=${progressAfterQuizEvents.quizAttemptsCount}`);
  console.log(`QUIZ_EVENT_BEST_SCORE=${progressAfterQuizEvents.quizBestScore}`);
  console.log(`QUIZ_ROUTE_ATTEMPTS=${afterQuizSubmitRow.quizAttemptsCount}`);
  console.log(`QUIZ_ROUTE_BEST_SCORE=${afterQuizSubmitRow.quizBestScore}`);
};

run()
  .catch((error) => {
    console.error("PRG-01 progress verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
