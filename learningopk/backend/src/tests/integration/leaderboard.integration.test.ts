import assert from "node:assert/strict";
import { after, test } from "node:test";

import { eq } from "drizzle-orm";
import request from "supertest";

import { db, pool } from "../../lib/db/index.js";
import { users } from "../../lib/db/schema.js";
import { redis } from "../../lib/redis.js";
import { createApp } from "../../server.js";

const APP_ORIGIN = "http://localhost:3000";
const TEST_PASSWORD = "StrongPass123";
type AuthAgent = ReturnType<typeof request.agent>;

const signUp = async (
  agent: AuthAgent,
  name: string,
  email: string,
  profile: { board: string; className: string }
): Promise<string> => {
  const response = await agent.post("/api/auth/sign-up/email").set("origin", APP_ORIGIN).send({
    name,
    email,
    password: TEST_PASSWORD,
    board: profile.board,
    class: profile.className
  });

  assert.ok(
    response.status < 400,
    `Expected sign-up success for ${email}, got ${response.status} ${JSON.stringify(response.body)}`
  );

  const sessionResponse = await agent.get("/api/auth/get-session").set("origin", APP_ORIGIN);
  assert.equal(sessionResponse.status, 200);

  const userId = sessionResponse.body?.user?.id as string | undefined;
  assert.ok(userId, "Expected authenticated session user ID.");
  return userId;
};

after(async () => {
  if (redis.isOpen) {
    await redis.quit();
  }
  await pool.end().catch(() => undefined);
});

test("leaderboard endpoint requires authentication", async () => {
  const app = createApp();
  const response = await request(app).get("/api/leaderboard?scope=global&metric=xp");
  assert.equal(response.status, 401);
});

test("leaderboard returns scoped results and respects leaderboard privacy opt-out", async () => {
  const app = createApp();
  const studentAgent = request.agent(app);
  const boardPeerAgent = request.agent(app);
  const otherBoardAgent = request.agent(app);

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const studentId = await signUp(studentAgent, "Leaderboard Student", `leaderboard-student-${suffix}@example.com`, {
    board: `fbise-${suffix}`,
    className: "9th"
  });
  const boardPeerId = await signUp(boardPeerAgent, "Board Peer", `board-peer-${suffix}@example.com`, {
    board: `fbise-${suffix}`,
    className: "9th"
  });
  const otherBoardId = await signUp(otherBoardAgent, "Other Board", `other-board-${suffix}@example.com`, {
    board: `aksu-${suffix}`,
    className: "9th"
  });

  await db.update(users).set({ xp: 250, level: 1 }).where(eq(users.id, studentId));
  await db.update(users).set({ xp: 500, level: 2 }).where(eq(users.id, boardPeerId));
  await db.update(users).set({ xp: 900, level: 3 }).where(eq(users.id, otherBoardId));

  const initialResponse = await studentAgent.get("/api/leaderboard?scope=board&metric=xp");
  assert.equal(initialResponse.status, 200, JSON.stringify(initialResponse.body));
  assert.equal(initialResponse.body?.scope, "board");
  assert.equal(initialResponse.body?.metric, "xp");
  assert.equal(initialResponse.body?.currentUser?.totalStudents, 2);

  const initialEntries = initialResponse.body?.entries as Array<{ name: string }> | undefined;
  assert.ok(Array.isArray(initialEntries), "Expected leaderboard entries array.");
  assert.equal(initialEntries?.length, 2, "Expected only same-board students in board scope.");
  assert.deepEqual(
    initialEntries?.map((entry) => entry.name),
    ["Board Peer", "Leaderboard Student"],
    "Expected board leaderboard to sort higher XP first."
  );

  const updateResponse = await boardPeerAgent.put("/api/users/me/leaderboard-settings").send({
    public: false
  });
  assert.equal(updateResponse.status, 200, JSON.stringify(updateResponse.body));
  assert.equal(updateResponse.body?.leaderboardPublic, false);

  const afterOptOutResponse = await studentAgent.get("/api/leaderboard?scope=board&metric=xp");
  assert.equal(afterOptOutResponse.status, 200, JSON.stringify(afterOptOutResponse.body));
  assert.equal(afterOptOutResponse.body?.currentUser?.totalStudents, 2);

  const afterOptOutEntries = afterOptOutResponse.body?.entries as Array<{ name: string }> | undefined;
  assert.ok(Array.isArray(afterOptOutEntries), "Expected entries array after opt-out.");
  assert.equal(afterOptOutEntries?.length, 1, "Expected opted-out peer to disappear from public leaderboard.");
  assert.equal(afterOptOutEntries?.[0]?.name, "Leaderboard Student");

  const schoolResponse = await studentAgent.get("/api/leaderboard?scope=school&metric=xp");
  assert.equal(schoolResponse.status, 200, JSON.stringify(schoolResponse.body));
  assert.equal(schoolResponse.body?.scope, "school");
  assert.equal(schoolResponse.body?.currentUser?.totalStudents, 2, "School fallback should scope to board+grade.");

  const streakResponse = await studentAgent.get("/api/leaderboard?scope=global&metric=streak");
  assert.equal(streakResponse.status, 200, JSON.stringify(streakResponse.body));
  assert.equal(typeof streakResponse.body?.entries?.[0]?.streak, "number");

  const quizzesResponse = await studentAgent.get("/api/leaderboard?scope=global&metric=quizzes");
  assert.equal(quizzesResponse.status, 200, JSON.stringify(quizzesResponse.body));
  assert.equal(typeof quizzesResponse.body?.entries?.[0]?.quizzes, "number");
});
