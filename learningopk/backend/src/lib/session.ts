import { fromNodeHeaders } from "better-auth/node";
import { eq } from "drizzle-orm";
import type { Request, Response, RequestHandler } from "express";

import { auth } from "./auth.js";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import { ServiceUnavailableError } from "./errors/index.js";
import { logger } from "./logger.js";
import { errorResponse } from "./response.js";

export type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;

export type AuthenticatedRequest = Request & {
  session: NonNullable<SessionResult>;
  userRole: "student" | "teacher" | "admin" | "moderator";
};

export const requireSession: RequestHandler = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });

    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userRows = await db
      .select({
        status: users.status,
        suspendedUntil: users.suspendedUntil,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const user = userRows[0];
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (user.status === "suspended") {
      try {
        if (user.suspendedUntil && user.suspendedUntil < new Date()) {
          await db
            .update(users)
            .set({ status: "active", suspendedUntil: null })
            .where(eq(users.id, session.user.id));
        } else {
          res.status(403).json({
            error: "Account suspended",
            code: "ACCOUNT_SUSPENDED"
          });
          return;
        }
      } catch {
        res.status(403).json({
          error: "Account suspended",
          code: "ACCOUNT_SUSPENDED"
        });
        return;
      }
    }

    (req as AuthenticatedRequest).session = session;
    (req as AuthenticatedRequest).userRole = user.role ?? "student";
    next();
  } catch (error) {
    logger.error({ error }, "Session retrieval error");
    // Auth service or database error - treat as service unavailable
    res.status(503).json({
      error: "Authentication service unavailable",
      code: "AUTH_SERVICE_UNAVAILABLE"
    });
  }
};

export const requireTeacherRole = async (req: AuthenticatedRequest, res: Response): Promise<boolean> => {
  if (req.userRole !== "teacher") {
    res.status(403).json(errorResponse("Teacher access required", "FORBIDDEN"));
    return false;
  }
  return true;
};

export const getSessionFromRequest = async (req: Request): Promise<SessionResult> => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });
    return session;
  } catch (error) {
    logger.error({ error }, "Session retrieval error");
    // Throw service unavailable error so route can handle appropriately
    throw new ServiceUnavailableError("Authentication service unavailable.", "AUTH_SERVICE_UNAVAILABLE");
  }
};
