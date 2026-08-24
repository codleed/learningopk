import assert from "node:assert/strict";
import { after, test } from "node:test";

import { eq } from "drizzle-orm";
import request from "supertest";

import { db, pool } from "../../lib/db/index.js";
import {
  aiChatSessions,
  aiMessages,
  boards,
  chapters,
  forumThreads,
  revisionNotes,
  subjects,
  users,
} from "../../lib/db/schema.js";
import { redis } from "../../lib/redis.js";
import { createApp } from "../../server.js";

const APP_ORIGIN = "http://localhost:3000";
const TEST_PASSWORD = "StrongPass123";
type AuthAgent = ReturnType<typeof request.agent>;
type SessionUser = {
  id: string;
  role?: "student" | "admin";
  class?: string;
  degree?: string;
  board?: string;
};

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

const getSessionUser = async (agent: AuthAgent): Promise<SessionUser> => {
  const response = await agent.get("/api/auth/get-session").set("origin", APP_ORIGIN);

  assert.ok(
    response.status < 400,
    `Expected session lookup success, got ${response.status} ${JSON.stringify(response.body)}`
  );

  const user = response.body?.user as SessionUser | undefined;
  assert.ok(user?.id, "Expected authenticated session user ID.");

  return user;
};

const assignAdminRole = async (userId: string): Promise<void> => {
  await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
};

const createChapterFixture = async (): Promise<number> => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const insertedBoards = await db
    .insert(boards)
    .values({
      name: `Test Board ${suffix}`,
      slug: `test-board-${suffix}`,
    })
    .returning({
      id: boards.id,
    });

  const board = insertedBoards[0];
  assert.ok(board, "Expected board fixture insert.");

  const insertedSubjects = await db
    .insert(subjects)
    .values({
      boardId: board.id,
      grade: "9",
      name: `Test Subject ${suffix}`,
      slug: `test-subject-${suffix}`,
    })
    .returning({
      id: subjects.id,
    });

  const subject = insertedSubjects[0];
  assert.ok(subject, "Expected subject fixture insert.");

  const insertedChapters = await db
    .insert(chapters)
    .values({
      subjectId: subject.id,
      chapterNumber: 1,
      title: `Test Chapter ${suffix}`,
      slug: `test-chapter-${suffix}`,
      summary: "Fixture chapter summary.",
      isPublished: false,
    })
    .returning({
      id: chapters.id,
    });

  const chapter = insertedChapters[0];
  assert.ok(chapter, "Expected chapter fixture insert.");

  return chapter.id;
};

const createChapterFixtureWithMetadata = async (): Promise<{
  id: number;
  title: string;
}> => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const title = `Audit Chapter ${suffix}`;

  const insertedBoards = await db
    .insert(boards)
    .values({
      name: `Audit Board ${suffix}`,
      slug: `audit-board-${suffix}`,
    })
    .returning({
      id: boards.id,
    });

  const board = insertedBoards[0];
  assert.ok(board, "Expected board fixture insert.");

  const insertedSubjects = await db
    .insert(subjects)
    .values({
      boardId: board.id,
      grade: "9",
      name: `Audit Subject ${suffix}`,
      slug: `audit-subject-${suffix}`,
    })
    .returning({
      id: subjects.id,
    });

  const subject = insertedSubjects[0];
  assert.ok(subject, "Expected subject fixture insert.");

  const insertedChapters = await db
    .insert(chapters)
    .values({
      subjectId: subject.id,
      chapterNumber: 1,
      title,
      slug: `audit-chapter-${suffix}`,
      summary: "Audit chapter summary fixture.",
      isPublished: false,
    })
    .returning({
      id: chapters.id,
      title: chapters.title,
    });

  const chapter = insertedChapters[0];
  assert.ok(chapter, "Expected chapter fixture insert.");

  return {
    id: chapter.id,
    title: chapter.title,
  };
};

const createAdminContentFixture = async (): Promise<{
  publishedChapterId: number;
  hiddenChapterId: number;
}> => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const insertedBoards = await db
    .insert(boards)
    .values({
      name: `Admin Content Board ${suffix}`,
      slug: `admin-content-board-${suffix}`,
    })
    .returning({
      id: boards.id,
    });

  const board = insertedBoards[0];
  assert.ok(board, "Expected board fixture insert.");

  const insertedSubjects = await db
    .insert(subjects)
    .values({
      boardId: board.id,
      grade: "10",
      name: `Admin Content Subject ${suffix}`,
      slug: `admin-content-subject-${suffix}`,
    })
    .returning({
      id: subjects.id,
    });

  const subject = insertedSubjects[0];
  assert.ok(subject, "Expected subject fixture insert.");

  const insertedChapters = await db
    .insert(chapters)
    .values([
      {
        subjectId: subject.id,
        chapterNumber: 1,
        title: `Visible Chapter ${suffix}`,
        slug: `visible-chapter-${suffix}`,
        summary: "Published chapter summary fixture.",
        isPublished: true,
      },
      {
        subjectId: subject.id,
        chapterNumber: 2,
        title: `Hidden Chapter ${suffix}`,
        slug: `hidden-chapter-${suffix}`,
        summary: "Hidden chapter summary fixture.",
        isPublished: false,
      },
    ])
    .returning({
      id: chapters.id,
      isPublished: chapters.isPublished,
    });

  const publishedChapter = insertedChapters.find((chapter) => chapter.isPublished);
  const hiddenChapter = insertedChapters.find((chapter) => !chapter.isPublished);
  assert.ok(publishedChapter, "Expected published chapter fixture insert.");
  assert.ok(hiddenChapter, "Expected hidden chapter fixture insert.");

  return {
    publishedChapterId: publishedChapter.id,
    hiddenChapterId: hiddenChapter.id,
  };
};

