import * as Sentry from "@sentry/node";
import type { Request, Response, NextFunction } from "express";

import { logger } from "./logger.js";

// ---------------------------------------------------------------------------
// Sentry Initialization (optional — will not crash if DSN is absent)
// ---------------------------------------------------------------------------

const dsn = process.env.SENTRY_DSN;

let sentryInitialized = false;

if (dsn && dsn.length > 0) {
  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
      sendDefaultPii: true,
      enableLogs: true,
      // Source maps: Sentry CLI / CI will upload them.
      // The `release` tag lets Sentry match uploaded maps to events.
      release: process.env.SENTRY_RELEASE ?? undefined,
      integrations: [
        Sentry.onUnhandledRejectionIntegration(),
        Sentry.vercelAIIntegration({
          force: true,
          recordInputs: process.env.NODE_ENV === "development",
          recordOutputs: process.env.NODE_ENV === "development",
        }),
        Sentry.pinoIntegration(),
      ],
    });
    sentryInitialized = true;
    logger.info("Sentry initialized successfully");
  } catch (error: unknown) {
    logger.warn({ error }, "Sentry initialization failed — error capture disabled");
  }
} else {
  logger.info("SENTRY_DSN not set — Sentry disabled");
}

export { Sentry };
export const isSentryEnabled = (): boolean => sentryInitialized;

// ---------------------------------------------------------------------------
// Capture helpers
// ---------------------------------------------------------------------------

export const captureException = (error: unknown, context?: Record<string, unknown>): void => {
  if (!sentryInitialized) return;
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = "info"): void => {
  if (!sentryInitialized) return;
  Sentry.captureMessage(message, level);
};

// ---------------------------------------------------------------------------
// Express Error Handler Middleware (place AFTER all routes)
// ---------------------------------------------------------------------------

export const sentryErrorHandler = (
  err: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  captureException(err);
  next(err);
};

// ---------------------------------------------------------------------------
// Global handlers for unhandled errors
// ---------------------------------------------------------------------------

process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught exception");
  captureException(error, { source: "uncaughtException" });
});

process.on("unhandledRejection", (reason) => {
  logger.error({ error: reason }, "Unhandled promise rejection");
  captureException(reason instanceof Error ? reason : new Error(String(reason)), {
    source: "unhandledRejection",
  });
});
