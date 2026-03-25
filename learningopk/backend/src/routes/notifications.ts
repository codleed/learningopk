import { Router } from "express";
import { z } from "zod";

import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { notificationService } from "../services/notification.service.js";

const getNotificationsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  types: z.string().optional()
});

export const notificationRouter = Router();

notificationRouter.get("/", requireSession, async (req, res) => {
  try {
    const parsed = getNotificationsSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const authedReq = req as AuthenticatedRequest;
    const types = parsed.data.types ? parsed.data.types.split(",") : undefined;

    const result = await notificationService.getNotifications(authedReq.session.user.id, {
      page: parsed.data.page,
      limit: parsed.data.limit,
      types
    });

    res.json({
      notifications: result.notifications,
      pagination: result.pagination,
      unreadCount: result.unreadCount
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

notificationRouter.post("/:notificationId/read", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const result = await notificationService.markAsRead(authedReq.session.user.id, req.params.notificationId as string);

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    
    if (message === "Notification not found") {
      res.status(404).json({ error: message });
      return;
    }

    console.error("Mark notification as read error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

notificationRouter.post("/read-all", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const result = await notificationService.markAllAsRead(authedReq.session.user.id);

    res.json({
      success: result.success,
      markedCount: result.markedCount
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