const createLinkingFixture = async (): Promise<{
  sourceChapterId: number;
  targetChapterId: number;
  sourceChapterTitle: string;
  targetChapterTitle: string;
}> => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const insertedBoards = await db
    .insert(boards)
    .values({
      name: `Link Board ${suffix}`,
      slug: `link-board-${suffix}`,
    })
    .returning({
      id: boards.id,
    });
  const board = insertedBoards[0];
  assert.ok(board, "Expected board fixture insert.");

  const insertedSubjects = await db
    .insert(subjects)
    .values({
      boardId: board.id,
      grade: "9",
      name: `Link Subject ${suffix}`,
      slug: `link-subject-${suffix}`,
    })
    .returning({
      id: subjects.id,
    });
  const subject = insertedSubjects[0];
  assert.ok(subject, "Expected subject fixture insert.");

  const sourceChapterTitle = `Link Source ${suffix}`;
  const targetChapterTitle = `Link Target ${suffix}`;

  const insertedChapters = await db
    .insert(chapters)
    .values([
      {
        subjectId: subject.id,
        chapterNumber: 1,
        title: sourceChapterTitle,
        slug: `link-source-${suffix}`,
        summary: "Source summary fixture.",
        isPublished: true,
      },
      {
        subjectId: subject.id,
        chapterNumber: 2,
        title: targetChapterTitle,
        slug: `link-target-${suffix}`,
        summary: "Target summary fixture.",
        isPublished: true,
      },
    ])
    .returning({
      id: chapters.id,
      title: chapters.title,
    });

  const sourceChapter = insertedChapters.find((chapter) => chapter.title === sourceChapterTitle);
  const targetChapter = insertedChapters.find((chapter) => chapter.title === targetChapterTitle);
  assert.ok(sourceChapter, "Expected source chapter fixture insert.");
  assert.ok(targetChapter, "Expected target chapter fixture insert.");

  return {
    sourceChapterId: sourceChapter.id,
    targetChapterId: targetChapter.id,
    sourceChapterTitle,
    targetChapterTitle,
  };
};

const createThreadFixture = async (userId: string): Promise<string> => {
  const insertedThreads = await db
    .insert(forumThreads)
    .values({
      userId,
      title: `Thread ${Date.now()}`,
      body: "Fixture thread body for moderation tests.",
      isPinned: false,
    })
    .returning({
      id: forumThreads.id,
    });

  const thread = insertedThreads[0];
  assert.ok(thread, "Expected forum thread fixture insert.");

  return thread.id;
};

const createThreadFixtureWithMetadata = async (
  userId: string
): Promise<{ id: string; title: string }> => {
  const title = `Audit Thread ${Date.now()}`;

  const insertedThreads = await db
    .insert(forumThreads)
    .values({
      userId,
      title,
      body: "Fixture thread body for admin audit persistence tests.",
      isPinned: false,
    })
    .returning({
      id: forumThreads.id,
      title: forumThreads.title,
    });

  const thread = insertedThreads[0];
  assert.ok(thread, "Expected forum thread fixture insert.");

  return thread;
};

after(async () => {
  if (redis.isOpen) {
    await redis.quit();
  }
  await pool.end().catch(() => undefined);
});

