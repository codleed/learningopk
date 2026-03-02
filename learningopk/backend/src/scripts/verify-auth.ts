import request from "supertest";

import { createApp } from "../server.js";

const run = async (): Promise<void> => {
  const app = createApp();
  const agent = request.agent(app);
  const anonAgent = request(app);
  const email = `phase1_${Date.now()}@example.com`;
  const password = "StrongPass123";

  const unauthQuizResponse = await anonAgent.post("/api/quiz/submit").send({
    quizId: 1,
    answers: { "1": "a" }
  });
  if (unauthQuizResponse.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated quiz mutation, got ${unauthQuizResponse.status}`);
  }

  const signUpResponse = await agent
    .post("/api/auth/sign-up/email")
    .set("origin", "http://localhost:3000")
    .send({
      name: "Phase One User",
      email,
      password,
      class: "9th",
      board: "fbise"
    });

  if (signUpResponse.status >= 400) {
    throw new Error(`Sign-up failed: ${signUpResponse.status} ${JSON.stringify(signUpResponse.body)}`);
  }

  const sessionResponse = await agent.get("/api/auth/get-session").set("origin", "http://localhost:3000");
  if (sessionResponse.status >= 400 || !sessionResponse.body?.session) {
    throw new Error(`Session fetch failed after sign-up: ${sessionResponse.status}`);
  }

  const signOutResponse = await agent.post("/api/auth/sign-out").set("origin", "http://localhost:3000").send({});
  if (signOutResponse.status >= 400) {
    throw new Error(`Sign-out failed: ${signOutResponse.status} ${JSON.stringify(signOutResponse.body)}`);
  }

  const afterSignOutSessionResponse = await agent
    .get("/api/auth/get-session")
    .set("origin", "http://localhost:3000");
  if (afterSignOutSessionResponse.body?.session) {
    throw new Error("Session should be cleared after sign-out.");
  }

  const signInResponse = await agent
    .post("/api/auth/sign-in/email")
    .set("origin", "http://localhost:3000")
    .send({ email, password });

  if (signInResponse.status >= 400) {
    throw new Error(`Sign-in failed: ${signInResponse.status} ${JSON.stringify(signInResponse.body)}`);
  }

  const afterSignInSessionResponse = await agent.get("/api/auth/get-session").set("origin", "http://localhost:3000");
  if (!afterSignInSessionResponse.body?.session) {
    throw new Error("Session should exist after sign-in.");
  }

  const authedQuizResponse = await agent.post("/api/quiz/submit").send({
    quizId: 1,
    answers: {}
  });
  if (authedQuizResponse.status !== 200 && authedQuizResponse.status !== 404) {
    throw new Error(`Expected 200/404 for authenticated quiz mutation, got ${authedQuizResponse.status}`);
  }

  console.log(`UNAUTH_QUIZ_STATUS=${unauthQuizResponse.status}`);
  console.log(`SIGN_UP_STATUS=${signUpResponse.status}`);
  console.log(`GET_SESSION_STATUS=${sessionResponse.status}`);
  console.log(`SIGN_OUT_STATUS=${signOutResponse.status}`);
  console.log(`POST_SIGN_OUT_SESSION_STATUS=${afterSignOutSessionResponse.status}`);
  console.log(`SIGN_IN_STATUS=${signInResponse.status}`);
  console.log(`POST_SIGN_IN_SESSION_STATUS=${afterSignInSessionResponse.status}`);
  console.log(`AUTH_QUIZ_STATUS=${authedQuizResponse.status}`);
};

run().catch((error) => {
  console.error("Auth verification failed:", error);
  process.exitCode = 1;
});

