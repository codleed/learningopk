import { fromNodeHeaders } from "better-auth/node";
import { eq } from "drizzle-orm";
import type { Request, RequestHandler } from "express";

import { auth } from "./auth.js";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";

export type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;

export type AuthenticatedRequest = Request & {
  session: NonNullable<SessionResult>;
};

export const requireSession: RequestHandler = async (req, res, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers)
  });

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userRows = await db
    .select({
      status: users.status
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
    res.status(403).json({
      error: "Account suspended",
      code: "ACCOUNT_SUSPENDED"
    });
    return;
  }

  (req as AuthenticatedRequest).session = session;
  next();
};

export const getSessionFromRequest = async (req: Request): Promise<SessionResult> => {
  return auth.api.getSession({
    headers: fromNodeHeaders(req.headers)
  });
};