test("key routes enforce expected public/authenticated/authorization status codes", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const threadAuthorAgent = request.agent(app);
  const otherUserAgent = request.agent(app);

  const healthResponse = await anonAgent.get("/api/health");
  assert.equal(healthResponse.status, 200);

  const publicForumResponse = await anonAgent.get("/api/forum/threads");
  assert.equal(publicForumResponse.status, 200);

  const unauthProgressResponse = await anonAgent.get("/api/progress/dashboard");
  assert.equal(unauthProgressResponse.status, 401);

  const unauthThreadCreateResponse = await anonAgent.post("/api/forum/threads").send({
    title: "Need help with algebra",
    body: "Can someone explain why we isolate x first?",
  });
  assert.equal(unauthThreadCreateResponse.status, 401);

  await signUp(threadAuthorAgent, "Thread Author", `tst02_author_${Date.now()}@example.com`);
  await signUp(otherUserAgent, "Reply Author", `tst02_other_${Date.now()}@example.com`);

  const authedProgressResponse = await threadAuthorAgent.get("/api/progress/dashboard");
  assert.equal(authedProgressResponse.status, 200);

  const threadCreateResponse = await threadAuthorAgent.post("/api/forum/threads").send({
    title: "Need help with algebra",
    body: "Can someone explain why we isolate x first?",
  });
  assert.equal(threadCreateResponse.status, 201);
  const threadId = threadCreateResponse.body?.thread?.id as string | undefined;
  assert.ok(threadId, "Expected created thread ID.");

  const replyCreateResponse = await otherUserAgent
    .post(`/api/forum/threads/${threadId}/replies`)
    .send({
      body: "Start by moving constants to the right side.",
    });
  assert.equal(replyCreateResponse.status, 201);
  const replyId = replyCreateResponse.body?.reply?.id as string | undefined;
  assert.ok(replyId, "Expected created reply ID.");

  const forbiddenAcceptResponse = await otherUserAgent
    .post(`/api/forum/replies/${replyId}/accept`)
    .send({});
  assert.equal(forbiddenAcceptResponse.status, 403);

  const authorAcceptResponse = await threadAuthorAgent
    .post(`/api/forum/replies/${replyId}/accept`)
    .send({});
  assert.equal(authorAcceptResponse.status, 200);
});

test("sign-up persists learner profile fields class, degree, and board", async () => {
  const app = createApp();
  const learnerAgent = request.agent(app);
  const email = `tst_profile_${Date.now()}@example.com`;

  const signUpResponse = await learnerAgent
    .post("/api/auth/sign-up/email")
    .set("origin", APP_ORIGIN)
    .send({
      name: "Learner Profile",
      email,
      password: TEST_PASSWORD,
      class: "10th",
      degree: "Matriculation",
      board: "Balochistan",
    });
  assert.ok(
    signUpResponse.status < 400,
    `Expected sign-up success, got ${signUpResponse.status} ${JSON.stringify(signUpResponse.body)}`
  );

  const sessionResponse = await learnerAgent.get("/api/auth/get-session").set("origin", APP_ORIGIN);
  assert.equal(sessionResponse.status, 200);

  const sessionUser = sessionResponse.body?.user as SessionUser | undefined;
  assert.equal(sessionUser?.class, "10th");
  assert.equal(sessionUser?.degree, "Matriculation");
  assert.equal(sessionUser?.board, "Balochistan");
});

test("admin chapter publish endpoint enforces auth/role and updates chapter visibility", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);

  await signUp(adminAgent, "Admin User", `tst_admin_${Date.now()}@example.com`);
  await signUp(memberAgent, "Member User", `tst_member_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  const chapterId = await createChapterFixture();

  const unauthenticatedResponse = await anonAgent
    .post(`/api/admin/content/chapters/${chapterId}/publish`)
    .send({
      isPublished: true,
    });
  assert.equal(unauthenticatedResponse.status, 401);

  const forbiddenResponse = await memberAgent
    .post(`/api/admin/content/chapters/${chapterId}/publish`)
    .send({
      isPublished: true,
    });
  assert.equal(forbiddenResponse.status, 403);

  await assignAdminRole(adminUser.id);

  const notFoundResponse = await adminAgent
    .post("/api/admin/content/chapters/999999/publish")
    .send({
      isPublished: true,
    });
  assert.equal(notFoundResponse.status, 404);

  const successResponse = await adminAgent
    .post(`/api/admin/content/chapters/${chapterId}/publish`)
    .send({
      isPublished: true,
    });
  assert.equal(successResponse.status, 200);
  assert.equal(successResponse.body?.chapter?.id, chapterId);
  assert.equal(successResponse.body?.chapter?.isPublished, true);
  assert.equal(typeof successResponse.body?.timestamp, "string");

  const chapterRows = await db
    .select({
      isPublished: chapters.isPublished,
    })
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);

  assert.equal(chapterRows[0]?.isPublished, true);
});

test("admin chapter summary endpoints enforce auth/role and support summary updates", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);

  await signUp(adminAgent, "Summary Admin", `tst_summary_admin_${Date.now()}@example.com`);
  await signUp(memberAgent, "Summary Member", `tst_summary_member_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  const chapterId = await createChapterFixture();

  const unauthenticatedGet = await anonAgent.get(
    `/api/admin/content/chapters/${chapterId}/summary`
  );
  assert.equal(unauthenticatedGet.status, 401);

  const forbiddenGet = await memberAgent.get(`/api/admin/content/chapters/${chapterId}/summary`);
  assert.equal(forbiddenGet.status, 403);

  await assignAdminRole(adminUser.id);

  const missingGet = await adminAgent.get("/api/admin/content/chapters/999999/summary");
  assert.equal(missingGet.status, 404);

  const getResponse = await adminAgent.get(`/api/admin/content/chapters/${chapterId}/summary`);
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body?.chapter?.id, chapterId);
  assert.equal(getResponse.body?.chapter?.summary, "Fixture chapter summary.");

  const invalidUpdate = await adminAgent
    .post(`/api/admin/content/chapters/${chapterId}/summary`)
    .send({
      summary: "",
    });
  assert.equal(invalidUpdate.status, 400);

  const missingUpdate = await adminAgent.post("/api/admin/content/chapters/999999/summary").send({
    summary: "Updated summary markdown.",
  });
  assert.equal(missingUpdate.status, 404);

  const updatedSummary =
    "Updated summary markdown with image.\n\n![Figure](https://example.com/fig.png)";
  const updateResponse = await adminAgent
    .post(`/api/admin/content/chapters/${chapterId}/summary`)
    .send({
      summary: updatedSummary,
    });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body?.chapter?.id, chapterId);
  assert.equal(updateResponse.body?.chapter?.summary, updatedSummary);

  const chapterRows = await db
    .select({
      summary: chapters.summary,
    })
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);

  assert.equal(chapterRows[0]?.summary, updatedSummary);
});

