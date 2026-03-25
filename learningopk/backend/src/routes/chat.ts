import { Router } from "express";
import { z } from "zod";

import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { chatService } from "../services/chat.service.js";
import { createChatAttachmentUploadMiddleware, MAX_DOCUMENT_SIZE } from "../middleware/chat-upload.js";
import { messageRateLimiter, messageBurstRateLimiter } from "../lib/rate-limit.js";
import { sanitizeMessageContent } from "../lib/sanitize.js";

const getConversationsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20)
});

const getMessagesSchema = z.object({
  before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50)
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  tempId: z.string().min(1)
});

const markReadSchema = z.object({
  lastReadMessageId: z.string().optional()
});

export const chatRouter = Router();

chatRouter.get("/", requireSession, async (req, res) => {
  try {
    const parsed = getConversationsSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const authedReq = req as AuthenticatedRequest;
    const result = await chatService.getConversations(authedReq.session.user.id, {
      page: parsed.data.page,
      limit: parsed.data.limit
    });

    res.json({
      chats: result.chats,
      pagination: result.pagination
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

chatRouter.get("/:participantId/messages", requireSession, async (req, res) => {
  try {
    const parsed = getMessagesSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const authedReq = req as AuthenticatedRequest;
    const result = await chatService.getMessages(authedReq.session.user.id, req.params.participantId as string, {
      before: parsed.data.before,
      limit: parsed.data.limit
    });

    res.json({
      messages: result.messages,
      pagination: result.pagination
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    
    if (message === "Not friends with this user") {
      res.status(400).json({ error: message });
      return;
    }

    console.error("Get messages error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

chatRouter.post("/:participantId/messages", 
  requireSession, 
  messageRateLimiter.middleware("send_message"),
  messageBurstRateLimiter.middleware("send_message_burst"),
  async (req, res) => {
  try {
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const sanitizedContent = sanitizeMessageContent(parsed.data.content);
    if (sanitizedContent.hadDangerousContent) {
      console.warn(`User ${(req as AuthenticatedRequest).session.user.id} attempted to send potentially malicious content`);
    }

    const authedReq = req as AuthenticatedRequest;
    const result = await chatService.sendMessage({
      senderId: authedReq.session.user.id,
      participantId: req.params.participantId as string,
      content: sanitizedContent.sanitized,
      tempId: parsed.data.tempId
    });

    res.status(201).json({
      id: result.id,
      senderId: result.senderId,
      content: result.content,
      attachment: result.attachment,
      isRead: result.isRead,
      createdAt: result.createdAt,
      tempId: parsed.data.tempId
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    
    if (message === "Not friends with this user") {
      res.status(400).json({ error: message });
      return;
    }
    if (message === "Message content required" || message === "Message too long") {
      res.status(400).json({ error: message });
      return;
    }

    console.error("Send message error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

chatRouter.post("/:participantId/read", requireSession, async (req, res) => {
  try {
    const parsed = markReadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const authedReq = req as AuthenticatedRequest;
    const result = await chatService.markMessagesAsRead(
      authedReq.session.user.id,
      req.params.participantId as string,
      parsed.data.lastReadMessageId
    );

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    
    if (message === "Not friends with this user") {
      res.status(400).json({ error: message });
      return;
    }

    console.error("Mark messages read error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

chatRouter.delete("/:participantId", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const result = await chatService.deleteConversation(authedReq.session.user.id, req.params.participantId as string);

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    
    if (message === "Not friends with this user") {
      res.status(403).json({ error: message });
      return;
    }

    if (message === "Conversation not found") {
      res.status(404).json({ error: message });
      return;
    }

    console.error("Delete conversation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

chatRouter.delete("/:participantId/messages/:messageId", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const result = await chatService.deleteMessage(authedReq.session.user.id, req.params.messageId);

    res.json({
      success: result.success,
      deletedAt: result.deletedAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    
    if (message === "Message not found or not owned by user") {
      res.status(400).json({ error: message });
      return;
    }

    console.error("Delete message error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const chatAttachmentUpload = createChatAttachmentUploadMiddleware({
  maxFileSizeBytes: MAX_DOCUMENT_SIZE
});

chatRouter.post("/:participantId/attachments", 
  requireSession, 
  messageRateLimiter.middleware("upload_attachment"),
  chatAttachmentUpload, 
  async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const authedReq = req as AuthenticatedRequest;
    const result = await chatService.uploadAttachment(
      authedReq.session.user.id,
      req.params.participantId as string,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      req.file.size
    );

    res.status(201).json({
      attachment: {
        id: result.id,
        type: result.type,
        url: result.url,
        fileName: result.fileName,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        thumbnailUrl: result.thumbnailUrl
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    
    if (message === "Not friends with this user") {
      res.status(400).json({ error: message });
      return;
    }
    if (message === "File type not supported" || message === "File too large") {
      res.status(400).json({ error: message });
      return;
    }

    console.error("Upload attachment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
