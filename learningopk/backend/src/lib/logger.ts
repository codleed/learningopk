import pino from "pino";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// Correlation ID propagation via AsyncLocalStorage
// ---------------------------------------------------------------------------

export interface RequestContext {
  correlationId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Retrieve the current correlation ID from AsyncLocalStorage.
 * Falls back to "no-correlation-id" when called outside a request scope.
 */
export const getCorrelationId = (): string => {
  return requestContext.getStore()?.correlationId ?? "no-correlation-id";
};

// ---------------------------------------------------------------------------
// Pino logger singleton
// ---------------------------------------------------------------------------

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // In production, write JSON; in development, keep JSON for structured parsing
  // (use `pino-pretty` in dev CLI if desired: `node ... | pino-pretty`)
});

// ---------------------------------------------------------------------------
// Child logger with correlation context
// ---------------------------------------------------------------------------

/**
 * Create a child logger pre-bound to the current correlation ID.
 */
export const createChildLogger = (bindings?: Record<string, unknown>): pino.Logger => {
  const correlationId = getCorrelationId();
  return logger.child({ correlationId, ...bindings });
};

// ---------------------------------------------------------------------------
// Request logging middleware
// ---------------------------------------------------------------------------

/**
 * Express middleware that:
 * 1. Generates or extracts an X-Correlation-ID header
 * 2. Stores the correlation ID in AsyncLocalStorage
 * 3. Sets the correlation ID on the response header
 * 4. Logs request start and finish with timing
 */
export const createRequestLogger = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId =
      (typeof req.headers["x-correlation-id"] === "string" && req.headers["x-correlation-id"].length > 0)
        ? req.headers["x-correlation-id"]
        : randomUUID();

    // Attach to request for downstream access
    (req as Request & { correlationId: string }).correlationId = correlationId;

    // Set response header
    res.setHeader("x-correlation-id", correlationId);

    const startTime = process.hrtime.bigint();

    const reqLogger = logger.child({ correlationId });
    reqLogger.info({ method: req.method, path: req.originalUrl, message: "request started" });

    const onFinish = () => {
      res.removeListener("finish", onFinish);
      res.removeListener("close", onFinish);

      const durationNs = process.hrtime.bigint() - startTime;
      const durationMs = Number(durationNs / 1_000_000n);

      reqLogger.info({
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        message: "request completed",
      });
    };

    res.on("finish", onFinish);
    res.on("close", onFinish);

    // Run the rest of the middleware chain inside AsyncLocalStorage
    requestContext.run({ correlationId }, () => {
      next();
    });
  };
};
