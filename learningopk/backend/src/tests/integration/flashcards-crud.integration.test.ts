import assert from "node:assert/strict";
import test from "node:test";

import { eq } from "drizzle-orm";
import request from "supertest";

import { db } from "../../lib/db/index.js";
import {
  boards,
  subjects,
  chapters,
  flashcards,
  users
} from "../../lib/db/schema.js";
import { createApp } from "../../server.js";

const APP_ORIGIN = "http://localhost:3000";
const TEST_PASSWORD = "StrongPass123";

/**
 * Helper to create a flashcard fixture with board, subject, chapter
 */
const createFlashcardFixture = async () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // Create board
  const boardRows = await db
    .insert(boards)
    .values({
      name: `Flashcard Test Board ${suffix}`,
      slug: `flashcard-test-board-${suffix}`
    })
    .returning({ id: boards.id, slug: boards.slug });

  const board = boardRows[0];
  assert.ok(board, "Expected board insert");

  // Create subject
  const subjectRows = await db
    .insert(subjects)
    .values({
      boardId: board.id,
      grade: "10",
      name: `Flashcard Test Subject ${suffix}`,
      slug: `flashcard-test-subject-${suffix}`
    })
    .returning({ id: subjects.id, slug: subjects.slug });

  const subject = subjectRows[0];
  assert.ok(subject, "Expected subject insert");

  // Create chapter
  const chapterRows = await db
    .insert(chapters)
    .values({
      subjectId: subject.id,
      chapterNumber: 1,
      title: `Flashcard Test Chapter ${suffix}`,
      slug: `flashcard-test-chapter-${suffix}`,
      summary: "Test chapter for flashcards.",
      isPublished: true
    })
    .returning({ id: chapters.id });

  const chapter = chapterRows[0];
  assert.ok(chapter, "Expected chapter insert");

  return {
    boardId: board.id,
    subjectId: subject.id,
    chapterId: chapter.id,
    boardSlug: board.slug,
    subjectSlug: subject.slug
  };
};

/**
 * Helper to create an admin user and log in
 */
const createAndLoginAdmin = async (agent: request.Agent, nameSuffix: string) => {
  const email = `tst_flashcard_admin_${nameSuffix}_${Date.now()}@example.com`;
  const response = await agent
    .post("/api/auth/sign-up/email")
    .set("origin", APP_ORIGIN)
    .send({
      name: `Flashcard Admin Test ${nameSuffix}`,
      email,
      password: TEST_PASSWORD
    });

  assert.ok(
    response.status < 400,
    `Expected sign-up success, got ${response.status} ${JSON.stringify(response.body)}`
  );

  // Get session to get user ID and upgrade to admin
  const sessionResponse = await agent.get("/api/auth/get-session");
  const userId = sessionResponse.body?.user?.id;
  assert.ok(userId, "Expected user ID from session");

  // Upgrade user to admin via direct DB update (since we're in test)
  await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));

  return { email, userId };
};

