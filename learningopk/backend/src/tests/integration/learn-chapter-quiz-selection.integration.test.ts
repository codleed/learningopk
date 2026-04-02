import assert from "node:assert/strict";
import { after, test } from "node:test";

import request from "supertest";

import { db, pool } from "../../lib/db/index.js";
import { boardClasses, boards, chapters, quizzes, subjects } from "../../lib/db/schema.js";
import { redis } from "../../lib/redis.js";
import { createApp } from "../../server.js";

const createLearnFixture = async () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const [board] = await db
    .insert(boards)
    .values({
      name: `Learn Quiz Board ${suffix}`,
      slug: `learn-quiz-board-${suffix}`
    })
    .returning({
      id: boards.id,
      slug: boards.slug
    });
  assert.ok(board, "Expected board fixture insert.");

  const [boardClass] = await db
    .insert(boardClasses)
    .values({
      boardId: board.id,
      name: `Class ${suffix}`,
      slug: `class-${suffix}`
    })
    .returning({
      id: boardClasses.id,
      slug: boardClasses.slug
    });
  assert.ok(boardClass, "Expected board class fixture insert.");

  const [subject] = await db
    .insert(subjects)
    .values({
      boardId: board.id,
      boardClassId: boardClass.id,
      grade: null,
      name: `Physics ${suffix}`,
      slug: `physics-${suffix}`,
      description: "Learn chapter quiz selection fixture."
    })
    .returning({
      id: subjects.id,
      slug: subjects.slug
    });
  assert.ok(subject, "Expected subject fixture insert.");

  const [chapter] = await db
    .insert(chapters)
    .values({
      subjectId: subject.id,
      chapterNumber: 1,
      title: `Motion ${suffix}`,
      slug: `motion-${suffix}`,
      summary: "Published chapter for quiz selection test.",
      isPublished: true
    })
    .returning({
      id: chapters.id,
      slug: chapters.slug
    });
  assert.ok(chapter, "Expected chapter fixture insert.");

  return { board, boardClass, subject, chapter };
};

after(async () => {
  if (redis.isOpen) {
    await redis.quit();
  }
  await pool.end().catch(() => undefined);
});

test("learn chapter detail returns chapter_quiz when chapter has both quiz types", async () => {
  const app = createApp();
  const fixture = await createLearnFixture();

  await db.insert(quizzes).values([
    {
      chapterId: fixture.chapter.id,
      title: `Mock Exam ${Date.now()}`,
      durationMinutes: 90,
      totalMarks: 20,
      type: "mock_exam"
    },
    {
      chapterId: fixture.chapter.id,
      title: `Chapter Quiz ${Date.now()}`,
      durationMinutes: 30,
      totalMarks: 15,
      type: "chapter_quiz"
    }
  ]);

  const response = await request(app).get(
    `/api/learn/${fixture.board.slug}/${fixture.boardClass.slug}/${fixture.subject.slug}/${fixture.chapter.slug}`
  );

  assert.equal(response.status, 200);
  assert.equal(response.body?.quiz?.type, "chapter_quiz");
});
