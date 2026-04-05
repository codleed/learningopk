import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pathToFileURL } from "node:url";

import { env } from "./lib/env.js";
import { errorResponse } from "./lib/response.js";
import { isHttpError } from "./lib/errors/index.js";
import { authRateLimiter, globalRateLimiter } from "./middleware/rate-limits.js";
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
import { mockExamsRouter } from "./routes/mock-exams.js";

export const createApp = () => {
  const app = express();

  // Trust proxy for correct IP detection behind reverse proxy (for rate limiting)
  app.set("trust proxy", 1);

  // Security headers
  app.use(helmet());

  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
      exposedHeaders: ["x-ai-session-id", "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset"]
    })
  );

  // Strict rate limit on auth mutations to prevent brute force.
  // Skip GET endpoints (for example, /get-session) to avoid starving
  // interactive sessions while still protecting sign-in/sign-up flows.
  app.use("/api/auth", (req, res, next) => {
    if (process.env.NODE_ENV !== "production") {
      next();
      return;
    }

    if (req.method === "GET") {
      next();
      return;
    }

    authRateLimiter(req, res, next);
  });

  // Auth routes go before JSON body parser (better-auth handles its own parsing)
  app.use("/api/auth", authRouter);

  // JSON body parser with size limit to prevent large payload DoS
  app.use(express.json({ limit: "1mb" }));

  // Global rate limit on all other routes
  app.use(globalRateLimiter);

  app.use("/api/health", healthRouter);
  app.use("/api/learn", learnRouter);
  app.use("/api/ai", aiChatRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/forum", forumRouter);
  app.use("/api/quiz", quizRouter);
  app.use("/api/mock-exams", mockExamsRouter);
  app.use("/api/progress", progressRouter);
  app.use("/api/users", profileRouter);
  app.use("/api/admin/content", chapterMediaRouter);

  app.get("/api/ready", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  // Global error handler — catches unhandled errors from route handlers
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (isHttpError(err)) {
      res.status(err.status).json(err.toResponse());
      return;
    }

    console.error("Unhandled error:", err);
    res.status(500).json(errorResponse("Internal server error", "INTERNAL_ERROR"));
  });

  return app;
};

const isDirectRun = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isDirectRun) {
  const app = createApp();

  // Workers are loaded dynamically so that importing this module (e.g. in
  // tests or scripts via createApp) does not start BullMQ workers or open
  // long-lived Redis connections.
  const { createAnalyticsWorker } = await import("./workers/analytics.worker.js");
  const { createEmailWorker } = await import("./workers/email.worker.js");
  const { createCleanupWorker } = await import("./workers/cleanup.worker.js");
  const { closeAllQueues } = await import("./lib/queue.js");

  const analyticsWorker = createAnalyticsWorker();
  const emailWorker = createEmailWorker();
  const cleanupWorker = createCleanupWorker();

  const server = app.listen(Number(env.PORT), () => {
    console.log(`Backend listening on http://localhost:${env.PORT}`);
  });

  const shutdown = () => {
    console.log("Shutting down workers...");
    Promise.all([
      analyticsWorker.close(),
      emailWorker.close(),
      cleanupWorker.close(),
      closeAllQueues(),
    ]).finally(() => {
      server.close();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
