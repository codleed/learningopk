import assert from "node:assert/strict";
import { after, test } from "node:test";

import { eq, inArray } from "drizzle-orm";
import request from "supertest";

import { db, pool } from "../../lib/db/index.js";
import { schools, users } from "../../lib/db/schema.js";
import { redis } from "../../lib/redis.js";
import { redisClient } from "../../middleware/rate-limit.js";
import { createApp } from "../../server.js";

// Single-SaaS isolation story: every query scoped to a school must only ever
// return members of the viewer's own school, even though all schools share
// one database and one deployment.

const APP_ORIGIN = "http://localhost:3000";
const TEST_PASSWORD = "StrongPass123";
type AuthAgent = ReturnType<typeof request.agent>;

const makeSuffix = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const makeEmail = (prefix: string) => `${prefix}-${makeSuffix()}@test.com`;

const signUp = async (agent: AuthAgent, name: string, email: string): Promise<void> => {
  const response = await agent.post("/api/auth/sign-up/email").set("origin", APP_ORIGIN).send({
    name,
    email,
    password: TEST_PASSWORD,
    class: "9th",
    board: "fbise",
  });
  assert.ok(
    response.status < 400,
    `Expected sign-up success for ${email}, got ${response.status} ${JSON.stringify(response.body)}`
  );
};

const getSessionUserId = async (agent: AuthAgent): Promise<string> => {
  const response = await agent.get("/api/auth/get-session").set("origin", APP_ORIGIN);
  assert.equal(response.status, 200);
  return response.body.user.id;
};

const createSchool = async (label: string): Promise<number> => {
  const rand = Math.random().toString(36).slice(2, 8);
  const stamp = Date.now().toString(36);
  const inserted = await db
    .insert(schools)
    .values({
      name: `Isolation Test School ${label}`,
      slug: `isolation-${label}-${stamp}-${rand}`,
      board: "fbise",
      inviteCode: rand.padEnd(6, "x").slice(0, 6),
    })
    .returning();
  return inserted[0]!.id;
};

const enrollStudent = async (
  agent: AuthAgent,
  label: string,
  schoolId: number,
  xp: number
): Promise<string> => {
  const userId = await getSessionUserId(agent);
  await db
    .update(users)
    .set({ schoolId, xp, level: Math.floor(xp / 100) })
    .where(eq(users.id, userId));
  return userId;
};

const fetchSchoolLeaderboardUserIds = async (agent: AuthAgent): Promise<Set<string>> => {
  const response = await agent.get("/api/leaderboard").query({ scope: "school", metric: "xp" });
  assert.equal(
    response.status,
    200,
    `Leaderboard request failed: ${JSON.stringify(response.body)}`
  );
  assert.equal(response.body.scope, "school");
  const ids = (response.body.entries as Array<{ userId: string }>).map((entry) => entry.userId);
  return new Set(ids);
};

const app = createApp();

let createdSchoolIds: number[] = [];
let createdUserIds: string[] = [];

after(async () => {
  if (createdUserIds.length > 0) {
    await db.delete(users).where(inArray(users.id, createdUserIds));
  }
  if (createdSchoolIds.length > 0) {
    await db.delete(schools).where(inArray(schools.id, createdSchoolIds));
  }

  // Tear down every connection the app opened so the test process can exit.
  try {
    redisClient.destroy();
  } catch {
    // Rate-limit client never connected.
  }
  if (redis.isOpen) {
    await redis.quit();
  }
  await pool.end().catch(() => undefined);
});

test("school leaderboard shows only the viewer's own school members", async () => {
  const schoolA = await createSchool("A");
  const schoolB = await createSchool("B");
  createdSchoolIds.push(schoolA, schoolB);

  const agentA1 = request.agent(app);
  const agentA2 = request.agent(app);
  const agentB1 = request.agent(app);
  await signUp(agentA1, "School A Top", makeEmail("iso-a1"));
  await signUp(agentA2, "School A Second", makeEmail("iso-a2"));
  await signUp(agentB1, "School B Top", makeEmail("iso-b1"));
  const userA1 = await enrollStudent(agentA1, "a1", schoolA, 500);
  const userA2 = await enrollStudent(agentA2, "a2", schoolA, 300);
  const userB1 = await enrollStudent(agentB1, "b1", schoolB, 9999);
  createdUserIds.push(userA1, userA2, userB1);

  const seenByA1 = await fetchSchoolLeaderboardUserIds(agentA1);
  assert.ok(seenByA1.has(userA1), "Viewer should appear in their own school leaderboard");
  assert.ok(seenByA1.has(userA2), "Same-school peer should appear");
  assert.ok(!seenByA1.has(userB1), "Student from another school must NOT appear");

  const responseA1 = await agentA1.get("/api/leaderboard").query({ scope: "school", metric: "xp" });
  assert.equal(responseA1.status, 200);
  assert.equal(
    responseA1.body.currentUser.rank,
    1,
    "Top XP earner of school A should rank #1 within school A"
  );

  const seenByA2 = await fetchSchoolLeaderboardUserIds(agentA2);
  assert.ok(!seenByA2.has(userB1), "Cross-school leakage for second viewer too");
});

test("each school only sees itself even when another school dominates global XP", async () => {
  const schoolC = await createSchool("C");
  const schoolD = await createSchool("D");
  createdSchoolIds.push(schoolC, schoolD);

  const agentC1 = request.agent(app);
  const agentD1 = request.agent(app);
  await signUp(agentC1, "School C Member", makeEmail("iso-c1"));
  await signUp(agentD1, "School D Whale", makeEmail("iso-d1"));
  const userC1 = await enrollStudent(agentC1, "c1", schoolC, 100);
  const userD1 = await enrollStudent(agentD1, "d1", schoolD, 100000);
  createdUserIds.push(userC1, userD1);

  const seenByC1 = await fetchSchoolLeaderboardUserIds(agentC1);
  assert.deepEqual(Array.from(seenByC1), [userC1], "School C viewer should see exactly themselves");

  const seenByD1 = await fetchSchoolLeaderboardUserIds(agentD1);
  assert.deepEqual(
    Array.from(seenByD1),
    [userD1],
    "School D whale should see exactly themselves despite huge XP"
  );

  const responseD1 = await agentD1.get("/api/leaderboard").query({ scope: "school", metric: "xp" });
  assert.equal(responseD1.status, 200);
  assert.equal(responseD1.body.currentUser.rank, 1);
});