test("admin revision notes endpoints enforce auth/role and upsert chapter revision notes", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);

  await signUp(adminAgent, "Revision Admin", `tst_revision_admin_${Date.now()}@example.com`);
  await signUp(memberAgent, "Revision Member", `tst_revision_member_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  const chapterId = await createChapterFixture();

  const unauthenticatedGet = await anonAgent.get(
    `/api/admin/content/chapters/${chapterId}/revision-notes`
  );
  assert.equal(unauthenticatedGet.status, 401);

  const forbiddenGet = await memberAgent.get(
    `/api/admin/content/chapters/${chapterId}/revision-notes`
  );
  assert.equal(forbiddenGet.status, 403);

  await assignAdminRole(adminUser.id);

  const getResponse = await adminAgent.get(
    `/api/admin/content/chapters/${chapterId}/revision-notes`
  );
  assert.equal(getResponse.status, 200);
  assert.deepEqual(getResponse.body?.revisionNotes, {
    keyFormulas: [],
    keyDefinitions: [],
    commonMistakes: "",
    examTips: "",
  });

  const updatePayload = {
    keyFormulas: ["v = u + at", "F = ma"],
    keyDefinitions: [
      { term: "Velocity", definition: "Rate of change of displacement." },
      { term: "Force", definition: "Push or pull causing acceleration." },
    ],
    commonMistakes: "Using speed instead of velocity\nForgetting sign conventions",
    examTips: "Write the known values first\nCheck SI units before solving",
  };

  const updateResponse = await adminAgent
    .post(`/api/admin/content/chapters/${chapterId}/revision-notes`)
    .send(updatePayload);
  assert.equal(updateResponse.status, 200);
  assert.deepEqual(updateResponse.body?.revisionNotes, updatePayload);

  const rows = await db
    .select({
      keyFormulas: revisionNotes.keyFormulas,
      keyDefinitions: revisionNotes.keyDefinitions,
      commonMistakes: revisionNotes.commonMistakes,
      examTips: revisionNotes.examTips,
    })
    .from(revisionNotes)
    .where(eq(revisionNotes.chapterId, chapterId))
    .limit(1);

  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], updatePayload);
});

test("admin chapter wiki-link endpoints persist backlinks and survive target rename", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);

  await signUp(adminAgent, "Link Admin", `tst_link_admin_${Date.now()}@example.com`);
  await signUp(memberAgent, "Link Member", `tst_link_member_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  await assignAdminRole(adminUser.id);
  const fixture = await createLinkingFixture();

  const updatedSummary = `Refer to [[${fixture.targetChapterTitle}]] and [[Missing Concept ${Date.now()}]].`;
  const updateResponse = await adminAgent
    .post(`/api/admin/content/chapters/${fixture.sourceChapterId}/summary`)
    .send({
      summary: updatedSummary,
    });
  assert.equal(updateResponse.status, 200);

  const unauthenticatedLinks = await anonAgent.get(
    `/api/admin/content/chapters/${fixture.sourceChapterId}/links`
  );
  assert.equal(unauthenticatedLinks.status, 401);

  const forbiddenLinks = await memberAgent.get(
    `/api/admin/content/chapters/${fixture.sourceChapterId}/links`
  );
  assert.equal(forbiddenLinks.status, 403);

  const linksResponse = await adminAgent.get(
    `/api/admin/content/chapters/${fixture.sourceChapterId}/links`
  );
  assert.equal(linksResponse.status, 200);
  const outgoing = linksResponse.body?.links?.outgoing as
    | Array<{
        sourceChapterId: number;
        targetChapterId: number | null;
        targetTitle: string;
        isResolved: boolean;
      }>
    | undefined;
  assert.ok(Array.isArray(outgoing), "Expected outgoing links payload.");
  assert.ok(
    outgoing?.some((entry) => entry.targetChapterId === fixture.targetChapterId && entry.isResolved)
  );
  assert.ok(outgoing?.some((entry) => entry.targetChapterId === null && !entry.isResolved));

  const backlinkResponse = await adminAgent.get(
    `/api/admin/content/chapters/${fixture.targetChapterId}/links`
  );
  assert.equal(backlinkResponse.status, 200);
  const backlinks = backlinkResponse.body?.links?.backlinks as
    | Array<{
        sourceChapterId: number;
      }>
    | undefined;
  assert.ok(Array.isArray(backlinks), "Expected backlinks payload.");
  assert.ok(backlinks?.some((entry) => entry.sourceChapterId === fixture.sourceChapterId));

  const newTitle = `${fixture.targetChapterTitle} Renamed`;
  const renameResponse = await adminAgent
    .post(`/api/admin/content/chapters/${fixture.targetChapterId}/rename`)
    .send({
      title: newTitle,
      slug: `renamed-${Date.now()}`,
    });
  assert.equal(renameResponse.status, 200);
  assert.equal(renameResponse.body?.chapter?.title, newTitle);

  const postRenameLinksResponse = await adminAgent.get(
    `/api/admin/content/chapters/${fixture.sourceChapterId}/links`
  );
  assert.equal(postRenameLinksResponse.status, 200);
  const postRenameOutgoing = postRenameLinksResponse.body?.links?.outgoing as
    | Array<{
        targetChapterId: number | null;
        targetChapterTitle: string | null;
        isResolved: boolean;
      }>
    | undefined;
  assert.ok(Array.isArray(postRenameOutgoing), "Expected outgoing links payload after rename.");
  const resolvedEntry = postRenameOutgoing?.find(
    (entry) => entry.targetChapterId === fixture.targetChapterId
  );
  assert.ok(resolvedEntry, "Expected renamed target link to stay resolved.");
  assert.equal(resolvedEntry?.isResolved, true);
  assert.equal(resolvedEntry?.targetChapterTitle, newTitle);

  const suggestionsResponse = await adminAgent
    .get("/api/admin/content/chapters/link-suggestions")
    .query({
      q: "Link Target",
    });
  assert.equal(suggestionsResponse.status, 200);
  const suggestions = suggestionsResponse.body?.suggestions as
    Array<{ id: number; title: string }> | undefined;
  assert.ok(Array.isArray(suggestions), "Expected suggestions payload.");
  assert.ok(suggestions?.some((entry) => entry.id === fixture.targetChapterId));

  const graphResponse = await adminAgent.get("/api/admin/content/chapters/graph");
  assert.equal(graphResponse.status, 200);
  const graphNodes = graphResponse.body?.graph?.nodes as
    Array<{ id: number; title: string }> | undefined;
  const graphEdges = graphResponse.body?.graph?.edges as
    Array<{ sourceChapterId: number; targetChapterId: number }> | undefined;
  assert.ok(Array.isArray(graphNodes), "Expected graph nodes payload.");
  assert.ok(Array.isArray(graphEdges), "Expected graph edges payload.");
  assert.ok(graphNodes?.some((node) => node.id === fixture.sourceChapterId));
  assert.ok(graphNodes?.some((node) => node.id === fixture.targetChapterId));
  assert.ok(
    graphEdges?.some(
      (edge) =>
        edge.sourceChapterId === fixture.sourceChapterId &&
        edge.targetChapterId === fixture.targetChapterId
    ),
    "Expected graph edge from source chapter to linked target chapter."
  );
});

