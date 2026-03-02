import { and, asc, eq } from "drizzle-orm";
import request from "supertest";
import { z } from "zod";

import { db, pool } from "../lib/db/index.js";
import { chapters, quizzes, subjects } from "../lib/db/schema.js";
import { createApp } from "../server.js";

const subjectProgressSchema = z.object({
  subject: z.object({
    id: z.number().int().positive(),
    slug: z.string(),
    name: z.string(),
    grade: z.enum(["9", "10"]),
    boardName: z.string()
  }),
  overallSubjectScorePercent: z.number().int().min(0).max(100),
  chapters: z.array(
    z.object({
      chapterId: z.number().int().positive(),
      chapterNumber: z.number().int().positive(),
      chapterTitle: z.string(),
      chapterSlug: z.string(),
      visited: z.boolean(),
      exercisesViewed: z.number().int().nonnegative(),
      quizAttempted: z.boolean(),
      bestScorePercent: z.number().int().min(0).max(100),
      status: z.enum(["green", "yellow", "grey"])
    })
  )
});

type ChapterQuizRow = {
  subjectSlug: string;
  chapterId: number;
  totalMarks: number;
};

const run = async (): Promise<void> => {
  const app = createApp();
  const anonAgent = request(app);
  const userOneAgent = request.agent(app);
  const userTwoAgent = request.agent(app);
  const password = "StrongPass123";

  const chapterQuizRows = await db
    .select({
      subjectSlug: subjects.slug,
      chapterId: chapters.id,
      totalMarks: quizzes.totalMarks
    })
    .from(subjects)
    .innerJoin(chapters, and(eq(chapters.subjectId, subjects.id), eq(chapters.isPublished, true)))
    .innerJoin(quizzes, and(eq(quizzes.chapterId, chapters.id), eq(quizzes.type, "chapter_quiz")))
    .orderBy(asc(subjects.id), asc(chapters.chapterNumber));

  const chaptersBySubject = new Map<string, ChapterQuizRow[]>();
  for (const row of chapterQuizRows) {
    const existing = chaptersBySubject.get(row.subjectSlug) ?? [];
    existing.push({
      subjectSlug: row.subjectSlug,
      chapterId: row.chapterId,
      totalMarks: row.totalMarks
    });
    chaptersBySubject.set(row.subjectSlug, existing);
  }

  const subjectCandidate = Array.from(chaptersBySubject.entries()).find((entry) => entry[1].length >= 2);
  if (!subjectCandidate) {
    throw new Error("Expected at least one subject with >=2 published chapter quizzes for PRG-03 verification.");
  }

  const [subjectSlug, subjectChapters] = subjectCandidate;
  const highScoreChapter = subjectChapters[0];
  const lowScoreChapter = subjectChapters[1];
  if (!highScoreChapter || !lowScoreChapter) {
    throw new Error("Subject chapter selection failed unexpectedly.");
  }

  const unauthResponse = await anonAgent.get(`/api/progress/dashboard/${subjectSlug}`);
  if (unauthResponse.status !== 401) {
    throw new Error(`Expected unauthenticated subject progress to return 401, got ${unauthResponse.status}`);
  }

  const userOneSignUp = await userOneAgent.post("/api/auth/sign-up/email").set("origin", "http://localhost:3000").send({
    name: "Subject Progress User One",
    email: `prg03_u1_${Date.now()}@example.com`,
    password,
    class: "9th",
    board: "fbise"
  });
  if (userOneSignUp.status >= 400) {
    throw new Error(`User one sign-up failed: ${userOneSignUp.status} ${JSON.stringify(userOneSignUp.body)}`);
  }

  const userTwoSignUp = await userTwoAgent.post("/api/auth/sign-up/email").set("origin", "http://localhost:3000").send({
    name: "Subject Progress User Two",
    email: `prg03_u2_${Date.now()}@example.com`,
    password,
    class: "9th",
    board: "fbise"
  });
  if (userTwoSignUp.status >= 400) {
    throw new Error(`User two sign-up failed: ${userTwoSignUp.status} ${JSON.stringify(userTwoSignUp.body)}`);
  }

  const highScoreEvent = await userOneAgent.post("/api/progress/events").send({
    eventType: "quiz_submit",
    chapterId: highScoreChapter.chapterId,
    score: highScoreChapter.totalMarks
  });
  if (highScoreEvent.status !== 200) {
    throw new Error(`Expected high score quiz event to return 200, got ${highScoreEvent.status}`);
  }

  const lowScore = Math.max(0, Math.floor(lowScoreChapter.totalMarks * 0.5));
  const lowScoreEvent = await userOneAgent.post("/api/progress/events").send({
    eventType: "quiz_submit",
    chapterId: lowScoreChapter.chapterId,
    score: lowScore
  });
  if (lowScoreEvent.status !== 200) {
    throw new Error(`Expected low score quiz event to return 200, got ${lowScoreEvent.status}`);
  }

  const notFoundResponse = await userOneAgent.get("/api/progress/dashboard/not-a-real-subject");
  if (notFoundResponse.status !== 404) {
    throw new Error(`Expected missing subject request to return 404, got ${notFoundResponse.status}`);
  }

  const userOneSubjectResponse = await userOneAgent.get(`/api/progress/dashboard/${subjectSlug}`);
  if (userOneSubjectResponse.status !== 200) {
    throw new Error(`Expected user one subject progress request to return 200, got ${userOneSubjectResponse.status}`);
  }
  const userOneSubjectProgress = subjectProgressSchema.parse(userOneSubjectResponse.body);

  const userTwoSubjectResponse = await userTwoAgent.get(`/api/progress/dashboard/${subjectSlug}`);
  if (userTwoSubjectResponse.status !== 200) {
    throw new Error(`Expected user two subject progress request to return 200, got ${userTwoSubjectResponse.status}`);
  }
  const userTwoSubjectProgress = subjectProgressSchema.parse(userTwoSubjectResponse.body);

  for (const chapter of userOneSubjectProgress.chapters) {
    if (chapter.quizAttempted && chapter.bestScorePercent > 70 && chapter.status !== "green") {
      throw new Error(`Chapter ${chapter.chapterId} should be green when attempted score >70.`);
    }
    if (chapter.quizAttempted && chapter.bestScorePercent <= 70 && chapter.status !== "yellow") {
      throw new Error(`Chapter ${chapter.chapterId} should be yellow when attempted score <=70.`);
    }
    if (!chapter.quizAttempted && chapter.status !== "grey") {
      throw new Error(`Chapter ${chapter.chapterId} should be grey when not attempted.`);
    }
  }

  const highChapterInResponse = userOneSubjectProgress.chapters.find((chapter) => chapter.chapterId === highScoreChapter.chapterId);
  if (!highChapterInResponse || highChapterInResponse.status !== "green") {
    throw new Error("Expected high-score chapter status to be green.");
  }

  const lowChapterInResponse = userOneSubjectProgress.chapters.find((chapter) => chapter.chapterId === lowScoreChapter.chapterId);
  if (!lowChapterInResponse || lowChapterInResponse.status !== "yellow") {
    throw new Error("Expected low-score chapter status to be yellow.");
  }

  const expectedOverall = Math.round(
    userOneSubjectProgress.chapters.reduce((total, chapter) => total + chapter.bestScorePercent, 0) /
      Math.max(1, userOneSubjectProgress.chapters.length)
  );
  if (userOneSubjectProgress.overallSubjectScorePercent !== expectedOverall) {
    throw new Error(
      `Expected overall subject score=${expectedOverall}, got ${userOneSubjectProgress.overallSubjectScorePercent}`
    );
  }

  const userTwoAnyAttempted = userTwoSubjectProgress.chapters.some((chapter) => chapter.quizAttempted);
  if (userTwoAnyAttempted) {
    throw new Error("Expected user two to have zero quiz attempts in subject progress.");
  }

  const userTwoAnyNonGrey = userTwoSubjectProgress.chapters.some((chapter) => chapter.status !== "grey");
  if (userTwoAnyNonGrey) {
    throw new Error("Expected all user two chapter statuses to be grey.");
  }

  if (userTwoSubjectProgress.overallSubjectScorePercent !== 0) {
    throw new Error(`Expected user two overall subject score 0, got ${userTwoSubjectProgress.overallSubjectScorePercent}`);
  }

  console.log(`UNAUTH_SUBJECT_STATUS=${unauthResponse.status}`);
  console.log(`MISSING_SUBJECT_STATUS=${notFoundResponse.status}`);
  console.log(`USER_ONE_SUBJECT=${userOneSubjectProgress.subject.slug}`);
  console.log(`USER_ONE_OVERALL=${userOneSubjectProgress.overallSubjectScorePercent}`);
  console.log(`HIGH_CHAPTER_STATUS=${highChapterInResponse.status}`);
  console.log(`LOW_CHAPTER_STATUS=${lowChapterInResponse.status}`);
  console.log(`USER_TWO_OVERALL=${userTwoSubjectProgress.overallSubjectScorePercent}`);
};

run()
  .catch((error) => {
    console.error("PRG-03 subject progress verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });

