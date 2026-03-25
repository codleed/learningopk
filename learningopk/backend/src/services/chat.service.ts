import { and, asc, desc, eq, gt, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { buildChatAttachmentObjectKey, getFileExtensionFromMimeType, minioClient, uploadBuffer } from "../lib/minio.js";
import { env } from "../lib/env.js";
import { db } from "../lib/db/index.js";
import {
  attachments,
  blockedUsers,
  conversations,
  friendships,
  messages as messagesTable,
  notifications,
  users
} from "../lib/db/schema.js";
import { friendService } from "./friend.service.js";
import { privacyService } from "./privacy.service.js";
import {
  getMaxSizeForMimeType,
  isImageMimeType,
  isValidExtension,
  validateFile
} from "../lib/file-validation.js";

export interface MessageResult {
  id: string;
  senderId: string;
  content: string;
  attachment: {
    id: string;
    type: "image" | "file";
    url: string;
    fileName: string;
    fileSize: number;
  } | null;
  isRead: boolean;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface ConversationResult {
  id: string;
  participant: {
    id: string;
    name: string;
    image: string | null;
  };
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    createdAt: Date;
    isRead: boolean;
    hasAttachment: boolean;
  } | null;
  unreadCount: number;
}

export interface SendMessageInput {
  senderId: string;
  participantId: string;
  content: string;
  tempId: string;
  attachmentId?: string;
}

export class ChatService {
  async getConversations(
    userId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{
    chats: ConversationResult[];
    pagination: { page: number; limit: number; totalCount: number; totalPages: number };
  }> {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 50);
    const offset = (page - 1) * limit;

    const conversationRows = await db
      .select({
        id: conversations.id,
        participantOneId: conversations.participantOneId,
        participantTwoId: conversations.participantTwoId,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt
      })
      .from(conversations)
      .where(
        or(
          eq(conversations.participantOneId, userId),
          eq(conversations.participantTwoId, userId)
        )
      )
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversations)
      .where(
        or(
          eq(conversations.participantOneId, userId),
          eq(conversations.participantTwoId, userId)
        )
      );

    const totalCount = countResult[0]?.count ?? 0;

    if (conversationRows.length === 0) {
      return {
        chats: [],
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      };
    }

    const otherUserIds = conversationRows.map(conv => 
      conv.participantOneId === userId ? conv.participantTwoId : conv.participantOneId
    );

    const [blockedRows, userRows, lastMessageRows, unreadCountRows] = await Promise.all([
      db
        .select({
          blockerId: blockedUsers.blockerId,
          blockedId: blockedUsers.blockedId
        })
        .from(blockedUsers)
        .where(
          or(
            and(eq(blockedUsers.blockerId, userId), inArray(blockedUsers.blockedId, otherUserIds)),
            and(inArray(blockedUsers.blockerId, otherUserIds), eq(blockedUsers.blockedId, userId))
          )
        ),
      db
        .select({
          id: users.id,
          name: users.name,
          image: users.image
        })
        .from(users)
        .where(inArray(users.id, otherUserIds)),
      db
        .select({
          conversationId: messagesTable.conversationId,
          id: messagesTable.id,
          content: messagesTable.content,
          senderId: messagesTable.senderId,
          createdAt: messagesTable.createdAt,
          readAt: messagesTable.readAt,
          messageType: messagesTable.messageType,
          deletedAt: messagesTable.deletedAt
        })
        .from(messagesTable)
        .where(
          and(
            inArray(messagesTable.conversationId, conversationRows.map(c => c.id)),
            eq(messagesTable.deletedAt, null)
          )
        )
        .orderBy(desc(messagesTable.createdAt)),
      db
        .select({
          conversationId: messagesTable.conversationId,
          count: sql<number>`count(*)::int`
        })
        .from(messagesTable)
        .where(
          and(
            inArray(messagesTable.conversationId, conversationRows.map(c => c.id)),
            inArray(messagesTable.senderId, otherUserIds),
            eq(messagesTable.deletedAt, null),
            sql`${messagesTable.readAt} IS NULL`
          )
        )
        .groupBy(messagesTable.conversationId)
    ]);

    const blockedUserIds = new Set(
      blockedRows.flatMap(r => [r.blockerId, r.blockedId])
    );

    const userMap = new Map(userRows.map(u => [u.id, u]));

    const lastMessageMap = new Map<string, typeof lastMessageRows[0]>();
    for (const msg of lastMessageRows) {
      if (!lastMessageMap.has(msg.conversationId)) {
        lastMessageMap.set(msg.conversationId, msg);
      }
    }

    const unreadCountMap = new Map(
      unreadCountRows.map(r => [r.conversationId, r.count])
    );

    const chats: ConversationResult[] = [];

    for (const conv of conversationRows) {
      const otherUserId = conv.participantOneId === userId ? conv.participantTwoId : conv.participantOneId;

      if (blockedUserIds.has(otherUserId)) {
        continue;
      }

      const otherUser = userMap.get(otherUserId);
      if (!otherUser) continue;

      const lastMessage = lastMessageMap.get(conv.id);

      chats.push({
        id: conv.id,
        participant: {
          id: otherUser.id,
          name: otherUser.name,
          image: otherUser.image
        },
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.messageType === "text" ? lastMessage.content : "[Attachment]",
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
              isRead: lastMessage.readAt !== null,
              hasAttachment: lastMessage.messageType !== "text"
            }
          : null,
        unreadCount: unreadCountMap.get(conv.id) ?? 0
      });
    }

    return {
      chats,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  async getMessages(
    userId: string,
    participantId: string,
    options: { before?: string; limit?: number } = {}
  ): Promise<{
    messages: MessageResult[];
    pagination: { hasMore: boolean; nextCursor: string | null };
  }> {
    const areFriends = await friendService.areFriends(userId, participantId);
    if (!areFriends) {
      throw new Error("Not friends with this user");
    }

    const blockedCheck = await db
      .select({ id: blockedUsers.id })
      .from(blockedUsers)
      .where(
        or(
          and(eq(blockedUsers.blockerId, userId), eq(blockedUsers.blockedId, participantId)),
          and(eq(blockedUsers.blockerId, participantId), eq(blockedUsers.blockedId, userId))
        )
      )
      .limit(1);

    if (blockedCheck.length > 0) {
      throw new Error("Not friends with this user");
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

    const conversation = conversationRows[0];
    if (!conversation) {
      return { messages: [], pagination: { hasMore: false, nextCursor: null } };
    }

    const limit = Math.min(options.limit ?? 50, 100);

    let whereClause: SQL = and(
      eq(messagesTable.conversationId, conversation.id),
      eq(messagesTable.deletedAt, null)
    );

    if (options.before) {
      const beforeMessageRows = await db
        .select({ createdAt: messagesTable.createdAt })
        .from(messagesTable)
        .where(eq(messagesTable.id, options.before))
        .limit(1);

      if (beforeMessageRows.length > 0) {
        whereClause = and(
          eq(messagesTable.conversationId, conversation.id),
          eq(messagesTable.deletedAt, null),
          gt(messagesTable.createdAt, beforeMessageRows[0].createdAt)
        );
      }
    }

    const messageRows = await db
      .select({
        id: messagesTable.id,
        senderId: messagesTable.senderId,
        content: messagesTable.content,
        messageType: messagesTable.messageType,
        mediaUrl: messagesTable.mediaUrl,
        mediaMimeType: messagesTable.mediaMimeType,
        fileSize: messagesTable.fileSize,
        readAt: messagesTable.readAt,
        deletedAt: messagesTable.deletedAt,
        createdAt: messagesTable.createdAt
      })
      .from(messagesTable)
      .where(whereClause)
      .orderBy(asc(messagesTable.createdAt))
      .limit(limit + 1);

    const hasMore = messageRows.length > limit;
    const fetchedMessages = hasMore ? messageRows.slice(0, limit) : messageRows;

    const mappedMessages: MessageResult[] = fetchedMessages.map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      content: msg.content,
      attachment:
        msg.mediaUrl
          ? {
              id: msg.id,
              type: msg.messageType === "image" ? "image" : "file",
              url: msg.mediaUrl,
              fileName: msg.mediaMimeType?.split("/")[1] ?? "file",
              fileSize: msg.fileSize ?? 0
            }
          : null,
      isRead: msg.readAt !== null,
      createdAt: msg.createdAt,
      deletedAt: msg.deletedAt
    }));

    return {
      messages: mappedMessages,
      pagination: {
        hasMore,
        nextCursor: hasMore && fetchedMessages.length > 0 ? fetchedMessages[fetchedMessages.length - 1].id : null
      }
    };
  }

  async sendMessage(input: SendMessageInput): Promise<MessageResult> {
    const { senderId, participantId, content, tempId, attachmentId } = input;

    const areFriends = await friendService.areFriends(senderId, participantId);
    if (!areFriends) {
      throw new Error("Not friends with this user");
    }

    const blockedByMe = await db
      .select({ id: blockedUsers.id })
      .from(blockedUsers)
      .where(and(eq(blockedUsers.blockerId, senderId), eq(blockedUsers.blockedId, participantId)))
      .limit(1);

    if (blockedByMe.length > 0) {
      throw new Error("Cannot send message to this user");
    }

    const blockedMe = await db
      .select({ id: blockedUsers.id })
      .from(blockedUsers)
      .where(and(eq(blockedUsers.blockedId, senderId), eq(blockedUsers.blockerId, participantId)))
      .limit(1);

    if (blockedMe.length > 0) {
      throw new Error("Cannot send message to this user");
    }

    const receiverPrivacy = await privacyService.getPrivacySettings(participantId);
    if (receiverPrivacy.chat.whoCanMessageMe === "nobody") {
      throw new Error("This user is not accepting messages");
    }
    if (receiverPrivacy.chat.whoCanMessageMe === "friends_only" && !areFriends) {
      throw new Error("This user only accepts messages from friends");
    }

    let conversationRows = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        or(
          and(eq(conversations.participantOneId, senderId), eq(conversations.participantTwoId, participantId)),
          and(eq(conversations.participantTwoId, senderId), eq(conversations.participantOneId, participantId))
        )
      )
      .limit(1);

    let conversationId: string;

    if (conversationRows.length === 0) {
      const insertedRows = await db
        .insert(conversations)
        .values({
          participantOneId: senderId,
          participantTwoId: participantId
        })
        .returning({ id: conversations.id });

      conversationId = insertedRows[0].id;
    } else {
      conversationId = conversationRows[0].id;
    }

    let attachmentData: { mediaUrl: string; mediaMimeType: string; fileSize: number } | null = null;
    let messageType: "text" | "image" | "file" = "text";

    if (attachmentId) {
      const attachmentRows = await db
        .select({
          mediaUrl: attachments.mediaUrl,
          mediaMimeType: attachments.mediaMimeType,
          fileSize: attachments.fileSize,
          fileName: attachments.fileName
        })
        .from(attachments)
        .where(eq(attachments.id, attachmentId))
        .limit(1);

      if (attachmentRows.length > 0) {
        const att = attachmentRows[0]!;
        attachmentData = {
          mediaUrl: att.mediaUrl,
          mediaMimeType: att.mediaMimeType,
          fileSize: att.fileSize
        };
        messageType = isImageMimeType(att.mediaMimeType) ? "image" : "file";
      }
    }

    const insertedRows = await db
      .insert(messagesTable)
      .values({
        conversationId,
        senderId,
        content,
        messageType,
        ...(attachmentData && {
          mediaUrl: attachmentData.mediaUrl,
          mediaMimeType: attachmentData.mediaMimeType,
          fileSize: attachmentData.fileSize
        })
      })
      .returning({
        id: messagesTable.id,
        senderId: messagesTable.senderId,
        content: messagesTable.content,
        messageType: messagesTable.messageType,
        mediaUrl: messagesTable.mediaUrl,
        mediaMimeType: messagesTable.mediaMimeType,
        fileSize: messagesTable.fileSize,
        readAt: messagesTable.readAt,
        deletedAt: messagesTable.deletedAt,
        createdAt: messagesTable.createdAt
      });

    const inserted = insertedRows[0];
    if (!inserted) {
      throw new Error("Unable to send message");
    }

    if (attachmentId) {
      await this.linkAttachmentToMessage(attachmentId, inserted.id);
    }

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    const participantRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, participantId))
      .limit(1);

    if (participantRows.length > 0) {
      await db.insert(notifications).values({
        userId: participantId,
        type: "message",
        referenceId: inserted.id
      });
    }

    return {
      id: inserted.id,
      senderId: inserted.senderId,
      content: inserted.content,
      attachment: inserted.mediaUrl
        ? {
            id: attachmentId ?? inserted.id,
            type: inserted.messageType as "image" | "file",
            url: inserted.mediaUrl,
            fileName: inserted.mediaMimeType?.split("/")[1] ?? "file",
            fileSize: inserted.fileSize ?? 0
          }
        : null,
      isRead: false,
      createdAt: inserted.createdAt,
      deletedAt: inserted.deletedAt
    };
  }

  async markMessagesAsRead(userId: string, participantId: string, lastReadMessageId?: string): Promise<{ success: boolean }> {
    const areFriends = await friendService.areFriends(userId, participantId);
    if (!areFriends) {
      throw new Error("Not friends with this user");
    }

    const blockedCheck = await db
      .select({ id: blockedUsers.id })
      .from(blockedUsers)
      .where(
        or(
          and(eq(blockedUsers.blockerId, userId), eq(blockedUsers.blockedId, participantId)),
          and(eq(blockedUsers.blockerId, participantId), eq(blockedUsers.blockedId, userId))
        )
      )
      .limit(1);

    if (blockedCheck.length > 0) {
      return { success: true };
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
      return { success: true };
    }

    const conversationId = conversationRows[0].id;

    await db
      .update(messagesTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messagesTable.conversationId, conversationId),
          eq(messagesTable.senderId, participantId),
          sql`${messagesTable.readAt} IS NULL`
        )
      );

    return { success: true };
  }

  async deleteConversation(userId: string, participantId: string): Promise<{ success: boolean }> {
    const areFriends = await friendService.areFriends(userId, participantId);
    if (!areFriends) {
      throw new Error("Not friends with this user");
    }

    const blockedCheck = await db
      .select({ id: blockedUsers.id })
      .from(blockedUsers)
      .where(
        or(
          and(eq(blockedUsers.blockerId, userId), eq(blockedUsers.blockedId, participantId)),
          and(eq(blockedUsers.blockerId, participantId), eq(blockedUsers.blockedId, userId))
        )
      )
      .limit(1);

    if (blockedCheck.length > 0) {
      throw new Error("Not friends with this user");
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
      throw new Error("Conversation not found");
    }

    await db.delete(messagesTable).where(eq(messagesTable.conversationId, conversationRows[0].id));
    await db.delete(conversations).where(eq(conversations.id, conversationRows[0].id));

    return { success: true };
  }

  async deleteMessage(userId: string, messageId: string): Promise<{ success: boolean; deletedAt: Date }> {
    const messageRows = await db
      .select({
        id: messagesTable.id,
        senderId: messagesTable.senderId,
        conversationId: messagesTable.conversationId
      })
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .limit(1);

    if (messageRows.length === 0) {
      throw new Error("Message not found");
    }

    const message = messageRows[0];

    if (message.senderId !== userId) {
      throw new Error("Message not found or not owned by user");
    }

    const deletedAt = new Date();

    await db
      .update(messagesTable)
      .set({ deletedAt, content: "[Message deleted]" })
      .where(eq(messagesTable.id, messageId));

    const conversationRows = await db
      .select({ participantOneId: conversations.participantOneId, participantTwoId: conversations.participantTwoId })
      .from(conversations)
      .where(eq(conversations.id, message.conversationId))
      .limit(1);

    if (conversationRows.length > 0) {
      const otherParticipantId =
        conversationRows[0].participantOneId === userId
          ? conversationRows[0].participantTwoId
          : conversationRows[0].participantOneId;

      await db.insert(notifications).values({
        userId: otherParticipantId,
        type: "message_deleted",
        referenceId: messageId
      });
    }

    return { success: true, deletedAt };
  }

  async uploadAttachment(
    userId: string,
    participantId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
    fileSize: number
  ): Promise<{
    id: string;
    type: "image" | "file";
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    thumbnailUrl: string | null;
  }> {
    const areFriends = await friendService.areFriends(userId, participantId);
    if (!areFriends) {
      throw new Error("Not friends with this user");
    }

    const blockedCheck = await db
      .select({ id: blockedUsers.id })
      .from(blockedUsers)
      .where(
        or(
          and(eq(blockedUsers.blockerId, userId), eq(blockedUsers.blockedId, participantId)),
          and(eq(blockedUsers.blockerId, participantId), eq(blockedUsers.blockedId, userId))
        )
      )
      .limit(1);

    if (blockedCheck.length > 0) {
      throw new Error("Not friends with this user");
    }

    if (!isValidExtension(fileName, mimeType)) {
      throw new Error("File extension does not match MIME type");
    }

    const validation = validateFile({
      buffer: file,
      declaredMimeType: mimeType,
      fileSize
    });

    if (!validation.isValid) {
      throw new Error(validation.errorMessage ?? "Invalid file");
    }

    const maxSize = getMaxSizeForMimeType(mimeType);
    if (fileSize > maxSize) {
      throw new Error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
    }

    const attachmentId = randomUUID();
    const ext = getFileExtensionFromMimeType(mimeType) ?? "bin";
    const objectKey = buildChatAttachmentObjectKey({
      conversationId: participantId,
      attachmentId,
      fileExtension: ext
    });

    await uploadBuffer({
      objectKey,
      buffer: file,
      mimeType: mimeType as import("../lib/minio.js").SupportedAttachmentMimeType
    });

    const objectUrl = `${env.MINIO_PUBLIC_URL}/${env.MINIO_BUCKET}/${objectKey}`;
    const isImage = isImageMimeType(mimeType);

    const placeholderMessageId = "00000000-0000-0000-0000-000000000000";
    await db.insert(attachments).values({
      id: attachmentId,
      messageId: placeholderMessageId,
      objectKey,
      mediaUrl: objectUrl,
      mediaMimeType: mimeType,
      fileName,
      fileSize,
      thumbnailObjectKey: isImage ? objectKey : null,
      thumbnailUrl: isImage ? objectUrl : null
    });

    return {
      id: attachmentId,
      type: isImage ? "image" : "file",
      url: objectUrl,
      fileName,
      fileSize,
      mimeType,
      thumbnailUrl: isImage ? objectUrl : null
    };
  }

  async linkAttachmentToMessage(attachmentId: string, messageId: string): Promise<void> {
    await db
      .update(attachments)
      .set({ messageId })
      .where(eq(attachments.id, attachmentId));
  }

  async getOrCreateConversation(userId: string, participantId: string): Promise<string> {
    const areFriends = await friendService.areFriends(userId, participantId);
    if (!areFriends) {
      throw new Error("Not friends with this user");
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

    if (conversationRows.length > 0) {
      return conversationRows[0].id;
    }

    const insertedRows = await db
      .insert(conversations)
      .values({
        participantOneId: userId,
        participantTwoId: participantId
      })
      .returning({ id: conversations.id });

    return insertedRows[0].id;
  }
}

export const chatService = new ChatService();
