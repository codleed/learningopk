import { and, eq } from "drizzle-orm";
import request from "supertest";
import { z } from "zod";

import { db, pool } from "../lib/db/index.js";
import { forumReplies, forumReplyVotes, forumThreads } from "../lib/db/schema.js";
import { redis } from "../lib/redis.js";
import { createApp } from "../server.js";

type RequestAgent = ReturnType<typeof request.agent>;

const signUpUser = async (agent: RequestAgent, prefix: string) => {
  const email = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}@example.com`;
  const password = "StrongPass123";

  const signUpResponse = await agent.post("/api/auth/sign-up/email").set("origin", "http://localhost:3000").send({
    name: `${prefix} user`,
    email,
    password,
    class: "9th",
    board: "fbise"
  });
  if (signUpResponse.status >= 400) {
    throw new Error(`Sign-up failed for ${prefix}: ${signUpResponse.status} ${JSON.stringify(signUpResponse.body)}`);
  }

  const sessionResponse = await agent.get("/api/auth/get-session").set("origin", "http://localhost:3000");
  const userId = z
    .object({
      user: z.object({
        id: z.string().min(1)
      })
    })
    .safeParse(sessionResponse.body).data?.user.id;

  if (!userId) {
    throw new Error(`Session fetch failed for ${prefix}: ${sessionResponse.status}`);
  }

  return { userId };
};

const run = async (): Promise<void> => {
  const app = createApp();
  const ownerAgent = request.agent(app);
  const helperAgent = request.agent(app);
  const anonAgent = request(app);

  const owner = await signUpUser(ownerAgent, "forum_owner");
  const helper = await signUpUser(helperAgent, "forum_helper");

  const threadCreateResponse = await ownerAgent.post("/api/forum/threads").send({
    title: "Need help proving a geometry theorem",
    body: "I can draw the triangle and angles, but I get stuck proving the congruent sides part."
  });
  if (threadCreateResponse.status !== 201) {
    throw new Error(`Owner thread creation failed with ${threadCreateResponse.status}`);
  }
  const threadId = z
    .object({
      thread: z.object({
        id: z.string().uuid()
      })
    })
    .parse(threadCreateResponse.body).thread.id;

  const helperReplyResponse = await helperAgent.post(`/api/forum/threads/${threadId}/replies`).send({
    body: "Start by adding the auxiliary line from the vertex, then compare corresponding angles."
  });
  if (helperReplyResponse.status !== 201) {
    throw new Error(`Helper reply creation failed with ${helperReplyResponse.status}`);
  }
  const helperReplyId = z
    .object({
      reply: z.object({
        id: z.string().uuid()
      })
    })
    .parse(helperReplyResponse.body).reply.id;

  const ownerReplyResponse = await ownerAgent.post(`/api/forum/threads/${threadId}/replies`).send({
    body: "I think using alternate interior angles might simplify this."
  });
  if (ownerReplyResponse.status !== 201) {
    throw new Error(`Owner reply creation failed with ${ownerReplyResponse.status}`);
  }
  const ownerReplyId = z
    .object({
      reply: z.object({
        id: z.string().uuid()
      })
    })
    .parse(ownerReplyResponse.body).reply.id;

  const unauthVoteResponse = await anonAgent.post(`/api/forum/replies/${helperReplyId}/vote`).send({
    voteType: "upvote"
  });
  if (unauthVoteResponse.status !== 401) {
    throw new Error(`Expected unauthenticated vote 401, got ${unauthVoteResponse.status}`);
  }

  const firstVoteResponse = await helperAgent.post(`/api/forum/replies/${helperReplyId}/vote`).send({
    voteType: "upvote"
  });
  if (firstVoteResponse.status !== 200) {
    throw new Error(`Expected first vote status 200, got ${firstVoteResponse.status}`);
  }

  const sameVoteResponse = await helperAgent.post(`/api/forum/replies/${helperReplyId}/vote`).send({
    voteType: "upvote"
  });
  if (sameVoteResponse.status !== 200) {
    throw new Error(`Expected repeated vote status 200, got ${sameVoteResponse.status}`);
  }

  const uniqueVoteRows = await db
    .select({
      id: forumReplyVotes.id
    })
    .from(forumReplyVotes)
    .where(and(eq(forumReplyVotes.userId, helper.userId), eq(forumReplyVotes.replyId, helperReplyId)));
  if (uniqueVoteRows.length !== 1) {
    throw new Error(`Expected one vote row for user/reply, found ${uniqueVoteRows.length}`);
  }

  const downvoteResponse = await helperAgent.post(`/api/forum/replies/${helperReplyId}/vote`).send({
    voteType: "downvote"
  });
  if (downvoteResponse.status !== 200) {
    throw new Error(`Expected vote change status 200, got ${downvoteResponse.status}`);
  }

  const votedReplyRows = await db
    .select({
      upvotes: forumReplies.upvotes
    })
    .from(forumReplies)
    .where(eq(forumReplies.id, helperReplyId))
    .limit(1);
  const votedReply = votedReplyRows[0];
  if (!votedReply) {
    throw new Error("Voted reply not found after vote updates.");
  }
  if (votedReply.upvotes !== -1) {
    throw new Error(`Expected upvotes=-1 after upvote->downvote switch, got ${votedReply.upvotes}`);
  }

  const nonOwnerAcceptResponse = await helperAgent.post(`/api/forum/replies/${helperReplyId}/accept`).send({});
  if (nonOwnerAcceptResponse.status !== 403) {
    throw new Error(`Expected non-owner accept status 403, got ${nonOwnerAcceptResponse.status}`);
  }

  const ownerAcceptFirstResponse = await ownerAgent.post(`/api/forum/replies/${helperReplyId}/accept`).send({});
  if (ownerAcceptFirstResponse.status !== 200) {
    throw new Error(`Expected owner accept status 200, got ${ownerAcceptFirstResponse.status}`);
  }

  const ownerAcceptSecondResponse = await ownerAgent.post(`/api/forum/replies/${ownerReplyId}/accept`).send({});
  if (ownerAcceptSecondResponse.status !== 200) {
    throw new Error(`Expected second owner accept status 200, got ${ownerAcceptSecondResponse.status}`);
  }

  const acceptedRows = await db
    .select({
      id: forumReplies.id,
      isAcceptedAnswer: forumReplies.isAcceptedAnswer
    })
    .from(forumReplies)
    .where(eq(forumReplies.threadId, threadId));
  const acceptedAnswerRows = acceptedRows.filter((row) => row.isAcceptedAnswer);
  if (acceptedAnswerRows.length !== 1) {
    throw new Error(`Expected exactly one accepted answer in thread, found ${acceptedAnswerRows.length}`);
  }
  if (acceptedAnswerRows[0]?.id !== ownerReplyId) {
    throw new Error("Latest accepted answer should be the owner's reply.");
  }

  const threadRows = await db
    .select({
      isSolved: forumThreads.isSolved
    })
    .from(forumThreads)
    .where(and(eq(forumThreads.id, threadId), eq(forumThreads.userId, owner.userId)))
    .limit(1);
  const threadRow = threadRows[0];
  if (!threadRow) {
    throw new Error("Thread not found when checking solved state.");
  }
  if (!threadRow.isSolved) {
    throw new Error("Thread should be marked solved after accepted answer.");
  }

  console.log(`UNAUTH_VOTE_STATUS=${unauthVoteResponse.status}`);
  console.log(`FIRST_VOTE_STATUS=${firstVoteResponse.status}`);
  console.log(`REPEAT_VOTE_STATUS=${sameVoteResponse.status}`);
  console.log(`VOTE_ROWS_FOR_USER_REPLY=${uniqueVoteRows.length}`);
  console.log(`UPVOTES_AFTER_VOTE_SWITCH=${votedReply.upvotes}`);
  console.log(`NON_OWNER_ACCEPT_STATUS=${nonOwnerAcceptResponse.status}`);
  console.log(`OWNER_ACCEPT_STATUS=${ownerAcceptFirstResponse.status}`);
  console.log(`OWNER_REACCEPT_STATUS=${ownerAcceptSecondResponse.status}`);
  console.log(`ACCEPTED_ROWS=${acceptedAnswerRows.length}`);
  console.log(`THREAD_SOLVED=${threadRow.isSolved}`);
};

run()
  .catch((error) => {
    console.error("Forum FRM-02 verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
    if (redis.isOpen) {
      await redis.quit().catch(() => undefined);
    }
  });

