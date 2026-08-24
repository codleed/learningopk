import assert from "node:assert/strict";
import { after, test } from "node:test";

import request from "supertest";

import { db, pool } from "../../lib/db/index.js";
import { boards, chapters, quizQuestions, quizzes, subjects } from "../../lib/db/schema.js";
import { redis } from "../../lib/redis.js";
import { createApp } from "../../server.js";

const APP_ORIGIN = "http://localhost:3000";
const TEST_PASSWORD = "StrongPass123";
type AuthAgent = ReturnType<typeof request.agent>;

const signUp = async (agent: AuthAgent, name: string, email: string): Promise<string> => {
  const response = await agent
    .post("/api/auth/sign-up/email")
    .set("origin", APP_ORIGIN)
    .send({ name, email, password: TEST_PASSWORD, class: "9th", board: "fbise" });
  assert.ok(response.status < 400, `Expected sign-up success, got ${response.status}`);
  const sessionResponse = await agent.get("/api/auth/get-session").set("origin", APP_ORIGIN);
  const userId = sessionResponse.body?.user?.id as string | undefined;
  assert.ok(userId);
  return userId;
};

const createLearningFixture = async () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const [board] = await db
    .insert(boards)
    .values({ name: `Study Board ${suffix}`, slug: `study-board-${suffix}` })
    .returning({ id: boards.id, slug: boards.slug });
  assert.ok(board);
  const [subject] = await db
    .insert(subjects)
    .values({
      boardId: board.id,
      grade: "9",
      name: `Study Subject ${suffix}`,
      slug: `study-subject-${suffix}`,
    })
    .returning({ id: subjects.id, slug: subjects.slug });
  assert.ok(subject);
  const [chapter] = await db
    .insert(chapters)
    .values({
      subjectId: subject.id,
      chapterNumber: 1,
      title: `Study Chapter ${suffix}`,
      slug: `study-chapter-${suffix}`,
      summary: "Study chapter summary.",
      isPublished: true,
    })
    .returning({ id: chapters.id, title: chapters.title });
  assert.ok(chapter);
  const [quiz] = await db
    .insert(quizzes)
    .values({
      chapterId: chapter.id,
      title: `Study Quiz ${suffix}`,
      totalMarks: 10,
      durationMinutes: 10,
      type: "chapter_quiz",
    })
    .returning({ id: quizzes.id });
  assert.ok(quiz);
  await db
    .insert(quizQuestions)
    .values({
      quizId: quiz.id,
      chapterId: chapter.id,
      question: `Question ${suffix}`,
      optionA: "Correct",
      optionB: "Wrong",
      optionC: "Wrong",
      optionD: "Wrong",
      correctOption: "a",
      explanation: "Because A is correct.",
      marks: 10,
    });
  return { chapter, quiz };
};

after(async () => {
  if (redis.isOpen) await redis.quit();
  await pool.end().catch(() => undefined);
});

test("study groups create immediately adds existing users by email or username and rejects unknown invites", async () => {
  const app = createApp();
  const creatorAgent = request.agent(app);
  const teammateAgent = request.agent(app);
  await signUp(creatorAgent, "Creator Student", `task25_creator_${Date.now()}@example.com`);
  await signUp(teammateAgent, "Teammate Student", `task25_teammate_${Date.now()}@example.com`);

  const created = await creatorAgent
    .post("/api/study-groups")
    .send({ name: "Physics Sprint Crew", invites: ["Teammate Student"] });
  assert.equal(created.status, 201);
  assert.equal(created.body?.group?.memberCount, 2);

  const invalid = await creatorAgent
    .post("/api/study-groups")
    .send({ name: "Broken Crew", invites: ["missing-student@example.com"] });
  assert.equal(invalid.status, 400);
});

test("study groups enforce the six-member cap at creation time", async () => {
  const app = createApp();
  const creatorAgent = request.agent(app);
  await signUp(creatorAgent, "Cap Creator", `task25_cap_creator_${Date.now()}@example.com`);

  const inviteNames: string[] = [];
  for (let index = 0; index < 6; index += 1) {
    const agent = request.agent(app);
    const name = `Cap Member ${Date.now()}-${index}`;
    inviteNames.push(name);
    await signUp(agent, name, `task25_cap_member_${Date.now()}_${index}@example.com`);
  }

  const response = await creatorAgent
    .post("/api/study-groups")
    .send({ name: "Too Many Members", invites: inviteNames });
  assert.equal(response.status, 400);
});

test("study group detail returns member progress, chapter completion activity, and beat-your-score notifications", async () => {
  const app = createApp();
  const creatorAgent = request.agent(app);
  const actorAgent = request.agent(app);
  const recipientAgent = request.agent(app);
  await signUp(creatorAgent, "Group Captain", `task25_group_captain_${Date.now()}@example.com`);
  await signUp(actorAgent, "Quiz Hero", `task25_quiz_hero_${Date.now()}@example.com`);
  await signUp(
    recipientAgent,
    "Quiz Challenger",
    `task25_quiz_challenger_${Date.now()}@example.com`
  );
  const fixture = await createLearningFixture();

  const createGroup = await creatorAgent
    .post("/api/study-groups")
    .send({ name: "Chemistry Avengers", invites: ["Quiz Hero", "Quiz Challenger"] });
  const groupId = createGroup.body?.group?.id as string;

  await recipientAgent
    .post("/api/quiz/submit")
    .send({ quizId: fixture.quiz.id, answers: { "1": "b" } });
  await actorAgent
    .post("/api/progress/events")
    .send({ eventType: "chapter_visit", chapterId: fixture.chapter.id });
  await actorAgent
    .post("/api/quiz/submit")
    .send({ quizId: fixture.quiz.id, answers: { "1": "a" } });

  const detail = await recipientAgent.get(`/api/study-groups/${groupId}`);
  assert.equal(detail.status, 200);
  assert.ok(Array.isArray(detail.body?.members));
  assert.ok(
    detail.body?.activityFeed?.some(
      (entry: { eventType: string }) => entry.eventType === "chapter_completed"
    )
  );
  assert.ok(
    detail.body?.notifications?.some(
      (entry: { eventType: string }) => entry.eventType === "quiz_score_beaten"
    )
  );
});
