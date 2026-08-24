import assert from "node:assert/strict";
import { after, test } from "node:test";

import { and, eq } from "drizzle-orm";
import request from "supertest";

import { db, pool } from "../../lib/db/index.js";
import {
  boardClasses,
  boards,
  chapterSubparts,
  chapterSummaryLinks,
  chapters,
  subjects,
  userProgress,
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
};

const signUp = async (
  agent: AuthAgent,
  input: { name: string; email: string; board: string; className: string }
) => {
  const response = await agent.post("/api/auth/sign-up/email").set("origin", APP_ORIGIN).send({
    name: input.name,
    email: input.email,
    password: TEST_PASSWORD,
    board: input.board,
    class: input.className,
  });

  assert.ok(
    response.status < 400,
    `Expected sign-up success, got ${response.status} ${JSON.stringify(response.body)}`
  );
};

const getSessionUser = async (agent: AuthAgent): Promise<SessionUser> => {
  const response = await agent.get("/api/auth/get-session").set("origin", APP_ORIGIN);
  assert.ok(
    response.status < 400,
    `Expected session success, got ${response.status} ${JSON.stringify(response.body)}`
  );

  const user = response.body?.user as SessionUser | undefined;
  assert.ok(user?.id, "Expected authenticated session user ID.");
  return user;
};

const setStudentProfileScope = async ({
  userId,
  boardSlug,
  classSlug,
}: {
  userId: string;
  boardSlug: string;
  classSlug: string;
}) => {
  await db
    .update(users)
    .set({
      board: boardSlug,
      class: classSlug,
    })
    .where(eq(users.id, userId));
};

