import assert from "node:assert/strict";
import { after, describe, test } from "node:test";

import request from "supertest";

import { db, pool } from "../../lib/db/index.js";
import { boards, chapters, subjects } from "../../lib/db/schema.js";
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

  assert.ok(
    response.status < 400,
    `Expected sign-up success for ${email}, got ${response.status} ${JSON.stringify(response.body)}`
  );
};

/**
 * Creates a board + subject + chapter fixture and returns their IDs.
 * By default the chapter is published; set `isPublished: false` for unpublished.
 */
const createFixture = async (opts?: { isPublished?: boolean }) => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const isPublished = opts?.isPublished ?? true;

  const insertedBoards = await db
    .insert(boards)
    .values({ name: `Board ${suffix}`, slug: `board-${suffix}` })
    .returning({ id: boards.id });
  const board = insertedBoards[0];
  assert.ok(board, "Expected board fixture insert.");

  const insertedSubjects = await db
    .insert(subjects)
    .values({ boardId: board.id, grade: "9", name: `Subject ${suffix}`, slug: `subject-${suffix}` })
    .returning({ id: subjects.id });
  const subject = insertedSubjects[0];
  assert.ok(subject, "Expected subject fixture insert.");

  const insertedChapters = await db
    .insert(chapters)
    .values({
      subjectId: subject.id,
      chapterNumber: 1,
      title: `Chapter ${suffix}`,
      slug: `chapter-${suffix}`,
      summary: "Fixture chapter for forum thread validation tests.",
      isPublished
    })
    .returning({ id: chapters.id });
  const chapter = insertedChapters[0];
  assert.ok(chapter, "Expected chapter fixture insert.");

  return { boardId: board.id, subjectId: subject.id, chapterId: chapter.id };
};

after(async () => {
  await redis.quit();
  await pool.end();
});

describe("POST /api/forum/threads — validation contracts", () => {
  test("returns 404 when subjectId does not exist", async () => {
    const app = createApp();
    const agent = request.agent(app);
    await signUp(agent, "Validation Tester", `tst_val_subject_${Date.now()}@example.com`);

    const response = await agent.post("/api/forum/threads").send({
      title: "Thread with nonexistent subject",
      body: "This body is long enough to pass the minimum length check.",
      subjectId: 999999
    });

    assert.equal(response.status, 404, `Expected 404 for nonexistent subject, got ${response.status}`);
    assert.ok(
      response.body?.error?.toLowerCase().includes("subject"),
      `Expected error message to reference subject, got: ${JSON.stringify(response.body)}`
    );
  });

  test("returns 404 when chapterId does not exist", async () => {
    const app = createApp();
    const agent = request.agent(app);
    await signUp(agent, "Validation Tester", `tst_val_chapter_${Date.now()}@example.com`);

    const response = await agent.post("/api/forum/threads").send({
      title: "Thread with nonexistent chapter",
      body: "This body is long enough to pass the minimum length check.",
      chapterId: 999999
    });

    assert.equal(response.status, 404, `Expected 404 for nonexistent chapter, got ${response.status}`);
    assert.ok(
      response.body?.error?.toLowerCase().includes("chapter"),
      `Expected error message to reference chapter, got: ${JSON.stringify(response.body)}`
    );
  });

  test("returns 400 when chapterId does not belong to the specified subjectId", async () => {
    const app = createApp();
    const agent = request.agent(app);
    await signUp(agent, "Validation Tester", `tst_val_mismatch_${Date.now()}@example.com`);

    // Create two independent fixtures so subject and chapter belong to different subjects
    const fixtureA = await createFixture();
    const fixtureB = await createFixture();

    const response = await agent.post("/api/forum/threads").send({
      title: "Thread with mismatched subject and chapter",
      body: "This body is long enough to pass the minimum length check.",
      subjectId: fixtureA.subjectId,
      chapterId: fixtureB.chapterId
    });

    assert.equal(response.status, 400, `Expected 400 for subject/chapter mismatch, got ${response.status}`);
    assert.equal(response.body?.code, "VALIDATION_ERROR", "Expected VALIDATION_ERROR code.");
  });

  test("returns 400 when chapter is unpublished", async () => {
    const app = createApp();
    const agent = request.agent(app);
    await signUp(agent, "Validation Tester", `tst_val_unpub_${Date.now()}@example.com`);

    const fixture = await createFixture({ isPublished: false });

    const response = await agent.post("/api/forum/threads").send({
      title: "Thread with unpublished chapter",
      body: "This body is long enough to pass the minimum length check.",
      subjectId: fixture.subjectId,
      chapterId: fixture.chapterId
    });

    assert.equal(response.status, 400, `Expected 400 for unpublished chapter, got ${response.status}`);
    assert.equal(response.body?.code, "VALIDATION_ERROR", "Expected VALIDATION_ERROR code.");
    assert.ok(
      response.body?.error?.toLowerCase().includes("unpublished"),
      `Expected error message to reference unpublished, got: ${JSON.stringify(response.body)}`
    );
  });

  test("returns 201 when all validation passes with valid subject and published chapter", async () => {
    const app = createApp();
    const agent = request.agent(app);
    await signUp(agent, "Validation Tester", `tst_val_valid_${Date.now()}@example.com`);

    const fixture = await createFixture({ isPublished: true });

    const response = await agent.post("/api/forum/threads").send({
      title: "Thread with valid data and published chapter",
      body: "This body is long enough to pass the minimum length check.",
      subjectId: fixture.subjectId,
      chapterId: fixture.chapterId
    });

    assert.equal(response.status, 201, `Expected 201 for valid thread creation, got ${response.status}: ${JSON.stringify(response.body)}`);
    const thread = response.body?.data?.thread;
    assert.ok(thread, "Expected thread in response data.");
    assert.ok(thread.id, "Expected thread to have an id.");
    assert.equal(thread.subjectId, fixture.subjectId, "Thread subjectId should match fixture.");
    assert.equal(thread.chapterId, fixture.chapterId, "Thread chapterId should match fixture.");
  });
});
