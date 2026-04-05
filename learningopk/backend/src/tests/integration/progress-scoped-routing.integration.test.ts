import assert from "node:assert/strict";
import { after, test } from "node:test";

import { eq } from "drizzle-orm";
import request from "supertest";

import { db, pool } from "../../lib/db/index.js";
import { boards, chapters, subjects, users } from "../../lib/db/schema.js";
import { redis } from "../../lib/redis.js";
import { createApp } from "../../server.js";

const APP_ORIGIN = "http://localhost:3000";
const TEST_PASSWORD = "StrongPass123";
type AuthAgent = ReturnType<typeof request.agent>;

const signUp = async (agent: AuthAgent, name: string, email: string): Promise<string> => {
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

  const sessionResponse = await agent.get("/api/auth/get-session").set("origin", APP_ORIGIN);
  assert.ok(sessionResponse.status < 400, "Expected session lookup success.");

  const userId = sessionResponse.body?.user?.id as string | undefined;
  assert.ok(userId, "Expected authenticated session user ID.");

  return userId;
};

/**
 * Creates two boards each with a subject that shares the same slug and grade,
 * verifying the duplicate-slug scenario the scoped routing must handle.
 */
const createDuplicateSlugFixture = async () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const sharedSubjectSlug = `physics-${suffix}`;
  const sharedGrade = "9" as const;

  // Board A
  const boardARows = await db
    .insert(boards)
    .values({ name: `Board A ${suffix}`, slug: `board-a-${suffix}` })
    .returning({ id: boards.id, slug: boards.slug });
  const boardA = boardARows[0];
  assert.ok(boardA, "Expected board A fixture insert.");

  const subjectARows = await db
    .insert(subjects)
    .values({
      boardId: boardA.id,
      grade: sharedGrade,
      name: `Physics Board A ${suffix}`,
      slug: sharedSubjectSlug
    })
    .returning({ id: subjects.id, name: subjects.name });
  const subjectA = subjectARows[0];
  assert.ok(subjectA, "Expected subject A fixture insert.");

  const chapterARows = await db
    .insert(chapters)
    .values({
      subjectId: subjectA.id,
      chapterNumber: 1,
      title: `Chapter A1 ${suffix}`,
      slug: `chapter-a1-${suffix}`,
      summary: "Board A chapter summary.",
      isPublished: true
    })
    .returning({ id: chapters.id });
  const chapterA = chapterARows[0];
  assert.ok(chapterA, "Expected chapter A fixture insert.");

  // Board B — same subject slug, same grade, different board
  const boardBRows = await db
    .insert(boards)
    .values({ name: `Board B ${suffix}`, slug: `board-b-${suffix}` })
    .returning({ id: boards.id, slug: boards.slug });
  const boardB = boardBRows[0];
  assert.ok(boardB, "Expected board B fixture insert.");

  const subjectBRows = await db
    .insert(subjects)
    .values({
      boardId: boardB.id,
      grade: sharedGrade,
      name: `Physics Board B ${suffix}`,
      slug: sharedSubjectSlug
    })
    .returning({ id: subjects.id, name: subjects.name });
  const subjectB = subjectBRows[0];
  assert.ok(subjectB, "Expected subject B fixture insert.");

  const chapterBRows = await db
    .insert(chapters)
    .values({
      subjectId: subjectB.id,
      chapterNumber: 1,
      title: `Chapter B1 ${suffix}`,
      slug: `chapter-b1-${suffix}`,
      summary: "Board B chapter summary.",
      isPublished: true
    })
    .returning({ id: chapters.id });
  const chapterB = chapterBRows[0];
  assert.ok(chapterB, "Expected chapter B fixture insert.");

  return {
    boardA: { id: boardA.id, slug: boardA.slug },
    boardB: { id: boardB.id, slug: boardB.slug },
    subjectA: { id: subjectA.id, name: subjectA.name },
    subjectB: { id: subjectB.id, name: subjectB.name },
    chapterA: { id: chapterA.id },
    chapterB: { id: chapterB.id },
    sharedSubjectSlug,
    sharedGrade
  };
};

after(async () => {
  if (redis.isOpen) {
    await redis.quit();
  }
  await pool.end().catch(() => undefined);
});

