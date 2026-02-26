import { fromNodeHeaders } from "better-auth/node";
import type { Request, RequestHandler } from "express";

import { auth } from "./auth.js";

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

  (req as AuthenticatedRequest).session = session;
  next();
};

export const getSessionFromRequest = async (req: Request): Promise<SessionResult> => {
  return auth.api.getSession({
    headers: fromNodeHeaders(req.headers)
  });
};