test("Flashcard CRUD operations (TASK-FLASHCARD-CUD)", async () => {
  const app = createApp();
  const agent = request.agent(app);

  // Create admin user and authenticate
  const { userId } = await createAndLoginAdmin(agent, "flashcard_crud");

  // Create flashcard fixture
  const { chapterId } = await createFlashcardFixture();

  // TEST 1: Create a flashcard with specified orderIndex
  const createResponse1 = await agent
    .post("/api/admin/content/flashcards")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId,
      front: "What is photosynthesis?",
      back: "The process by which plants convert sunlight into energy",
      orderIndex: 0
    });

  assert.equal(createResponse1.status, 201, `Expected 201 Created, got ${createResponse1.status}`);
  assert.ok(createResponse1.body.data?.id, "Expected flashcard ID in response");
  assert.equal(createResponse1.body.data.front, "What is photosynthesis?");
  assert.equal(createResponse1.body.data.back, "The process by which plants convert sunlight into energy");
  assert.equal(createResponse1.body.data.orderIndex, 0);
  assert.equal(createResponse1.body.data.chapterId, chapterId);

  const flashcardId1 = createResponse1.body.data.id;

  // TEST 2: Create a flashcard without orderIndex (should append to end)
  const createResponse2 = await agent
    .post("/api/admin/content/flashcards")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId,
      front: "What is cellular respiration?",
      back: "The process of breaking down glucose to release energy"
    });

  assert.equal(createResponse2.status, 201, `Expected 201 Created, got ${createResponse2.status}`);
  assert.ok(createResponse2.body.data?.id, "Expected flashcard ID in response");
  assert.equal(createResponse2.body.data.orderIndex, 1, "Should have orderIndex 1 (appended)");

  const flashcardId2 = createResponse2.body.data.id;

  // TEST 3: Create a third flashcard with orderIndex 0 (should shift others)
  const createResponse3 = await agent
    .post("/api/admin/content/flashcards")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId,
      front: "What is mitosis?",
      back: "Cell division resulting in two identical daughter cells",
      orderIndex: 0
    });

  assert.equal(createResponse3.status, 201);
  assert.equal(createResponse3.body.data.orderIndex, 0, "New card should have orderIndex 0");

  const flashcardId3 = createResponse3.body.data.id;

  // TEST 4: List flashcards for chapter (should be ordered by orderIndex)
  const listResponse = await agent
    .get(`/api/admin/content/flashcards?chapterId=${chapterId}`)
    .set("origin", APP_ORIGIN);

  assert.equal(listResponse.status, 200, `Expected 200 OK, got ${listResponse.status}`);
  assert.ok(Array.isArray(listResponse.body.data), "Expected flashcards array");
  assert.equal(listResponse.body.total, 3, "Should have 3 flashcards");
  assert.equal(listResponse.body.data.length, 3, "Should have 3 flashcards in array");

  // Verify order: flashcard3 (orderIndex 0), flashcard1 (orderIndex 0 original, now 1), flashcard2 (orderIndex 1)
  // Since we inserted flashcard3 with orderIndex 0, it should be first
  // Note: The actual order may vary if there are concurrent tests
  const listedFlashcards = listResponse.body.data;
  assert.ok(listedFlashcards[0].id, "First flashcard should have an ID");
  assert.equal(listedFlashcards[0].front, "What is mitosis?", "First flashcard should be the newest one with orderIndex 0");

  // TEST 5: Get flashcards for non-existent chapter
  const listEmptyResponse = await agent
    .get("/api/admin/content/flashcards?chapterId=99999")
    .set("origin", APP_ORIGIN);

  assert.equal(listEmptyResponse.status, 200);
  assert.equal(listEmptyResponse.body.data.length, 0, "Should have 0 flashcards for non-existent chapter");
  assert.equal(listEmptyResponse.body.total, 0);

  // TEST 6: Update flashcard front
  const updateFrontResponse = await agent
    .post(`/api/admin/content/flashcards/${flashcardId1}/update`)
    .set("origin", APP_ORIGIN)
    .send({
      front: "What is photosynthesis? (updated)"
    });

  assert.equal(updateFrontResponse.status, 200, `Expected 200 OK, got ${updateFrontResponse.status}`);
  assert.equal(updateFrontResponse.body.data.front, "What is photosynthesis? (updated)");
  assert.equal(updateFrontResponse.body.data.back, "The process by which plants convert sunlight into energy", "Back should remain unchanged");
  assert.equal(updateFrontResponse.body.data.id, flashcardId1);

  // TEST 7: Update flashcard back
  const updateBackResponse = await agent
    .post(`/api/admin/content/flashcards/${flashcardId2}/update`)
    .set("origin", APP_ORIGIN)
    .send({
      back: "The process of breaking down glucose to release energy (updated)"
    });

  assert.equal(updateBackResponse.status, 200);
  assert.equal(updateBackResponse.body.data.back, "The process of breaking down glucose to release energy (updated)");
  assert.equal(updateBackResponse.body.data.front, "What is cellular respiration?", "Front should remain unchanged");

  // TEST 8: Update both front and back
  const updateBothResponse = await agent
    .post(`/api/admin/content/flashcards/${flashcardId3}/update`)
    .set("origin", APP_ORIGIN)
    .send({
      front: "What is mitosis? (updated)",
      back: "Cell division resulting in two identical daughter cells (updated)"
    });

  assert.equal(updateBothResponse.status, 200);
  assert.equal(updateBothResponse.body.data.front, "What is mitosis? (updated)");
  assert.equal(updateBothResponse.body.data.back, "Cell division resulting in two identical daughter cells (updated)");

  // TEST 9: Delete flashcard
  const deleteResponse = await agent
    .post(`/api/admin/content/flashcards/${flashcardId2}/delete`)
    .set("origin", APP_ORIGIN);

  assert.equal(deleteResponse.status, 200, `Expected 200 OK, got ${deleteResponse.status}`);
  assert.equal(deleteResponse.body.success, true);
  assert.equal(deleteResponse.body.deletedId, flashcardId2);

  // Verify flashcard is deleted
  const deletedFlashcard = await db
    .select({ id: flashcards.id })
    .from(flashcards)
    .where(eq(flashcards.id, flashcardId2))
    .limit(1);
  assert.equal(deletedFlashcard.length, 0, "Flashcard should be deleted");

  // Verify list now shows 2 flashcards
  const listAfterDeleteResponse = await agent
    .get(`/api/admin/content/flashcards?chapterId=${chapterId}`)
    .set("origin", APP_ORIGIN);

  assert.equal(listAfterDeleteResponse.status, 200);
  assert.equal(listAfterDeleteResponse.body.total, 2, "Should have 2 flashcards after deletion");

  // TEST 10: Reorder flashcards
  const remainingFlashcards = await db
    .select({ id: flashcards.id })
    .from(flashcards)
    .where(eq(flashcards.chapterId, chapterId))
    .orderBy(flashcards.orderIndex);

  assert.ok(remainingFlashcards.length === 2, "Should have 2 remaining flashcards");

  const reorderResponse = await agent
    .post("/api/admin/content/flashcards/reorder")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId,
      orderedIds: [remainingFlashcards[1]!.id, remainingFlashcards[0]!.id] // Reverse the order
    });

  assert.equal(reorderResponse.status, 200, `Expected 200 OK, got ${reorderResponse.status}`);
  assert.equal(reorderResponse.body.success, true);
  assert.ok(Array.isArray(reorderResponse.body.updated), "Expected updated array");
  assert.equal(reorderResponse.body.updated.length, 2, "Should have 2 updated flashcards");

  // Verify the new order
  const reorderedFlashcards = await db
    .select({ id: flashcards.id, orderIndex: flashcards.orderIndex })
    .from(flashcards)
    .where(eq(flashcards.chapterId, chapterId))
    .orderBy(flashcards.orderIndex);

  assert.equal(reorderedFlashcards[0]!.id, remainingFlashcards[1]!.id, "First should be originally second");
  assert.equal(reorderedFlashcards[0]!.orderIndex, 0);
  assert.equal(reorderedFlashcards[1]!.id, remainingFlashcards[0]!.id, "Second should be originally first");
  assert.equal(reorderedFlashcards[1]!.orderIndex, 1);

  // TEST 11: Flashcard not found for update
  const notFoundUpdateResponse = await agent
    .post("/api/admin/content/flashcards/99999/update")
    .set("origin", APP_ORIGIN)
    .send({ front: "Test" });

  assert.equal(notFoundUpdateResponse.status, 404, "Expected 404 for non-existent flashcard");

  // TEST 12: Flashcard not found for delete
  const notFoundDeleteResponse = await agent
    .post("/api/admin/content/flashcards/99999/delete")
    .set("origin", APP_ORIGIN);

  assert.equal(notFoundDeleteResponse.status, 404, "Expected 404 for non-existent flashcard");

  // TEST 13: Validation errors for create
  const invalidCreateResponse = await agent
    .post("/api/admin/content/flashcards")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId: "invalid",
      front: "",
      back: ""
    });

  assert.equal(invalidCreateResponse.status, 400, "Expected 400 for invalid input");

  // TEST 14: Validation errors for update
  const invalidUpdateResponse = await agent
    .post(`/api/admin/content/flashcards/${flashcardId1}/update`)
    .set("origin", APP_ORIGIN)
    .send({
      front: "",
      back: ""
    });

  assert.equal(invalidUpdateResponse.status, 400, "Expected 400 for invalid update input");

  // TEST 15: Missing chapterId for list
  const missingChapterIdResponse = await agent
    .get("/api/admin/content/flashcards")
    .set("origin", APP_ORIGIN);

  assert.equal(missingChapterIdResponse.status, 400, "Expected 400 when chapterId is missing");

  // TEST 16: Reorder validation - missing orderedIds
  const invalidReorderResponse = await agent
    .post("/api/admin/content/flashcards/reorder")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId
    });

  assert.equal(invalidReorderResponse.status, 400, "Expected 400 for missing orderedIds");

  // TEST 17: Reorder validation - orderedIds doesn't match existing flashcards
  const wrongReorderResponse = await agent
    .post("/api/admin/content/flashcards/reorder")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId,
      orderedIds: [99998, 99999] // Wrong IDs
    });

  assert.equal(wrongReorderResponse.status, 400, "Expected 400 when orderedIds don't match existing");
  assert.ok(wrongReorderResponse.body.error.includes("orderedIds must contain exactly all flashcard IDs"));

  // TEST 18: Reorder validation - partial IDs
  const partialReorderResponse = await agent
    .post("/api/admin/content/flashcards/reorder")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId,
      orderedIds: [remainingFlashcards[0]!.id] // Only one ID, but there are two flashcards
    });

  assert.equal(partialReorderResponse.status, 400, "Expected 400 when orderedIds are partial");

  // TEST 19: Delete all remaining flashcards for cleanup
  for (const fc of remainingFlashcards) {
    await agent.post(`/api/admin/content/flashcards/${fc.id}/delete`).set("origin", APP_ORIGIN);
  }

  // Verify all deleted
  const allDeletedResponse = await agent
    .get(`/api/admin/content/flashcards?chapterId=${chapterId}`)
    .set("origin", APP_ORIGIN);

  assert.equal(allDeletedResponse.body.total, 0, "All flashcards should be deleted");
});

