import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { Router, type Response } from "express";
import { z } from "zod";

import { requireAdminRole } from "../../lib/admin.js";
import { db } from "../../lib/db/index.js";
import { adminAuditLogs } from "../../lib/db/schema.js";
import { requireSession, type AuthenticatedRequest } from "../../lib/session.js";
import { escapeLikePattern } from "../../lib/escape-like.js";
import {
  adminAuditScopeValues,
  adminAuditStatusValues,
  type AdminAuditScope,
  type AdminAuditStatus,
} from "./shared.js";

type ListAuditLogsInput = {
  scope?: AdminAuditScope;
  status?: AdminAuditStatus;
  q?: string;
  page: number;
  pageSize: number;
};

const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const aggregatedAuditLogQuerySchema = z.object({
  scope: z
    .enum(["all", ...adminAuditScopeValues])
    .optional()
    .default("all"),
  status: z
    .enum(["all", ...adminAuditStatusValues])
    .optional()
    .default("all"),
  q: z.string().trim().optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const listAuditLogs = async ({ scope, status, q, page, pageSize }: ListAuditLogsInput) => {
  const offset = (page - 1) * pageSize;
  const searchTerm = q?.trim() ?? "";
  const predicates: SQL[] = [];

  if (scope) {
    predicates.push(eq(adminAuditLogs.scope, scope));
  }
  if (status) {
    predicates.push(eq(adminAuditLogs.status, status));
  }
  if (searchTerm.length > 0) {
    const escaped = escapeLikePattern(searchTerm);
    const searchPredicate = or(
      ilike(adminAuditLogs.action, `%${escaped}%`),
      ilike(adminAuditLogs.target, `%${escaped}%`),
      ilike(adminAuditLogs.message, `%${escaped}%`),
      ilike(adminAuditLogs.actorName, `%${escaped}%`)
    );
    if (searchPredicate) {
      predicates.push(searchPredicate);
    }
  }
  const whereClause = predicates.length > 0 ? and(...predicates) : undefined;

  const rows = await db
    .select({
      id: adminAuditLogs.id,
      scope: adminAuditLogs.scope,
      action: adminAuditLogs.action,
      target: adminAuditLogs.target,
      status: adminAuditLogs.status,
      message: adminAuditLogs.message,
      actorId: adminAuditLogs.actorId,
      actorName: adminAuditLogs.actorName,
      createdAt: adminAuditLogs.createdAt,
    })
    .from(adminAuditLogs)
    .where(whereClause)
    .orderBy(desc(adminAuditLogs.createdAt), desc(adminAuditLogs.id))
    .offset(offset)
    .limit(pageSize);

  const totalRows = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(adminAuditLogs)
    .where(whereClause);

  const total = totalRows[0]?.count ?? 0;

  return {
    entries: rows.map((row) => ({
      id: row.id,
      scope: row.scope,
      action: row.action,
      target: row.target,
      status: row.status,
      message: row.message,
      actor: {
        id: row.actorId,
        name: row.actorName,
      },
      occurredAt: row.createdAt.toISOString(),
    })),
    total,
    hasMore: offset + rows.length < total,
  };
};

const handleAuditLogRead = async (
  req: AuthenticatedRequest,
  res: Response,
  scope: AdminAuditScope
) => {
  if (!(await requireAdminRole(req, res))) {
    return;
  }

  const parsedQuery = auditLogQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid audit log query parameters",
      details: parsedQuery.error.flatten(),
    });
    return;
  }

  const { page, pageSize } = parsedQuery.data;
  const payload = await listAuditLogs({ scope, page, pageSize });

  res.status(200).json({
    entries: payload.entries,
    total: payload.total,
    page,
    pageSize,
    hasMore: payload.hasMore,
  });
};

const handleAggregatedAuditLogRead = async (req: AuthenticatedRequest, res: Response) => {
  if (!(await requireAdminRole(req, res))) {
    return;
  }

  const parsedQuery = aggregatedAuditLogQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid aggregated audit log query parameters",
      details: parsedQuery.error.flatten(),
    });
    return;
  }

  const { scope, status, q, page, pageSize } = parsedQuery.data;
  const payload = await listAuditLogs({
    ...(scope !== "all" ? { scope } : {}),
    ...(status !== "all" ? { status } : {}),
    ...(q.length > 0 ? { q } : {}),
    page,
    pageSize,
  });

  res.status(200).json({
    entries: payload.entries,
    total: payload.total,
    page,
    pageSize,
    hasMore: payload.hasMore,
  });
};

export const auditLogsAdminRouter = Router();

auditLogsAdminRouter.get("/content/audit-logs", requireSession, async (req, res) => {
  await handleAuditLogRead(req as AuthenticatedRequest, res, "content");
});

auditLogsAdminRouter.get("/forum/audit-logs", requireSession, async (req, res) => {
  await handleAuditLogRead(req as AuthenticatedRequest, res, "forum");
});

auditLogsAdminRouter.get("/moderation/audit-logs", requireSession, async (req, res) => {
  await handleAuditLogRead(req as AuthenticatedRequest, res, "moderation");
});

auditLogsAdminRouter.get("/users/audit-logs", requireSession, async (req, res) => {
  await handleAuditLogRead(req as AuthenticatedRequest, res, "users");
});

auditLogsAdminRouter.get("/notifications/audit-logs", requireSession, async (req, res) => {
  await handleAuditLogRead(req as AuthenticatedRequest, res, "notifications");
});

auditLogsAdminRouter.get("/settings/audit-logs", requireSession, async (req, res) => {
  await handleAuditLogRead(req as AuthenticatedRequest, res, "settings");
});

auditLogsAdminRouter.get("/audit-logs", requireSession, async (req, res) => {
  await handleAggregatedAuditLogRead(req as AuthenticatedRequest, res);
});