test("subject progress route scoped by board+grade+slug returns the correct subject when duplicate slugs exist", async () => {
  const app = createApp();
  const studentAgent = request.agent(app);

  await signUp(studentAgent, "Slug Test Student", `tst_slug_student_${Date.now()}@example.com`);

  const fixture = await createDuplicateSlugFixture();

  // Request subject progress for Board A
  const responseA = await studentAgent.get(
    `/api/progress/dashboard/${fixture.boardA.slug}/${fixture.sharedGrade}/${fixture.sharedSubjectSlug}`
  );
  assert.equal(responseA.status, 200, `Expected 200 for board A subject, got ${responseA.status}`);
  assert.equal(
    responseA.body?.subject?.id,
    fixture.subjectA.id,
    "Expected subject from board A when queried with board A slug."
  );
  assert.equal(responseA.body?.subject?.name, fixture.subjectA.name);
  assert.equal(responseA.body?.subject?.boardSlug, fixture.boardA.slug);

  // Request subject progress for Board B — same subject slug, different board
  const responseB = await studentAgent.get(
    `/api/progress/dashboard/${fixture.boardB.slug}/${fixture.sharedGrade}/${fixture.sharedSubjectSlug}`
  );
  assert.equal(responseB.status, 200, `Expected 200 for board B subject, got ${responseB.status}`);
  assert.equal(
    responseB.body?.subject?.id,
    fixture.subjectB.id,
    "Expected subject from board B when queried with board B slug."
  );
  assert.equal(responseB.body?.subject?.name, fixture.subjectB.name);
  assert.equal(responseB.body?.subject?.boardSlug, fixture.boardB.slug);

  // Ensure the two responses returned different subjects
  assert.notEqual(
    responseA.body?.subject?.id,
    responseB.body?.subject?.id,
    "Duplicate-slug subjects must resolve to different subject IDs based on board scope."
  );
});

test("subject progress route returns 404 for non-existent board+grade+slug combination", async () => {
  const app = createApp();
  const studentAgent = request.agent(app);

  await signUp(studentAgent, "Slug 404 Student", `tst_slug_404_${Date.now()}@example.com`);

  const response = await studentAgent.get("/api/progress/dashboard/nonexistent-board/9/nonexistent-subject");
  assert.equal(response.status, 404, "Expected 404 for non-existent board+grade+slug tuple.");
});

test("subject progress route returns correct chapter list scoped to the specific board subject", async () => {
  const app = createApp();
  const studentAgent = request.agent(app);

  await signUp(studentAgent, "Chapter Scope Student", `tst_chapter_scope_${Date.now()}@example.com`);

  const fixture = await createDuplicateSlugFixture();

  const responseA = await studentAgent.get(
    `/api/progress/dashboard/${fixture.boardA.slug}/${fixture.sharedGrade}/${fixture.sharedSubjectSlug}`
  );
  assert.equal(responseA.status, 200);

  const chaptersA = responseA.body?.chapters as Array<{ chapterId: number }> | undefined;
  assert.ok(Array.isArray(chaptersA), "Expected chapters array in board A response.");
  assert.equal(chaptersA?.length, 1, "Board A subject should have exactly 1 published chapter.");
  assert.equal(
    chaptersA?.[0]?.chapterId,
    fixture.chapterA.id,
    "Chapter in board A response must belong to board A subject."
  );

  const responseB = await studentAgent.get(
    `/api/progress/dashboard/${fixture.boardB.slug}/${fixture.sharedGrade}/${fixture.sharedSubjectSlug}`
  );
  assert.equal(responseB.status, 200);

  const chaptersB = responseB.body?.chapters as Array<{ chapterId: number }> | undefined;
  assert.ok(Array.isArray(chaptersB), "Expected chapters array in board B response.");
  assert.equal(chaptersB?.length, 1, "Board B subject should have exactly 1 published chapter.");
  assert.equal(
    chaptersB?.[0]?.chapterId,
    fixture.chapterB.id,
    "Chapter in board B response must belong to board B subject."
  );
});

test("dashboard summary includes boardSlug for each subject enabling scoped subject links", async () => {
  const app = createApp();
  const studentAgent = request.agent(app);

  await signUp(studentAgent, "Dashboard Link Student", `tst_dash_link_${Date.now()}@example.com`);

  const fixture = await createDuplicateSlugFixture();

  const dashboardResponse = await studentAgent.get("/api/progress/dashboard");
  assert.equal(dashboardResponse.status, 200);

  const subjects = dashboardResponse.body?.subjects as
    | Array<{
        subjectId: number;
        subjectSlug: string;
        boardSlug: string;
        grade: string;
      }>
    | undefined;
  assert.ok(Array.isArray(subjects), "Expected subjects array in dashboard response.");

  const matchedA = subjects?.find((s) => s.subjectId === fixture.subjectA.id);
  const matchedB = subjects?.find((s) => s.subjectId === fixture.subjectB.id);

  // Both subjects with the same slug should appear with their respective boardSlug
  assert.ok(matchedA, "Expected subject A in dashboard subjects list.");
  assert.ok(matchedB, "Expected subject B in dashboard subjects list.");
  assert.equal(matchedA?.boardSlug, fixture.boardA.slug, "Subject A boardSlug must match board A.");
  assert.equal(matchedB?.boardSlug, fixture.boardB.slug, "Subject B boardSlug must match board B.");
  assert.equal(matchedA?.subjectSlug, fixture.sharedSubjectSlug);
  assert.equal(matchedB?.subjectSlug, fixture.sharedSubjectSlug);
});