const createSubjectScopedGraphFixture = async () => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const boardSlug = `graph-board-${suffix}`;
  const classSlug = `graph-class-${suffix}`;
  const sourceTitle = `Graph Source ${suffix}`;
  const targetTitle = `Graph Target ${suffix}`;
  const foreignTitle = `Foreign Subject Chapter ${suffix}`;
  const hiddenTitle = `Hidden Chapter ${suffix}`;

  const [board] = await db
    .insert(boards)
    .values({
      name: `Graph Board ${suffix}`,
      slug: boardSlug,
    })
    .returning({
      id: boards.id,
      slug: boards.slug,
    });
  assert.ok(board, "Expected board fixture insert.");

  const [boardClass] = await db
    .insert(boardClasses)
    .values({
      boardId: board.id,
      name: `Graph Class ${suffix}`,
      slug: classSlug,
    })
    .returning({
      id: boardClasses.id,
      slug: boardClasses.slug,
    });
  assert.ok(boardClass, "Expected board class fixture insert.");

  const [subject] = await db
    .insert(subjects)
    .values({
      boardId: board.id,
      boardClassId: boardClass.id,
      grade: null,
      name: `Graph Subject ${suffix}`,
      slug: `graph-subject-${suffix}`,
      description: "Subject-scoped graph fixture subject.",
    })
    .returning({
      id: subjects.id,
      slug: subjects.slug,
    });
  assert.ok(subject, "Expected fixture subject insert.");

  const [foreignSubject] = await db
    .insert(subjects)
    .values({
      boardId: board.id,
      boardClassId: boardClass.id,
      grade: null,
      name: `Foreign Subject ${suffix}`,
      slug: `foreign-subject-${suffix}`,
      description: "Cross-subject graph exclusion fixture.",
    })
    .returning({
      id: subjects.id,
    });
  assert.ok(foreignSubject, "Expected foreign subject fixture insert.");

  const insertedChapters = await db
    .insert(chapters)
    .values([
      {
        subjectId: subject.id,
        chapterNumber: 1,
        title: sourceTitle,
        slug: `graph-source-${suffix}`,
        summary: "Graph source summary fixture.",
        isPublished: true,
      },
      {
        subjectId: subject.id,
        chapterNumber: 2,
        title: targetTitle,
        slug: `graph-target-${suffix}`,
        summary: "Graph target summary fixture.",
        isPublished: true,
      },
      {
        subjectId: subject.id,
        chapterNumber: 3,
        title: hiddenTitle,
        slug: `hidden-chapter-${suffix}`,
        summary: "Unpublished chapter should be excluded from student graph.",
        isPublished: false,
      },
      {
        subjectId: foreignSubject.id,
        chapterNumber: 1,
        title: foreignTitle,
        slug: `foreign-chapter-${suffix}`,
        summary: "Foreign subject chapter should never appear in subject graph.",
        isPublished: true,
      },
    ])
    .returning({
      id: chapters.id,
      title: chapters.title,
    });

  const sourceChapter = insertedChapters.find((chapter) => chapter.title === sourceTitle);
  const targetChapter = insertedChapters.find((chapter) => chapter.title === targetTitle);
  const hiddenChapter = insertedChapters.find((chapter) => chapter.title === hiddenTitle);
  const foreignChapter = insertedChapters.find((chapter) => chapter.title === foreignTitle);
  assert.ok(sourceChapter, "Expected source chapter insert.");
  assert.ok(targetChapter, "Expected target chapter insert.");
  assert.ok(hiddenChapter, "Expected hidden chapter insert.");
  assert.ok(foreignChapter, "Expected foreign chapter insert.");

  const insertedSubparts = await db
    .insert(chapterSubparts)
    .values([
      {
        chapterId: sourceChapter.id,
        orderIndex: 1,
        heading: `${sourceTitle} Subpart`,
        content: "Source subpart content.",
      },
      {
        chapterId: targetChapter.id,
        orderIndex: 1,
        heading: `${targetTitle} Subpart`,
        content: "Target subpart content.",
      },
      {
        chapterId: hiddenChapter.id,
        orderIndex: 1,
        heading: `${hiddenTitle} Subpart`,
        content: "Hidden subpart content.",
      },
      {
        chapterId: foreignChapter.id,
        orderIndex: 1,
        heading: `${foreignTitle} Subpart`,
        content: "Foreign subpart content.",
      },
    ])
    .returning({
      id: chapterSubparts.id,
      chapterId: chapterSubparts.chapterId,
    });

  const sourceSubpart = insertedSubparts.find((subpart) => subpart.chapterId === sourceChapter.id);
  const targetSubpart = insertedSubparts.find((subpart) => subpart.chapterId === targetChapter.id);
  const hiddenSubpart = insertedSubparts.find((subpart) => subpart.chapterId === hiddenChapter.id);
  const foreignSubpart = insertedSubparts.find(
    (subpart) => subpart.chapterId === foreignChapter.id
  );
  assert.ok(sourceSubpart, "Expected source subpart insert.");
  assert.ok(targetSubpart, "Expected target subpart insert.");
  assert.ok(hiddenSubpart, "Expected hidden subpart insert.");
  assert.ok(foreignSubpart, "Expected foreign subpart insert.");

  await db.insert(chapterSummaryLinks).values([
    {
      sourceSubpartId: sourceSubpart.id,
      targetSubpartId: targetSubpart.id,
      targetTitle: targetTitle,
      normalizedTarget: `target-${suffix}`,
      isResolved: true,
    },
    {
      sourceSubpartId: sourceSubpart.id,
      targetSubpartId: foreignSubpart.id,
      targetTitle: foreignTitle,
      normalizedTarget: `cross-subject-${suffix}`,
      isResolved: true,
    },
    {
      sourceSubpartId: sourceSubpart.id,
      targetSubpartId: hiddenSubpart.id,
      targetTitle: hiddenTitle,
      normalizedTarget: `hidden-target-${suffix}`,
      isResolved: true,
    },
    {
      sourceSubpartId: sourceSubpart.id,
      targetSubpartId: null,
      targetTitle: `Unresolved ${suffix}`,
      normalizedTarget: `unresolved-${suffix}`,
      isResolved: false,
    },
    {
      sourceSubpartId: foreignSubpart.id,
      targetSubpartId: targetSubpart.id,
      targetTitle: targetTitle,
      normalizedTarget: `foreign-source-${suffix}`,
      isResolved: true,
    },
    {
      sourceSubpartId: foreignSubpart.id,
      targetSubpartId: null,
      targetTitle: `Foreign Unresolved ${suffix}`,
      normalizedTarget: `foreign-unresolved-${suffix}`,
      isResolved: false,
    },
  ]);

  return {
    boardSlug: board.slug,
    classSlug: boardClass.slug,
    subjectSlug: subject.slug,
    sourceChapterId: sourceChapter.id,
    targetChapterId: targetChapter.id,
    hiddenChapterId: hiddenChapter.id,
    foreignChapterId: foreignChapter.id,
  };
};

after(async () => {
  if (redis.isOpen) {
    await redis.quit();
  }
  await pool.end().catch(() => undefined);
});

test("learn subject graph route requires authenticated session", async () => {
  const app = createApp();
  const anonAgent = request(app);
  const fixture = await createSubjectScopedGraphFixture();

  const response = await anonAgent.get(
    `/api/learn/${fixture.boardSlug}/${fixture.classSlug}/${fixture.subjectSlug}/graph`
  );
  assert.equal(response.status, 401);
});

test("learn subject graph route enforces student board/class scope", async () => {
  const app = createApp();
  const agent = request.agent(app);
  const fixture = await createSubjectScopedGraphFixture();
  const email = `scope_student_${Date.now()}@example.com`;
  await signUp(agent, {
    name: "Scoped Student",
    email,
    board: `different-board-${Date.now()}`,
    className: `different-class-${Date.now()}`,
  });
  const sessionUser = await getSessionUser(agent);

  await setStudentProfileScope({
    userId: sessionUser.id,
    boardSlug: `different-board-${Date.now()}`,
    classSlug: `different-class-${Date.now()}`,
  });

  const response = await agent.get(
    `/api/learn/${fixture.boardSlug}/${fixture.classSlug}/${fixture.subjectSlug}/graph`
  );
  assert.equal(response.status, 403);
});