test("admin thread pin endpoint enforces auth/role and updates thread pin status", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);

  await signUp(adminAgent, "Forum Admin", `tst_forum_admin_${Date.now()}@example.com`);
  await signUp(memberAgent, "Forum Member", `tst_forum_member_${Date.now()}@example.com`);

  const adminUser = await getSessionUser(adminAgent);
  const memberUser = await getSessionUser(memberAgent);
  const threadId = await createThreadFixture(memberUser.id);

  const unauthenticatedResponse = await anonAgent
    .post(`/api/admin/forum/threads/${threadId}/pin`)
    .send({
      isPinned: true,
    });
  assert.equal(unauthenticatedResponse.status, 401);

  const forbiddenResponse = await memberAgent
    .post(`/api/admin/forum/threads/${threadId}/pin`)
    .send({
      isPinned: true,
    });
  assert.equal(forbiddenResponse.status, 403);

  await assignAdminRole(adminUser.id);

  const notFoundResponse = await adminAgent
    .post("/api/admin/forum/threads/00000000-0000-0000-0000-000000000000/pin")
    .send({
      isPinned: true,
    });
  assert.equal(notFoundResponse.status, 404);

  const successResponse = await adminAgent.post(`/api/admin/forum/threads/${threadId}/pin`).send({
    isPinned: true,
  });
  assert.equal(successResponse.status, 200);
  assert.equal(successResponse.body?.thread?.id, threadId);
  assert.equal(successResponse.body?.thread?.isPinned, true);
  assert.equal(typeof successResponse.body?.timestamp, "string");

  const threadRows = await db
    .select({
      isPinned: forumThreads.isPinned,
    })
    .from(forumThreads)
    .where(eq(forumThreads.id, threadId))
    .limit(1);

  assert.equal(threadRows[0]?.isPinned, true);
});

