import assert from "node:assert/strict";
import { after, test } from "node:test";

import request from "supertest";

import { db, pool } from "../../lib/db/index.js";
import { boardClasses, boards, chapters, subjects } from "../../lib/db/schema.js";
import { redis } from "../../lib/redis.js";
import { createApp } from "../../server.js";

const APP_ORIGIN = "http://localhost:3000";
const TEST_PASSWORD = "StrongPass123";

const createCurriculumFixture = async () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const [board] = await db
    .insert(boards)
    .values({
      name: `Class Slug Board ${suffix}`,
      slug: `class-slug-board-${suffix}`,
    })
    .returning({
      id: boards.id,
      name: boards.name,
      slug: boards.slug,
    });
  assert.ok(board, "Expected board fixture insert.");

  const [boardClass] = await db
    .insert(boardClasses)
    .values({
      boardId: board.id,
      name: "9th",
      slug: `9th-${suffix}`,
    })
    .returning({
      id: boardClasses.id,
      boardId: boardClasses.boardId,
      name: boardClasses.name,
      slug: boardClasses.slug,
    });
  assert.ok(boardClass, "Expected board class fixture insert.");

  const [subject] = await db
    .insert(subjects)
    .values({
      boardId: board.id,
      boardClassId: boardClass.id,
      grade: null,
      name: "Physics",
      slug: `physics-${suffix}`,
      description: "Physics scoped by board class.",
    })
    .returning({
      id: subjects.id,
      boardId: subjects.boardId,
      boardClassId: subjects.boardClassId,
      name: subjects.name,
      slug: subjects.slug,
    });
  assert.ok(subject, "Expected subject fixture insert.");

  const [chapter] = await db
    .insert(chapters)
    .values({
      subjectId: subject.id,
      chapterNumber: 1,
      title: "Motion",
      slug: `motion-${suffix}`,
      summary: "Published chapter for class slug route coverage.",
      isPublished: true,
    })
    .returning({
      id: chapters.id,
      slug: chapters.slug,
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

test("learn route resolves board/class/subject hierarchy using class slug path segment", async () => {
  const app = createApp();
  const fixture = await createCurriculumFixture();

  const response = await request(app).get(
    `/api/learn/${fixture.board.slug}/${fixture.boardClass.slug}/${fixture.subject.slug}`
  );

  assert.equal(response.status, 200);
  assert.equal(response.body?.board?.slug, fixture.board.slug);
  assert.equal(response.body?.grade, fixture.boardClass.slug);
  assert.equal(response.body?.subject?.slug, fixture.subject.slug);
  assert.ok(Array.isArray(response.body?.chapters), "Expected chapter list payload.");
  assert.equal(response.body?.chapters?.[0]?.slug, fixture.chapter.slug);
});

test("forum filters expose class metadata for subjects in board-class hierarchy", async () => {
  const app = createApp();
  const fixture = await createCurriculumFixture();

  const response = await request(app).get("/api/forum/filters");
  assert.equal(response.status, 200);

  const subject = (
    response.body?.subjects as Array<{
      id: number;
      slug: string;
      classSlug?: string | null;
      className?: string | null;
    }>
  ).find((entry) => entry.id === fixture.subject.id);

  assert.ok(subject, "Expected subject fixture in forum filters response.");
  assert.equal(subject?.classSlug, fixture.boardClass.slug);
  assert.equal(subject?.className, fixture.boardClass.name);
});

test("sign-up rejects payloads missing required board and class", async () => {
  const app = createApp();
  const agent = request.agent(app);
  const email = `missing_profile_fields_${Date.now()}@example.com`;

  const response = await agent.post("/api/auth/sign-up/email").set("origin", APP_ORIGIN).send({
    name: "Missing Fields User",
    email,
    password: TEST_PASSWORD,
  });

  assert.ok(
    response.status >= 400,
    `Expected sign-up validation error for missing board/class, got ${response.status} ${JSON.stringify(response.body)}`
  );
});