test("learn subject graph route returns only published nodes/edges scoped to the current subject", async () => {
  const app = createApp();
  const agent = request.agent(app);
  const fixture = await createSubjectScopedGraphFixture();

  const email = `graph_student_${Date.now()}@example.com`;
  await signUp(agent, {
    name: "Graph Student",
    email,
    board: fixture.boardSlug,
    className: fixture.classSlug,
  });
  const sessionUser = await getSessionUser(agent);
  await setStudentProfileScope({
    userId: sessionUser.id,
    boardSlug: fixture.boardSlug,
    classSlug: fixture.classSlug,
  });

  await db.insert(userProgress).values({
    userId: sessionUser.id,
    chapterId: fixture.targetChapterId,
    exercisesViewed: 2,
    flashcardsCompleted: true,
    quizBestScore: 1,
    quizAttemptsCount: 1,
  });

  const response = await agent.get(
    `/api/learn/${fixture.boardSlug}/${fixture.classSlug}/${fixture.subjectSlug}/graph`
  );
  assert.equal(response.status, 200);

  const nodes = response.body?.graph?.nodes as
    | Array<{
        id: number;
        title: string;
        slug: string;
        chapterNumber: number;
        isPublished: boolean;
        visited?: boolean;
        completed?: boolean;
      }>
    | undefined;
  const edges = response.body?.graph?.edges as
    | Array<{
        sourceChapterId: number;
        targetChapterId: number | null;
        isResolved: boolean;
      }>
    | undefined;
  assert.ok(Array.isArray(nodes), "Expected graph nodes payload.");
  assert.ok(Array.isArray(edges), "Expected graph edges payload.");

  const nodeIds = new Set(nodes?.map((node) => node.id));
  assert.ok(nodeIds.has(fixture.sourceChapterId), "Expected source chapter node in graph.");
  assert.ok(nodeIds.has(fixture.targetChapterId), "Expected target chapter node in graph.");
  assert.ok(!nodeIds.has(fixture.hiddenChapterId), "Unpublished chapter must not be returned.");
  assert.ok(
    !nodeIds.has(fixture.foreignChapterId),
    "Foreign-subject chapter must not be returned."
  );
  for (const node of nodes ?? []) {
    assert.equal(node.isPublished, true, "Student graph must not return unpublished chapters.");
  }

  assert.ok(
    edges?.some(
      (edge) =>
        edge.sourceChapterId === fixture.sourceChapterId &&
        edge.targetChapterId === fixture.targetChapterId
    ),
    "Expected resolved edge within current subject."
  );
  assert.ok(
    edges?.some(
      (edge) => edge.sourceChapterId === fixture.sourceChapterId && edge.targetChapterId === null
    ),
    "Expected unresolved edge sourced from current subject."
  );
  assert.ok(
    !(edges ?? []).some((edge) => edge.sourceChapterId === fixture.foreignChapterId),
    "Edges with source chapters outside the current subject must be excluded."
  );
  assert.ok(
    !(edges ?? []).some((edge) => edge.targetChapterId === fixture.foreignChapterId),
    "Edges targeting foreign-subject chapters must be excluded."
  );
  assert.ok(
    !(edges ?? []).some((edge) => edge.targetChapterId === fixture.hiddenChapterId),
    "Edges targeting unpublished chapters must be excluded."
  );

  const targetNode = nodes?.find((node) => node.id === fixture.targetChapterId);
  assert.equal(targetNode?.visited, true);
  assert.equal(targetNode?.completed, true);
  const sourceNode = nodes?.find((node) => node.id === fixture.sourceChapterId);
  assert.equal(sourceNode?.visited, false);
  assert.equal(sourceNode?.completed, false);

  const subjectLookup = await db
    .select({
      id: subjects.id,
    })
    .from(subjects)
    .where(eq(subjects.slug, fixture.subjectSlug))
    .limit(1);
  assert.ok(subjectLookup[0], "Expected fixture subject to exist.");
  const scopedSubjectId = subjectLookup[0].id;
  const returnedNodeIds = nodes?.map((node) => node.id) ?? [];
  const rowCount = await db
    .select({
      count: chapters.id,
    })
    .from(chapters)
    .where(and(eq(chapters.subjectId, scopedSubjectId), eq(chapters.isPublished, true)));
  assert.ok((rowCount.length ?? 0) >= 1);
  assert.ok(returnedNodeIds.length <= rowCount.length);
});
