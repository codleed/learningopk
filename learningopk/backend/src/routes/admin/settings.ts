import { Router } from "express";
import { z } from "zod";
import { asc, eq, sql } from "drizzle-orm";
import { requireSession, type AuthenticatedRequest } from "../../lib/session.js";
import { requireAdminRole } from "../../lib/admin.js";
import { db } from "../../lib/db/index.js";
import { adminSettings, users } from "../../lib/db/schema.js";
import { persistAuditLog, type AdminAuditScope } from "./shared.js";

const adminSettingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20)
});

const adminSettingsParamsSchema = z.object({
  key: z.string().trim().min(1)
});

const adminSettingsUpdateBodySchema = z.object({
  value: z.string().trim().min(1).max(2000)
});

const updatableAdminSettingKeys = new Set([
  "forum_auto_lock_hours",
  "quiz_pass_threshold_percent",
  "maintenance_banner_enabled"
]);

const listAdminSettings = async ({
  page,
  pageSize
}: {
  page: number;
  pageSize: number;
}) => {
  const offset = (page - 1) * pageSize;
  const rows = await db
    .select({
      key: adminSettings.key,
      value: adminSettings.value,
      description: adminSettings.description,
      updatedAt: adminSettings.updatedAt,
      updatedById: adminSettings.updatedBy,
      updatedByName: users.name
    })
    .from(adminSettings)
    .leftJoin(users, eq(adminSettings.updatedBy, users.id))
    .orderBy(asc(adminSettings.key))
    .offset(offset)
    .limit(pageSize);

  const totalRows = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(adminSettings);
  const total = totalRows[0]?.count ?? 0;

  return {
    entries: rows.map((row) => ({
      key: row.key,
      value: row.value,
      description: row.description,
      updatedBy: row.updatedById
        ? {
            id: row.updatedById,
            name: row.updatedByName ?? "Unknown"
          }
        : null,
      updatedAt: row.updatedAt.toISOString()
    })),
    total,
    hasMore: offset + rows.length < total
  };
};

export const settingsAdminRouter = Router();

settingsAdminRouter.get("/settings", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = adminSettingsQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid settings query parameters",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const { page, pageSize } = parsedQuery.data;
  const payload = await listAdminSettings({ page, pageSize });

  res.status(200).json({
    entries: payload.entries,
    total: payload.total,
    page,
    pageSize,
    hasMore: payload.hasMore
  });
});

settingsAdminRouter.post("/settings/:key", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedParams = adminSettingsParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid setting key",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const parsedBody = adminSettingsUpdateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid setting update payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const key = parsedParams.data.key.trim();
  if (!updatableAdminSettingKeys.has(key)) {
    res.status(404).json({
      error: "Setting key not found"
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const now = new Date();
  const updatedRows = await db
    .update(adminSettings)
    .set({
      value: parsedBody.data.value.trim(),
      updatedBy: actorId,
      updatedAt: now
    })
    .where(eq(adminSettings.key, key))
    .returning({
      key: adminSettings.key,
      value: adminSettings.value,
      description: adminSettings.description,
      updatedBy: adminSettings.updatedBy,
      updatedAt: adminSettings.updatedAt
    });

  const updated = updatedRows[0];
  if (!updated) {
    res.status(404).json({
      error: "Setting key not found"
    });
    return;
  }

  await persistAuditLog({
    scope: "settings",
    action: "Update setting",
    target: key,
    status: "success",
    message: `Updated ${key} to ${updated.value}`,
    actorId,
    actorName
  });

  res.status(200).json({
    setting: {
      key: updated.key,
      value: updated.value,
      description: updated.description,
      updatedBy: {
        id: updated.updatedBy,
        name: actorName
      },
      updatedAt: updated.updatedAt.toISOString()
    }
  });
});
