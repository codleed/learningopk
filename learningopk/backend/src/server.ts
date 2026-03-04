import cors from "cors";
import express from "express";
import { pathToFileURL } from "node:url";

import { env } from "./lib/env.js";
import { adminRouter } from "./routes/admin.js";
import { aiChatRouter } from "./routes/ai-chat.js";
import { authRouter } from "./routes/auth.js";
import { forumRouter } from "./routes/forum.js";
import { healthRouter } from "./routes/health.js";
import { learnRouter } from "./routes/learn.js";
import { chapterMediaRouter } from "./routes/chapter-media.js";
import { profileRouter } from "./routes/profile.js";
import { progressRouter } from "./routes/progress.js";
import { quizRouter } from "./routes/quiz.js";

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
      exposedHeaders: ["x-ai-session-id", "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset"]
    })
  );

  app.use("/api/auth", authRouter);
  app.use(express.json());

  app.use("/api/health", healthRouter);
  app.use("/api/learn", learnRouter);
  app.use("/api/ai", aiChatRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/forum", forumRouter);
  app.use("/api/quiz", quizRouter);
  app.use("/api/progress", progressRouter);
  app.use("/api/users", profileRouter);
  app.use("/api/admin/content", chapterMediaRouter);

  app.get("/api/ready", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  return app;
};

const isDirectRun = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isDirectRun) {
  const app = createApp();
  app.listen(Number(env.PORT), () => {
    console.log(`Backend listening on http://localhost:${env.PORT}`);
  });
}
