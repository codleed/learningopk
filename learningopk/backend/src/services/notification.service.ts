import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { notifications, users } from "../lib/db/schema.js";

export interface NotificationResult {
  id: string;
  type: "friend_request" | "friend_accepted" | "friend_declined" | "friend_removed" | "message" | "message_deleted";
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

export class NotificationService {
  async getNotifications(
    userId: string,
    options: { page?: number; limit?: number; types?: string[] } = {}
  ): Promise<{
    notifications: NotificationResult[];
    pagination: { page: number; limit: number; totalCount: number; totalPages: number };
    unreadCount: number;
  }> {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 50);
    const offset = (page - 1) * limit;

    const conditions = [eq(notifications.userId, userId)];

    if (options.types && options.types.length > 0) {
      conditions.push(inArray(notifications.type, options.types as any[]));
    }

    const notificationRows = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        referenceId: notifications.referenceId,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt
      })
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(eq(notifications.userId, userId));

    const unreadResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    const notifications: NotificationResult[] = [];

    for (const row of notificationRows) {
      const { title, body, data } = await this.formatNotification(row.type, row.referenceId, userId);
      notifications.push({
        id: row.id,
        type: row.type,
        title,
        body,
        data: data ?? {},
        isRead: row.isRead,
        createdAt: row.createdAt
      });
    }

    return {
      notifications,
      pagination: {
        page,
        limit,
        totalCount: countResult[0]?.count ?? 0,
        totalPages: Math.ceil((countResult[0]?.count ?? 0) / limit)
      },
      unreadCount: unreadResult[0]?.count ?? 0
    };
  }

  async markAsRead(userId: string, notificationId: string): Promise<{ success: boolean }> {
    const notificationRows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .limit(1);

    if (notificationRows.length === 0) {
      throw new Error("Notification not found");
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));

    return { success: true };
  }

  async markAllAsRead(userId: string): Promise<{ success: boolean; markedCount: number }> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .returning({ id: notifications.id });

    return { success: true, markedCount: result.length };
  }

  private async formatNotification(
    type: string,
    referenceId: string | null,
    userId: string
  ): Promise<{ title: string; body: string; data: Record<string, unknown> }> {
    switch (type) {
      case "friend_request": {
        const requestRows = await db
          .select({
            id: notifications.id,
            senderId: referenceId
          })
          .from(notifications)
          .where(eq(notifications.id, referenceId ?? ""))
          .limit(1);

        if (referenceId) {
          const friendRequestRows = await db
            .select({
              senderId: notifications.referenceId
            })
            .from(notifications)
            .where(eq(notifications.id, referenceId))
            .limit(1);

          if (friendRequestRows.length > 0) {
            const senderId = friendRequestRows[0].senderId;
            const senderRows = await db
              .select({ name: users.name })
              .from(users)
              .where(eq(users.id, senderId ?? ""))
              .limit(1);

            if (senderRows.length > 0) {
              return {
                title: "New friend request",
                body: `${senderRows[0].name} wants to be friends`,
                data: { requestId: referenceId, userId: senderId }
              };
            }
          }
        }

        return {
          title: "New friend request",
          body: "Someone wants to be friends",
          data: { requestId: referenceId }
        };
      }

      case "friend_accepted": {
        return {
          title: "Friend request accepted",
          body: "Your friend request was accepted",
          data: { userId: referenceId }
        };
      }

      case "friend_declined": {
        return {
          title: "Friend request declined",
          body: "Your friend request was declined",
          data: { userId: referenceId }
        };
      }

      case "friend_removed": {
        return {
          title: "Friend removed",
          body: "A friend was removed",
          data: { userId: referenceId }
        };
      }

      case "message": {
        return {
          title: "New message",
          body: "You have a new message",
          data: { messageId: referenceId, chatId: null, participantId: null }
        };
      }

      case "message_deleted": {
        return {
          title: "Message deleted",
          body: "A message was deleted",
          data: { messageId: referenceId }
        };
      }

      default:
        return {
          title: "Notification",
          body: "You have a new notification",
          data: {}
        };
    }
  }

  async createNotification(
    userId: string,
    type: "friend_request" | "friend_accepted" | "friend_declined" | "friend_removed" | "message" | "message_deleted",
    referenceId: string | null = null
  ): Promise<void> {
    await db.insert(notifications).values({
      userId,
      type,
      referenceId
    });
  }
}

export const notificationService = new NotificationService();
