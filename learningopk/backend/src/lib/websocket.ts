import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { fromNodeHeaders } from "better-auth/node";

import { auth } from "./auth.js";
import { redis } from "./redis.js";
import { db } from "./db/index.js";
import {
  blockedUsers,
  conversations,
  friendRequests,
  friendships,
  messages,
  notifications,
  users
} from "./db/schema.js";
import { eq, and, or } from "drizzle-orm";
import { sanitizeMessageContent } from "./sanitize.js";

interface AuthenticatedSocket {
  userId: string;
  socket: any;
}

const onlineUsers = new Map<string, Set<string>>();

export const setupWebSocket = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    path: "/ws",
    cors: {
      origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
      credentials: true
    }
  });

  io.use(async (socket: any, next: (err?: Error) => void) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(socket.handshake.headers)
      });

      if (!session) {
        return next(new Error("Authentication required"));
      }

      const userRows = await db
        .select({ status: users.status })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      if (!userRows[0] || userRows[0].status === "suspended") {
        return next(new Error("Account suspended"));
      }

      socket.userId = session.user.id;
      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", async (socket: any) => {
    const userId = socket.userId;
    console.log(`User ${userId} connected via WebSocket`);

    await db
      .update(users)
      .set({ isOnline: true, lastSeen: new Date() })
      .where(eq(users.id, userId));

    socket.join(`user:${userId}`);

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    io.emit("presence:status_change", {
      userId,
      isOnline: true,
      lastActiveAt: new Date().toISOString()
    });

    const friendIds = await getFriendIds(userId);
    for (const friendId of friendIds) {
      socket.join(`chat:${friendId}`);
    }

    socket.on("chat:send_message", async (data: any) => {
      try {
        const { participantId, content, tempId, attachmentId } = data;

        const rateLimitKey = `ws_rate:${userId}:${participantId}`;
        const currentCount = await redis.incr(rateLimitKey);
        
        if (currentCount === 1) {
          await redis.expire(rateLimitKey, 60);
        }
        
        if (currentCount > 60) {
          socket.emit("error", {
            code: "RATE_LIMITED",
            message: "Too many messages. Please slow down."
          });
          return;
        }

        const areFriends = await checkFriendship(userId, participantId);
        if (!areFriends) {
          socket.emit("error", {
            code: "NOT_FRIENDS",
            message: "Users are not friends"
          });
          return;
        }

        const [blockedByMe, blockedMe] = await Promise.all([
          checkBlock(userId, participantId),
          checkBlock(participantId, userId)
        ]);

        if (blockedByMe || blockedMe) {
          socket.emit("error", {
            code: "BLOCKED",
            message: "Block relationship prevents action"
          });
          return;
        }

        const sanitizedContent = sanitizeMessageContent(content ?? "");

        let conversationId = await getOrCreateConversation(userId, participantId);

        const insertedRows = await db
          .insert(messages)
          .values({
            conversationId,
            senderId: userId,
            content: sanitizedContent.sanitized,
            messageType: attachmentId ? "image" : "text"
          })
          .returning({
            id: messages.id,
            senderId: messages.senderId,
            content: messages.content,
            messageType: messages.messageType,
            mediaUrl: messages.mediaUrl,
            createdAt: messages.createdAt
          });

        const message = insertedRows[0];
        if (!message) {
          socket.emit("error", {
            code: "SERVER_ERROR",
            message: "Unable to send message"
          });
          return;
        }

        socket.emit("chat:message_sent", {
          tempId,
          message: {
            id: message.id,
            senderId: message.senderId,
            content: message.content,
            attachment: null,
            isRead: false,
            createdAt: message.createdAt
          }
        });

        socket.to(`user:${participantId}`).emit("chat:new_message", {
          id: message.id,
          tempId,
          senderId: userId,
          participantId,
          content: message.content,
          attachment: null,
          isRead: false,
          createdAt: message.createdAt
        });

        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, conversationId));
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", {
          code: "SERVER_ERROR",
          message: "Failed to send message"
        });
      }
    });

    socket.on("chat:mark_read", async (data: { participantId: string; lastReadMessageId: string }) => {
      try {
        const { participantId, lastReadMessageId } = data;

        const areFriends = await checkFriendship(userId, participantId);
        if (!areFriends) {
          return;
        }

        const conversationRows = await db
          .select({ id: conversations.id })
          .from(conversations)
          .where(
            or(
              and(eq(conversations.participantOneId, userId), eq(conversations.participantTwoId, participantId)),
              and(eq(conversations.participantTwoId, userId), eq(conversations.participantOneId, participantId))
            )
          )
          .limit(1);

        if (conversationRows.length === 0) {
          return;
        }

        await db
          .update(messages)
          .set({ readAt: new Date() })
          .where(
            and(
              eq(messages.conversationId, conversationRows[0].id),
              eq(messages.senderId, participantId)
            )
          );

        socket.to(`user:${participantId}`).emit("chat:message_read", {
          chatId: conversationRows[0].id,
          participantId: userId,
          lastReadMessageId,
          readAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("Mark read error:", error);
      }
    });

    socket.on("chat:typing_start", async (data: { participantId: string }) => {
      try {
        const { participantId } = data;
        const areFriends = await checkFriendship(userId, participantId);
        if (!areFriends) return;

        socket.to(`user:${participantId}`).emit("chat:user_typing", {
          participantId: userId,
          isTyping: true
        });
      } catch (error) {
        console.error("Typing start error:", error);
      }
    });

    socket.on("chat:typing_stop", async (data: { participantId: string }) => {
      try {
        const { participantId } = data;
        const areFriends = await checkFriendship(userId, participantId);
        if (!areFriends) return;

        socket.to(`user:${participantId}`).emit("chat:user_typing", {
          participantId: userId,
          isTyping: false
        });
      } catch (error) {
        console.error("Typing stop error:", error);
      }
    });

    socket.on("chat:delete_message", async (data: { participantId: string; messageId: string }) => {
      try {
        const { participantId, messageId } = data;

        const areFriends = await checkFriendship(userId, participantId);
        if (!areFriends) {
          socket.emit("error", {
            code: "NOT_FRIENDS",
            message: "Users are not friends"
          });
          return;
        }

        const messageRows = await db
          .select({ id: messages.id, senderId: messages.senderId })
          .from(messages)
          .where(eq(messages.id, messageId))
          .limit(1);

        if (messageRows.length === 0 || messageRows[0].senderId !== userId) {
          socket.emit("error", {
            code: "NOT_FOUND",
            message: "Message not found or not owned by user"
          });
          return;
        }

        const deletedAt = new Date();
        await db
          .update(messages)
          .set({ deletedAt, content: "[Message deleted]" })
          .where(eq(messages.id, messageId));

        socket.emit("chat:message_deleted", {
          messageId,
          deletedAt: deletedAt.toISOString()
        });

        socket.to(`user:${participantId}`).emit("chat:message_deleted", {
          messageId,
          deletedAt: deletedAt.toISOString()
        });
      } catch (error) {
        console.error("Delete message error:", error);
        socket.emit("error", {
          code: "SERVER_ERROR",
          message: "Failed to delete message"
        });
      }
    });

    socket.on("presence:subscribe", async (data: { userIds: string[] }) => {
      try {
        const { userIds } = data;

        for (const targetUserId of userIds) {
          const isOnline = onlineUsers.has(targetUserId);
          const userRows = await db
            .select({ lastSeen: users.lastSeen })
            .from(users)
            .where(eq(users.id, targetUserId))
            .limit(1);

          socket.emit("presence:status_change", {
            userId: targetUserId,
            isOnline,
            lastActiveAt: userRows[0]?.lastSeen?.toISOString() ?? null
          });
        }
      } catch (error) {
        console.error("Presence subscribe error:", error);
      }
    });

    socket.on("disconnect", async () => {
      console.log(`User ${userId} disconnected from WebSocket`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);

          await db
            .update(users)
            .set({ isOnline: false, lastSeen: new Date() })
            .where(eq(users.id, userId));

          io.emit("presence:status_change", {
            userId,
            isOnline: false,
            lastActiveAt: new Date().toISOString()
          });
        }
      }
    });
  });

  return io;
};

