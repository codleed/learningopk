import { eq } from "drizzle-orm";
import request from "supertest";
import { z } from "zod";

import { db, pool } from "../lib/db/index.js";
import { quizzes } from "../lib/db/schema.js";
import { createApp } from "../server.js";

const dashboardResponseSchema = z.object({
  studentName: z.string(),
  streakDays: z.number().int().nonnegative(),
  subjects: z.array(
    z.object({
      subjectId: z.number().int().positive(),
      subjectSlug: z.string(),
      subjectName: z.string(),
      grade: z.enum(["9", "10"]),
      boardName: z.string(),
      chaptersVisitedPercent: z.number().int().min(0).max(100),
      bestQuizScorePercent: z.number().int().min(0).max(100),
      lastActiveAt: z.string().datetime().nullable()
    })
  ),
  recentActivity: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("chapter_visit"),
        occurredAt: z.string().datetime(),
        subjectSlug: z.string(),
        subjectName: z.string(),
        chapterSlug: z.string(),
        chapterTitle: z.string()
      }),
      z.object({
        type: z.literal("quiz_submit"),
        occurredAt: z.string().datetime(),
        subjectSlug: z.string(),
        subjectName: z.string(),
        chapterSlug: z.string(),
        chapterTitle: z.string(),
        score: z.number().int().nonnegative(),
        totalMarks: z.number().int().positive(),
        percentage: z.number().int().min(0).max(100)
      })
    ])
  ),
  weeklyActivity: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      active: z.boolean(),
      activityCount: z.number().int().nonnegative()
    })
  )
});

const run = async (): Promise<void> => {
  const app = createApp();
  const anonAgent = request(app);
  const userOneAgent = request.agent(app);
  const userTwoAgent = request.agent(app);
  const password = "StrongPass123";

  const unauthDashboardResponse = await anonAgent.get("/api/progress/dashboard");
  if (unauthDashboardResponse.status !== 401) {
    throw new Error(`Expected unauthenticated dashboard request to return 401, got ${unauthDashboardResponse.status}`);
  }

  const userOneSignUp = await userOneAgent.post("/api/auth/sign-up/email").set("origin", "http://localhost:3000").send({
    name: "Dashboard User One",
    email: `prg02_u1_${Date.now()}@example.com`,
    password
  });
  if (userOneSignUp.status >= 400) {
    throw new Error(`User one sign-up failed: ${userOneSignUp.status} ${JSON.stringify(userOneSignUp.body)}`);
  }

  const userTwoSignUp = await userTwoAgent.post("/api/auth/sign-up/email").set("origin", "http://localhost:3000").send({
    name: "Dashboard User Two",
    email: `prg02_u2_${Date.now()}@example.com`,
    password
  });
  if (userTwoSignUp.status >= 400) {
    throw new Error(`User two sign-up failed: ${userTwoSignUp.status} ${JSON.stringify(userTwoSignUp.body)}`);
  }

  const chapterQuizRows = await db
    .select({
      chapterId: quizzes.chapterId
    })
    .from(quizzes)
    .where(eq(quizzes.type, "chapter_quiz"))
    .limit(1);
  const chapterQuiz = chapterQuizRows[0];
  if (!chapterQuiz) {
    throw new Error("No chapter quiz found. Seed data is required before PRG-02 verification.");
  }

  const chapterVisitResponse = await userOneAgent.post("/api/progress/events").send({
    eventType: "chapter_visit",
    chapterId: chapterQuiz.chapterId
  });
  if (chapterVisitResponse.status !== 200) {
    throw new Error(`Expected chapter visit event to return 200, got ${chapterVisitResponse.status}`);
  }

  const exerciseViewResponse = await userOneAgent.post("/api/progress/events").send({
    eventType: "exercise_view",
    chapterId: chapterQuiz.chapterId
  });
  if (exerciseViewResponse.status !== 200) {
    throw new Error(`Expected exercise view event to return 200, got ${exerciseViewResponse.status}`);
  }

  const quizSubmitResponse = await userOneAgent.post("/api/progress/events").send({
    eventType: "quiz_submit",
    chapterId: chapterQuiz.chapterId,
    score: 4
  });
  if (quizSubmitResponse.status !== 200) {
    throw new Error(`Expected quiz submit event to return 200, got ${quizSubmitResponse.status}`);
  }

  const userOneDashboardResponse = await userOneAgent.get("/api/progress/dashboard");
  if (userOneDashboardResponse.status !== 200) {
    throw new Error(`Expected user one dashboard request to return 200, got ${userOneDashboardResponse.status}`);
  }
  const userOneDashboard = dashboardResponseSchema.parse(userOneDashboardResponse.body);

  const userTwoDashboardResponse = await userTwoAgent.get("/api/progress/dashboard");
  if (userTwoDashboardResponse.status !== 200) {
    throw new Error(`Expected user two dashboard request to return 200, got ${userTwoDashboardResponse.status}`);
  }
  const userTwoDashboard = dashboardResponseSchema.parse(userTwoDashboardResponse.body);

  if (userOneDashboard.studentName !== "Dashboard User One") {
    throw new Error(`Expected dashboard studentName for user one, got ${userOneDashboard.studentName}`);
  }
  if (userTwoDashboard.studentName !== "Dashboard User Two") {
    throw new Error(`Expected dashboard studentName for user two, got ${userTwoDashboard.studentName}`);
  }

  const userOneActiveSubject = userOneDashboard.subjects.find((subject) => subject.chaptersVisitedPercent > 0);
  if (!userOneActiveSubject) {
    throw new Error("Expected at least one active subject card for user one.");
  }

  if (userOneDashboard.recentActivity.length === 0) {
    throw new Error("Expected recent activity feed entries for user one.");
  }

  if (userOneDashboard.weeklyActivity.length !== 7) {
    throw new Error(`Expected weeklyActivity length=7 for user one, got ${userOneDashboard.weeklyActivity.length}`);
  }

  if (userOneDashboard.streakDays < 1) {
    throw new Error(`Expected streakDays >= 1 for active user one, got ${userOneDashboard.streakDays}`);
  }

  const userTwoHasVisited = userTwoDashboard.subjects.some((subject) => subject.chaptersVisitedPercent > 0);
  if (userTwoHasVisited) {
    throw new Error("Expected user two subject cards to remain unvisited.");
  }

  if (userTwoDashboard.recentActivity.length !== 0) {
    throw new Error(`Expected no recent activity for user two, got ${userTwoDashboard.recentActivity.length}`);
  }

  if (userTwoDashboard.streakDays !== 0) {
    throw new Error(`Expected streakDays=0 for inactive user two, got ${userTwoDashboard.streakDays}`);
  }

  const userTwoActiveHeatmapDays = userTwoDashboard.weeklyActivity.filter((entry) => entry.active).length;
  if (userTwoActiveHeatmapDays !== 0) {
    throw new Error(`Expected 0 active heatmap days for user two, got ${userTwoActiveHeatmapDays}`);
  }

  console.log(`UNAUTH_DASHBOARD_STATUS=${unauthDashboardResponse.status}`);
  console.log(`USER_ONE_STREAK=${userOneDashboard.streakDays}`);
  console.log(`USER_ONE_RECENT=${userOneDashboard.recentActivity.length}`);
  console.log(`USER_ONE_ACTIVE_SUBJECT=${userOneActiveSubject.subjectSlug}`);
  console.log(`USER_TWO_STREAK=${userTwoDashboard.streakDays}`);
  console.log(`USER_TWO_RECENT=${userTwoDashboard.recentActivity.length}`);
};

run()
  .catch((error) => {
    console.error("PRG-02 dashboard verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
