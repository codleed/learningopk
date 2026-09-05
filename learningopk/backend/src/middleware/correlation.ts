import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

import { requestContext } from "../lib/logger.js";

// ---------------------------------------------------------------------------
// Extend Express Request type
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

// ---------------------------------------------------------------------------
// Correlation middleware
// ---------------------------------------------------------------------------

/**
 * Middleware that ensures every request has a correlation ID.
 * - Extracts from `X-Correlation-ID` header if present
 * - Generates a UUID v4 if not
 * - Attaches to `req.correlationId`
 * - Sets the response header `X-Correlation-ID`
 * - Wraps the remainder of the request in AsyncLocalStorage so
 *   downstream code can call `getCorrelationId()` without passing context.
 */
export const correlationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.headers["x-correlation-id"];
  const correlationId =
    typeof incoming === "string" && incoming.length > 0 ? incoming : randomUUID();

  req.correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);

  requestContext.run({ correlationId }, () => {
    next();
  });
};