test("admin content chapter listing includes published and hidden chapters for admins", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);

  await signUp(adminAgent, "Admin Content User", `tst_admin_content_${Date.now()}@example.com`);
  await signUp(
    memberAgent,
    "Admin Content Member",
    `tst_admin_content_member_${Date.now()}@example.com`
  );

  const adminUser = await getSessionUser(adminAgent);
  const fixture = await createAdminContentFixture();

  const unauthenticatedResponse = await anonAgent.get("/api/admin/content/chapters");
  assert.equal(unauthenticatedResponse.status, 401);

  const forbiddenResponse = await memberAgent.get("/api/admin/content/chapters");
  assert.equal(forbiddenResponse.status, 403);

  await assignAdminRole(adminUser.id);

  const response = await adminAgent.get("/api/admin/content/chapters");
  assert.equal(response.status, 200);

  const chaptersPayload = response.body?.chapters as
    | Array<{
        id: number;
        chapterNumber: number;
        title: string;
        subjectName: string;
        grade: "9" | "10";
        boardName: string;
        isPublished: boolean;
      }>
    | undefined;
  assert.ok(Array.isArray(chaptersPayload), "Expected chapters array payload.");

  const publishedChapter = chaptersPayload?.find(
    (chapter) => chapter.id === fixture.publishedChapterId
  );
  const hiddenChapter = chaptersPayload?.find((chapter) => chapter.id === fixture.hiddenChapterId);

  assert.ok(publishedChapter, "Expected published chapter in admin listing.");
  assert.ok(hiddenChapter, "Expected hidden chapter in admin listing.");
  assert.equal(publishedChapter?.isPublished, true);
  assert.equal(hiddenChapter?.isPublished, false);
  assert.equal(typeof publishedChapter?.subjectName, "string");
  assert.equal(typeof hiddenChapter?.boardName, "string");
});

test("admin content audit logs persist publish actions and support paginated reads", async () => {
  const app = createApp();
  const adminAgent = request.agent(app);

  await signUp(adminAgent, "Audit Admin", `tst_content_audit_${Date.now()}@example.com`);
  const adminUser = await getSessionUser(adminAgent);
  await assignAdminRole(adminUser.id);

  const chapter = await createChapterFixtureWithMetadata();

  const publishResponse = await adminAgent
    .post(`/api/admin/content/chapters/${chapter.id}/publish`)
    .send({
      isPublished: true,
    });
  assert.equal(publishResponse.status, 200);

  const missingChapterResponse = await adminAgent
    .post("/api/admin/content/chapters/999999/publish")
    .send({
      isPublished: true,
    });
  assert.equal(missingChapterResponse.status, 404);

  const firstPageResponse = await adminAgent.get("/api/admin/content/audit-logs").query({
    page: 1,
    pageSize: 20,
  });
  assert.equal(firstPageResponse.status, 200);

  const firstPageEntries = firstPageResponse.body?.entries as
    | Array<{
        action: string;
        target: string;
        status: "success" | "failed";
        message: string;
        actor: { id: string; name: string };
        occurredAt: string;
      }>
    | undefined;

  assert.ok(Array.isArray(firstPageEntries), "Expected content audit entries payload.");
  assert.ok((firstPageEntries?.length ?? 0) >= 1, "Expected at least one content audit entry.");
  assert.equal(typeof firstPageResponse.body?.total, "number");
  assert.equal(firstPageResponse.body?.page, 1);
  assert.equal(firstPageResponse.body?.pageSize, 20);
  assert.equal(typeof firstPageResponse.body?.hasMore, "boolean");

  const firstEntry = firstPageEntries?.[0];
  assert.ok(firstEntry, "Expected first page entry.");
  assert.equal(typeof firstEntry.occurredAt, "string");

  const allReturnedEntries: Array<{
    action: string;
    target: string;
    status: "success" | "failed";
    message: string;
    actor: { id: string; name: string };
    occurredAt: string;
  }> = [...(firstPageEntries ?? [])];

  let page = 2;
  let hasMore = Boolean(firstPageResponse.body?.hasMore);
  while (hasMore && page <= 50) {
    const pagedResponse = await adminAgent.get("/api/admin/content/audit-logs").query({
      page,
      pageSize: 20,
    });
    assert.equal(pagedResponse.status, 200);

    const entries = pagedResponse.body?.entries as
      | Array<{
          action: string;
          target: string;
          status: "success" | "failed";
          message: string;
          actor: { id: string; name: string };
          occurredAt: string;
        }>
      | undefined;
    assert.ok(Array.isArray(entries), "Expected paginated content audit entries payload.");
    allReturnedEntries.push(...entries);

    hasMore = Boolean(pagedResponse.body?.hasMore);
    page += 1;
  }

  assert.ok(
    allReturnedEntries.some(
      (entry) => entry.actor.id === adminUser.id && entry.actor.name === "Audit Admin"
    ),
    "Expected at least one audit entry created by the requesting admin."
  );
  assert.ok(
    allReturnedEntries.some(
      (entry) => entry.status === "success" && entry.target.includes(chapter.title)
    ),
    "Expected persisted successful publish audit entry."
  );
  assert.ok(
    allReturnedEntries.some(
      (entry) => entry.status === "failed" && /not found/i.test(entry.message)
    ),
    "Expected persisted failed publish audit entry."
  );
});

