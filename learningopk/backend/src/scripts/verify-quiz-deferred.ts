import { and, eq } from "drizzle-orm";
import request from "supertest";
import { z } from "zod";

import { createApp } from "../server.js";
import { db, pool } from "../lib/db/index.js";
import { boards, chapters, quizzes, subjects } from "../lib/db/schema.js";

const learnChapterResponseSchema = z.object({
  quiz: z
    .object({
      id: z.number().int().positive(),
      type: z.enum(["chapter_quiz", "mock_exam"]),
      questions: z.array(
        z.object({
          id: z.number().int().positive(),
          question: z.string(),
          optionA: z.string(),
          optionB: z.string(),
          optionC: z.string(),
          optionD: z.string(),
          marks: z.number().int().positive(),
        })
      ),
    })
    .nullable(),
});

const run = async (): Promise<void> => {
  const chapterRows = await db
    .select({
      boardSlug: boards.slug,
      grade: subjects.grade,
      subjectSlug: subjects.slug,
      chapterSlug: chapters.slug,
    })
    .from(chapters)
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .innerJoin(boards, eq(subjects.boardId, boards.id))
    .innerJoin(quizzes, and(eq(quizzes.chapterId, chapters.id), eq(chapters.isPublished, true)))
    .limit(1);

  const chapterRow = chapterRows[0];
  if (!chapterRow) {
    throw new Error("No published chapter with quiz found.");
  }

  const app = createApp();
  const response = await request(app).get(
    `/api/learn/${chapterRow.boardSlug}/${chapterRow.grade}/${chapterRow.subjectSlug}/${chapterRow.chapterSlug}`
  );

  if (response.status !== 200) {
    throw new Error(`Expected learn chapter response 200, got ${response.status}`);
  }

  const parsed = learnChapterResponseSchema.safeParse(response.body);
  if (!parsed.success) {
    throw new Error(`Learn chapter response parse failed: ${parsed.error.message}`);
  }

  const quiz = parsed.data.quiz;
  if (!quiz || quiz.questions.length === 0) {
    throw new Error("Expected quiz with questions in learn chapter response.");
  }

  const leakedFields = quiz.questions.filter(
    (question) =>
      Object.prototype.hasOwnProperty.call(question, "correctOption") ||
      Object.prototype.hasOwnProperty.call(question, "explanation")
  );

  if (leakedFields.length > 0) {
    throw new Error(
      "Deferred-feedback leak detected: correctOption/explanation present before submission."
    );
  }

  console.log(`LEARN_QUIZ_TYPE=${quiz.type}`);
  console.log(`QUESTION_COUNT=${quiz.questions.length}`);
  console.log("LEAK_CHECK=pass");
};

run()
  .catch((error) => {
    console.error("Quiz deferred-feedback verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