test("Flashcard reorder validates all IDs are present", async () => {
  const app = createApp();
  const agent = request.agent(app);

  await createAndLoginAdmin(agent, "reorder_validation");

  const { chapterId } = await createFlashcardFixture();

  // Create 3 flashcards
  const ids: number[] = [];
  for (let i = 0; i < 3; i++) {
    const res = await agent
      .post("/api/admin/content/flashcards")
      .set("origin", APP_ORIGIN)
      .send({
        chapterId,
        front: `Front ${i}`,
        back: `Back ${i}`
      });
    ids.push(res.body.data.id);
  }

  // Try to reorder with an extra ID that doesn't exist
  const invalidReorderResponse = await agent
    .post("/api/admin/content/flashcards/reorder")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId,
      orderedIds: [...ids, 99999] // Includes non-existent ID
    });

  assert.equal(invalidReorderResponse.status, 400, "Expected 400 for extra ID in orderedIds");

  // Try to reorder with missing ID
  const missingReorderResponse = await agent
    .post("/api/admin/content/flashcards/reorder")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId,
      orderedIds: ids.slice(0, 2) // Missing one ID
    });

  assert.equal(missingReorderResponse.status, 400, "Expected 400 for missing ID in orderedIds");
});

test("Flashcard create appends to end when orderIndex not provided", async () => {
  const app = createApp();
  const agent = request.agent(app);

  await createAndLoginAdmin(agent, "append_order");

  const { chapterId } = await createFlashcardFixture();

  // Create first flashcard with explicit orderIndex
  const res1 = await agent
    .post("/api/admin/content/flashcards")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId,
      front: "First",
      back: "First back",
      orderIndex: 5
    });

  assert.equal(res1.body.data.orderIndex, 5);

  // Create second flashcard without orderIndex (should append)
  const res2 = await agent
    .post("/api/admin/content/flashcards")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId,
      front: "Second",
      back: "Second back"
    });

  assert.equal(res2.body.data.orderIndex, 6, "Should append with orderIndex = max + 1");

  // Create third flashcard without orderIndex
  const res3 = await agent
    .post("/api/admin/content/flashcards")
    .set("origin", APP_ORIGIN)
    .send({
      chapterId,
      front: "Third",
      back: "Third back"
    });

  assert.equal(res3.body.data.orderIndex, 7, "Should continue appending");

  // Verify order in database
  const listResponse = await agent
    .get(`/api/admin/content/flashcards?chapterId=${chapterId}`)
    .set("origin", APP_ORIGIN);

  assert.equal(listResponse.body.data[0].front, "First");
  assert.equal(listResponse.body.data[1].front, "Second");
  assert.equal(listResponse.body.data[2].front, "Third");
});