test("admin forum audit logs persist pin actions and support paginated reads", async () => {
  const app = createApp();
  const adminAgent = request.agent(app);
  const memberAgent = request.agent(app);

  await signUp(adminAgent, "Forum Audit Admin", `tst_forum_audit_admin_${Date.now()}@example.com`);
  await signUp(
    memberAgent,
    "Forum Audit Member",
    `tst_forum_audit_member_${Date.now()}@example.com`
  );

  const adminUser = await getSessionUser(adminAgent);
  const memberUser = await getSessionUser(memberAgent);
  await assignAdminRole(adminUser.id);

  const thread = await createThreadFixtureWithMetadata(memberUser.id);

  const pinResponse = await adminAgent.post(`/api/admin/forum/threads/${thread.id}/pin`).send({
    isPinned: true,
  });
  assert.equal(pinResponse.status, 200);

  const missingThreadResponse = await adminAgent
    .post("/api/admin/forum/threads/00000000-0000-0000-0000-000000000000/pin")
    .send({
      isPinned: true,
    });
  assert.equal(missingThreadResponse.status, 404);

  const firstPageResponse = await adminAgent.get("/api/admin/forum/audit-logs").query({
    page: 1,
    pageSize: 20,
  });
  assert.equal(firstPageResponse.status, 200);

  const firstPageEntries = firstPageResponse.body?.entries as
    | Array<{
        action: string;
        target: string;
        status: "success" | "failed";
        message: string;
        actor: { id: string; name: string };
        occurredAt: string;
      }>
    | undefined;

  assert.ok(Array.isArray(firstPageEntries), "Expected forum audit entries payload.");
  assert.ok((firstPageEntries?.length ?? 0) >= 1, "Expected at least one forum audit entry.");
  assert.equal(typeof firstPageResponse.body?.total, "number");
  assert.equal(firstPageResponse.body?.page, 1);
  assert.equal(firstPageResponse.body?.pageSize, 20);
  assert.equal(typeof firstPageResponse.body?.hasMore, "boolean");

  const firstEntry = firstPageEntries?.[0];
  assert.ok(firstEntry, "Expected first page forum entry.");
  assert.equal(typeof firstEntry.occurredAt, "string");

  const allReturnedEntries: Array<{
    action: string;
    target: string;
    status: "success" | "failed";
    message: string;
    actor: { id: string; name: string };
    occurredAt: string;
  }> = [...(firstPageEntries ?? [])];

  let page = 2;
  let hasMore = Boolean(firstPageResponse.body?.hasMore);
  while (hasMore && page <= 50) {
    const pagedResponse = await adminAgent.get("/api/admin/forum/audit-logs").query({
      page,
      pageSize: 20,
    });
    assert.equal(pagedResponse.status, 200);

    const entries = pagedResponse.body?.entries as
      | Array<{
          action: string;
          target: string;
          status: "success" | "failed";
          message: string;
          actor: { id: string; name: string };
          occurredAt: string;
        }>
      | undefined;
    assert.ok(Array.isArray(entries), "Expected paginated forum audit entries payload.");
    allReturnedEntries.push(...entries);

    hasMore = Boolean(pagedResponse.body?.hasMore);
    page += 1;
  }

  assert.ok(
    allReturnedEntries.some(
      (entry) => entry.actor.id === adminUser.id && entry.actor.name === "Forum Audit Admin"
    ),
    "Expected at least one forum audit entry created by the requesting admin."
  );
  assert.ok(
    allReturnedEntries.some(
      (entry) => entry.status === "success" && entry.target.includes(thread.title)
    ),
    "Expected persisted successful pin audit entry."
  );
  assert.ok(
    allReturnedEntries.some(
      (entry) => entry.status === "failed" && /not found/i.test(entry.message)
    ),
    "Expected persisted failed pin audit entry."
  );
});

