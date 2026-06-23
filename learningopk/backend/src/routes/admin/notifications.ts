import { Router } from "express";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { requireSession, type AuthenticatedRequest } from "../../lib/session.js";
import { requireAdminRole } from "../../lib/admin.js";
import { db } from "../../lib/db/index.js";
import { adminNotifications, users } from "../../lib/db/schema.js";
import { persistAuditLog, type AdminAuditScope } from "./shared.js";

const adminNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20)
});

const adminNotificationCreateBodySchema = z.object({
  title: z.string().trim().min(5),
  message: z.string().trim().min(10),
  audience: z.enum(["all", "students", "admins"])
});

const listAdminNotifications = async ({
  page,
  pageSize
}: {
  page: number;
  pageSize: number;
}) => {
  const offset = (page - 1) * pageSize;
  const rows = await db
    .select({
      id: adminNotifications.id,
      title: adminNotifications.title,
      message: adminNotifications.message,
      audience: adminNotifications.audience,
      status: adminNotifications.status,
      createdById: adminNotifications.createdBy,
      createdByName: users.name,
      createdAt: adminNotifications.createdAt
    })
    .from(adminNotifications)
    .innerJoin(users, eq(adminNotifications.createdBy, users.id))
    .orderBy(desc(adminNotifications.createdAt), desc(adminNotifications.id))
    .offset(offset)
    .limit(pageSize);

  const totalRows = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(adminNotifications);
  const total = totalRows[0]?.count ?? 0;

  return {
    entries: rows.map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      audience: row.audience,
      status: row.status,
      createdBy: {
        id: row.createdById,
        name: row.createdByName
      },
      createdAt: row.createdAt.toISOString()
    })),
    total,
    hasMore: offset + rows.length < total
  };
};

export const notificationsAdminRouter = Router();

notificationsAdminRouter.get("/notifications", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedQuery = adminNotificationsQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Invalid notifications query parameters",
      details: parsedQuery.error.flatten()
    });
    return;
  }

  const { page, pageSize } = parsedQuery.data;
  const payload = await listAdminNotifications({ page, pageSize });

  res.status(200).json({
    entries: payload.entries,
    total: payload.total,
    page,
    pageSize,
    hasMore: payload.hasMore
  });
});

notificationsAdminRouter.post("/notifications", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = adminNotificationCreateBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid notification payload",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const actorId = authedReq.session.user.id;
  const actorName = authedReq.session.user.name;
  const createdRows = await db
    .insert(adminNotifications)
    .values({
      title: parsedBody.data.title.trim(),
      message: parsedBody.data.message.trim(),
      audience: parsedBody.data.audience,
      createdBy: actorId
    })
    .returning({
      id: adminNotifications.id,
      title: adminNotifications.title,
      message: adminNotifications.message,
      audience: adminNotifications.audience,
      status: adminNotifications.status,
      createdBy: adminNotifications.createdBy,
      createdAt: adminNotifications.createdAt
    });

  const created = createdRows[0];
  if (!created) {
    res.status(500).json({
      error: "Failed to create notification"
    });
    return;
  }

  await persistAuditLog({
    scope: "notifications",
    action: "Send notification broadcast",
    target: `audience:${created.audience}`,
    status: "success",
    message: `${created.title}: ${created.message}`,
    actorId,
    actorName
  });

  res.status(201).json({
    notification: {
      id: created.id,
      title: created.title,
      message: created.message,
      audience: created.audience,
      status: created.status,
      createdBy: {
        id: created.createdBy,
        name: actorName
      },
      createdAt: created.createdAt.toISOString()
    }
  });
});