async function getFriendIds(userId: string): Promise<string[]> {
  const friendRows = await db
    .select({
      friendId: friendships.friendId
    })
    .from(friendships)
    .where(eq(friendships.userId, userId));

  const friendIdRows = await db
    .select({
      userId: friendships.userId
    })
    .from(friendships)
    .where(eq(friendships.friendId, userId));

  const friendIds = [
    ...friendRows.map((r) => r.friendId),
    ...friendIdRows.map((r) => r.userId)
  ];

  return friendIds;
}

async function checkFriendship(userId1: string, userId2: string): Promise<boolean> {
  const rows = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(
      or(
        and(eq(friendships.userId, userId1), eq(friendships.friendId, userId2)),
        and(eq(friendships.friendId, userId1), eq(friendships.userId, userId2))
      )
    )
    .limit(1);

  return rows.length > 0;
}

async function checkBlock(blockerId: string, blockedId: string): Promise<boolean> {
  const rows = await db
    .select({ id: blockedUsers.id })
    .from(blockedUsers)
    .where(and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedId, blockedId)))
    .limit(1);

  return rows.length > 0;
}

async function getOrCreateConversation(userId1: string, userId2: string): Promise<string> {
  const existingRows = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      or(
        and(eq(conversations.participantOneId, userId1), eq(conversations.participantTwoId, userId2)),
        and(eq(conversations.participantTwoId, userId1), eq(conversations.participantOneId, userId2))
      )
    )
    .limit(1);

  if (existingRows.length > 0) {
    return existingRows[0].id;
  }

  const insertedRows = await db
    .insert(conversations)
    .values({
      participantOneId: userId1,
      participantTwoId: userId2
    })
    .returning({ id: conversations.id });

  return insertedRows[0].id;
}

export const emitFriendRequest = async (io: any, receiverId: string, requestData: any) => {
  io.to(`user:${receiverId}`).emit("friend:request_received", requestData);
};

export const emitFriendAccepted = async (io: any, senderId: string, data: any) => {
  io.to(`user:${senderId}`).emit("friend:request_accepted", data);
};

export const emitFriendDeclined = async (io: any, senderId: string, data: any) => {
  io.to(`user:${senderId}`).emit("friend:request_declined", data);
};

export const emitFriendRemoved = async (io: any, friendId: string, data: any) => {
  io.to(`user:${friendId}`).emit("friend:removed", data);
};