test("ai general tutor sessions list is sorted by lastMessageAt and excludes chapter-specific sessions", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const studentAgent = request.agent(app);
  const otherAgent = request.agent(app);

  await signUp(studentAgent, "AI History Student", `tst_ai_history_${Date.now()}@example.com`);
  await signUp(otherAgent, "AI History Other", `tst_ai_history_other_${Date.now()}@example.com`);

  const studentUser = await getSessionUser(studentAgent);
  const otherUser = await getSessionUser(otherAgent);
  const chapterId = await createChapterFixture();

  const now = Date.now();

  const olderGeneralSession = (
    await db
      .insert(aiChatSessions)
      .values({
        userId: studentUser.id,
        chapterId: null,
        title: "Older General Session",
        lastMessageAt: new Date(now - 5 * 60 * 60 * 1000),
      })
      .returning({
        id: aiChatSessions.id,
      })
  )[0];
  assert.ok(olderGeneralSession, "Expected older general session insert.");

  const newerGeneralSession = (
    await db
      .insert(aiChatSessions)
      .values({
        userId: studentUser.id,
        chapterId: null,
        title: "Most Recent General Session",
        lastMessageAt: new Date(now - 10 * 60 * 1000),
      })
      .returning({
        id: aiChatSessions.id,
      })
  )[0];
  assert.ok(newerGeneralSession, "Expected newer general session insert.");

  await db.insert(aiChatSessions).values({
    userId: studentUser.id,
    chapterId,
    title: "Chapter Scoped Session",
    lastMessageAt: new Date(now - 2 * 60 * 1000),
  });

  await db.insert(aiChatSessions).values({
    userId: otherUser.id,
    chapterId: null,
    title: "Other User Session",
    lastMessageAt: new Date(now - 1 * 60 * 1000),
  });

  const unauthenticatedResponse = await anonAgent.get("/api/ai/sessions");
  assert.equal(unauthenticatedResponse.status, 401);

  const sessionsResponse = await studentAgent.get("/api/ai/sessions");
  assert.equal(sessionsResponse.status, 200);

  const sessions = sessionsResponse.body?.sessions as
    | Array<{
        id: string;
        title: string;
        lastMessageAt: string;
      }>
    | undefined;
  assert.ok(Array.isArray(sessions), "Expected sessions array payload.");
  assert.equal(sessions?.length, 2);
  assert.equal(sessions?.[0]?.id, newerGeneralSession.id);
  assert.equal(sessions?.[1]?.id, olderGeneralSession.id);
});

test("ai general tutor session history endpoint returns ordered messages and rejects unauthorized access", async () => {
  const app = createApp();
  const studentAgent = request.agent(app);
  const otherAgent = request.agent(app);

  await signUp(studentAgent, "AI History Owner", `tst_ai_history_owner_${Date.now()}@example.com`);
  await signUp(otherAgent, "AI History Viewer", `tst_ai_history_viewer_${Date.now()}@example.com`);

  const ownerUser = await getSessionUser(studentAgent);
  const otherUser = await getSessionUser(otherAgent);
  const now = Date.now();

  const session = (
    await db
      .insert(aiChatSessions)
      .values({
        userId: ownerUser.id,
        chapterId: null,
        title: "Session Detail Test",
        lastMessageAt: new Date(now),
      })
      .returning({
        id: aiChatSessions.id,
      })
  )[0];
  assert.ok(session, "Expected session insert for history details.");

  await db.insert(aiMessages).values([
    {
      sessionId: session.id,
      role: "user",
      content: "First message",
      createdAt: new Date(now - 2000),
    },
    {
      sessionId: session.id,
      role: "assistant",
      content: "Second message",
      createdAt: new Date(now - 1000),
    },
  ]);

  const detailResponse = await studentAgent.get(`/api/ai/sessions/${session.id}/messages`);
  assert.equal(detailResponse.status, 200);

  const payload = detailResponse.body as {
    session?: { id: string; title: string; lastMessageAt: string };
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  assert.equal(payload.session?.id, session.id);
  assert.equal(payload.session?.title, "Session Detail Test");
  assert.ok(Array.isArray(payload.messages), "Expected messages array payload.");
  assert.equal(payload.messages?.length, 2);
  assert.equal(payload.messages?.[0]?.role, "user");
  assert.equal(payload.messages?.[0]?.content, "First message");
  assert.equal(payload.messages?.[1]?.role, "assistant");
  assert.equal(payload.messages?.[1]?.content, "Second message");

  const forbiddenResponse = await otherAgent.get(`/api/ai/sessions/${session.id}/messages`);
  assert.equal(forbiddenResponse.status, 404);

  const otherUserSession = (
    await db
      .insert(aiChatSessions)
      .values({
        userId: otherUser.id,
        chapterId: null,
        title: "Other User Session",
        lastMessageAt: new Date(now + 1000),
      })
      .returning({
        id: aiChatSessions.id,
      })
  )[0];
  assert.ok(otherUserSession, "Expected other user session insert.");

  const hiddenResponse = await studentAgent.get(`/api/ai/sessions/${otherUserSession.id}/messages`);
  assert.equal(hiddenResponse.status, 404);
});
