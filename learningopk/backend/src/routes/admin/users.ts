import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { requireAdminRole, requireStaffRole } from "../../lib/admin.js";
import { db } from "../../lib/db/index.js";
import { users } from "../../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../../lib/session.js";
import { escapeLikePattern } from "../../lib/escape-like.js";
import { persistAuditLog } from "./shared.js";

const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().optional().default(""),
  role: z.enum(["student", "admin", "moderator"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

const adminUserParamsSchema = z.object({
  id: z.string().trim().min(1),
});

const adminUserRoleUpdateBodySchema = z.object({
  role: z.enum(["student", "admin", "moderator"]),
});

const adminUserSuspensionBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("suspend"),
    reason: z.string().trim().min(10),
  }),
  z.object({
    action: z.literal("reactivate"),
    reason: z.string().trim().optional(),
  }),
]);

const listAdminUsers = async ({
  page,
  pageSize,
  q,
  role,
  status,
}: {
  page: number;
  pageSize: number;
  q: string;
  role?: "student" | "admin" | "moderator";
  status?: "active" | "suspended";
}) => {
  const offset = (page - 1) * pageSize;
  const searchTerm = q.trim();
  const rolePredicate = role ? eq(users.role, role) : undefined;
  const statusPredicate = status ? eq(users.status, status) : undefined;
  const searchPredicate =
    searchTerm.length > 0
      ? or(
          ilike(users.name, `%${escapeLikePattern(searchTerm)}%`),
          ilike(users.email, `%${escapeLikePattern(searchTerm)}%`)
        )
      : undefined;
  const predicates = [rolePredicate, statusPredicate, searchPredicate].filter(
    (value): value is SQL => Boolean(value)
  );
  const whereClause = predicates.length > 0 ? and(...predicates) : undefined;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      suspendedUntil: users.suspendedUntil,
      suspendedAt: users.suspendedAt,
      suspendedReason: users.suspendedReason,
      suspendedBy: users.suspendedBy,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt), desc(users.id))
    .offset(offset)
    .limit(pageSize);

  const totalRows = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(users)
    .where(whereClause);
  const total = totalRows[0]?.count ?? 0;

  return {
    entries: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      suspendedUntil: row.suspendedUntil?.toISOString() ?? null,
      suspendedAt: row.suspendedAt ? row.suspendedAt.toISOString() : null,
      suspendedReason: row.suspendedReason,
      suspendedBy: row.suspendedBy,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    hasMore: offset + rows.length < total,
  };
};

export const usersAdminRouter = Router();

usersAdminRouter.get("/users", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireStaffRole(authedReq, res))) {
    return;
  }

  const parsedQuery = adminUsersQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid users query parameters",
      details: parsedQuery.error.flatten(),
    });
    return;
  }

  const { page, pageSize, q, role, status } = parsedQuery.data;
  const payload = await listAdminUsers({
    page,
    pageSize,
    q,
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
  });

  res.status(200).json({
    entries: payload.entries,
    total: payload.total,
    page,
    pageSize,
    hasMore: payload.hasMore,
  });
});

usersAdminRouter.post("/users/:id/role", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedParams = adminUserParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid user identifier",
      details: parsedParams.error.flatten(),
    });
    return;
  }

  const parsedBody = adminUserRoleUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid role update payload",
      details: parsedBody.error.flatten(),
    });
    return;
  }

  const targetUserId = parsedParams.data.id;
  if (targetUserId === authedReq.session.user.id) {
    res.status(409).json({
      error: "Self role mutation is not allowed",
    });
    return;
  }

  const targetRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  const target = targetRows[0];
  if (!target) {
    res.status(404).json({
      error: "User not found",
    });
    return;
  }

  if (target.role === parsedBody.data.role) {
    res.status(409).json({
      error: "User already has this role",
    });
    return;
  }

  const updatedRows = await db
    .update(users)
    .set({
      role: parsedBody.data.role,
      updatedAt: new Date(),
    })
    .where(eq(users.id, target.id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    });

  const updated = updatedRows[0];
  if (!updated) {
    res.status(404).json({
      error: "User not found",
    });
    return;
  }

  await persistAuditLog({
    scope: "users",
    action: parsedBody.data.role === "admin" ? "Promote user role" : "Demote user role",
    target: `${updated.name} <${updated.email}>`,
    status: "success",
    message: `Updated role to ${updated.role}`,
    actorId: authedReq.session.user.id,
    actorName: authedReq.session.user.name,
  });

  res.status(200).json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      createdAt: updated.createdAt.toISOString(),
    },
  });
});

usersAdminRouter.post("/users/:id/suspension", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedParams = adminUserParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid user identifier",
      details: parsedParams.error.flatten(),
    });
    return;
  }

  const parsedBody = adminUserSuspensionBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid suspension update payload",
      details: parsedBody.error.flatten(),
    });
    return;
  }

  const targetUserId = parsedParams.data.id;
  if (targetUserId === authedReq.session.user.id) {
    res.status(409).json({
      error: "Self suspension mutation is not allowed",
    });
    return;
  }

  const targetRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      suspendedAt: users.suspendedAt,
      suspendedReason: users.suspendedReason,
      suspendedBy: users.suspendedBy,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  const target = targetRows[0];
  if (!target) {
    res.status(404).json({
      error: "User not found",
    });
    return;
  }

  if (target.role !== "student") {
    res.status(409).json({
      error: "Only student users can be suspended or reactivated",
    });
    return;
  }

  const action = parsedBody.data.action;
  if (action === "suspend" && target.status === "suspended") {
    res.status(409).json({
      error: "User is already suspended",
    });
    return;
  }

  if (action === "reactivate" && target.status === "active") {
    res.status(409).json({
      error: "User is already active",
    });
    return;
  }

  const now = new Date();
  const updateSet =
    action === "suspend"
      ? {
          status: "suspended" as const,
          suspendedAt: now,
          suspendedReason: parsedBody.data.reason.trim(),
          suspendedBy: authedReq.session.user.id,
          updatedAt: now,
        }
      : {
          status: "active" as const,
          suspendedAt: null,
          suspendedReason: null,
          suspendedBy: null,
          updatedAt: now,
        };

  const updatedRows = await db
    .update(users)
    .set(updateSet)
    .where(eq(users.id, target.id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      suspendedAt: users.suspendedAt,
      suspendedReason: users.suspendedReason,
      suspendedBy: users.suspendedBy,
      createdAt: users.createdAt,
    });

  const updated = updatedRows[0];
  if (!updated) {
    res.status(404).json({
      error: "User not found",
    });
    return;
  }

  await persistAuditLog({
    scope: "users",
    action: action === "suspend" ? "Suspend user" : "Reactivate user",
    target: `${updated.name} <${updated.email}>`,
    status: "success",
    message:
      action === "suspend"
        ? `Suspended user: ${updated.suspendedReason ?? "No reason supplied."}`
        : "Reactivated user.",
    actorId: authedReq.session.user.id,
    actorName: authedReq.session.user.name,
  });

  res.status(200).json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      suspendedAt: updated.suspendedAt ? updated.suspendedAt.toISOString() : null,
      suspendedReason: updated.suspendedReason,
      suspendedBy: updated.suspendedBy,
      createdAt: updated.createdAt.toISOString(),
    },
  });
});
