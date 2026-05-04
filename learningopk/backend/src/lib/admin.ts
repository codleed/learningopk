import type { Response } from "express";
import { eq } from "drizzle-orm";

import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import type { AuthenticatedRequest } from "./session.js";

export const requireAdminRole = async (req: AuthenticatedRequest, res: Response): Promise<boolean> => {
  const userRows = await db
    .select({
      role: users.role
    })
    .from(users)
    .where(eq(users.id, req.session.user.id))
    .limit(1);

  if (userRows[0]?.role !== "admin") {
    res.status(403).json({
      error: "Forbidden"
    });
    return false;
  }

  return true;
};

export const requireStaffRole = async (req: AuthenticatedRequest, res: Response): Promise<boolean> => {
  const userRows = await db
    .select({
      role: users.role
    })
    .from(users)
    .where(eq(users.id, req.session.user.id))
    .limit(1);

  const role = userRows[0]?.role;
  if (role !== "admin" && role !== "moderator") {
    res.status(403).json({
      error: "Forbidden"
    });
    return false;
  }

  return true;
};
