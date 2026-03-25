import { Router } from "express";
import { z } from "zod";

import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { friendService } from "../services/friend.service.js";
import { friendRequestRateLimiter } from "../lib/rate-limit.js";

const sendFriendRequestSchema = z.object({
  targetUserId: z.string().min(1)
});

const getFriendRequestsSchema = z.object({
  type: z.enum(["incoming", "outgoing", "all"]).optional().default("all"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20)
});

const getFriendsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  search: z.string().optional()
});

export const friendRouter = Router();

friendRouter.post("/requests", 
  requireSession, 
  friendRequestRateLimiter.middleware("send_request"),
  async (req, res) => {
  try {
    const parsed = sendFriendRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const authedReq = req as AuthenticatedRequest;
    const result = await friendService.sendFriendRequest(authedReq.session.user.id, parsed.data.targetUserId);

    res.status(201).json({
      requestId: result.requestId,
      status: result.status,
      targetUserId: result.targetUserId,
      createdAt: result.createdAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    
    if (message === "Cannot send friend request to yourself") {
      res.status(400).json({ error: message });
      return;
    }
    if (message === "Target user not found") {
      res.status(404).json({ error: message });
      return;
    }
    if (message === "Cannot send friend request to this user") {
      res.status(403).json({ error: message });
      return;
    }
    if (message === "Friend request already exists" || message === "Users are already friends" || message === "This user has already sent you a friend request") {
      res.status(400).json({ error: message });
      return;
    }

    console.error("Send friend request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendRouter.get("/requests", requireSession, async (req, res) => {
  try {
    const parsed = getFriendRequestsSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const authedReq = req as AuthenticatedRequest;
    const result = await friendService.getFriendRequests(authedReq.session.user.id, parsed.data.type);

    res.json(result);
  } catch (error) {
    console.error("Get friend requests error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendRouter.post("/requests/:requestId/accept", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const result = await friendService.acceptFriendRequest(authedReq.session.user.id, req.params.requestId as string as string);

    res.json({
      friendshipId: result.friendshipId,
      friend: result.friend
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    
    if (message === "Request not found or not incoming") {
      res.status(400).json({ error: message });
      return;
    }

    console.error("Accept friend request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendRouter.post("/requests/:requestId/decline", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const result = await friendService.declineFriendRequest(authedReq.session.user.id, req.params.requestId as string);

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    
    if (message === "Request not found or not incoming") {
      res.status(400).json({ error: message });
      return;
    }

    console.error("Decline friend request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendRouter.delete("/requests/:requestId", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const result = await friendService.cancelFriendRequest(authedReq.session.user.id, req.params.requestId as string);

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    
    if (message === "Request not found or not outgoing") {
      res.status(400).json({ error: message });
      return;
    }

    console.error("Cancel friend request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendRouter.delete("/:friendId", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const result = await friendService.removeFriend(authedReq.session.user.id, req.params.friendId as string);

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    
    if (message === "Not friends with this user") {
      res.status(400).json({ error: message });
      return;
    }

    console.error("Remove friend error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendRouter.get("/", requireSession, async (req, res) => {
  try {
    const parsed = getFriendsSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const authedReq = req as AuthenticatedRequest;
    const result = await friendService.getFriends(authedReq.session.user.id, {
      page: parsed.data.page,
      limit: parsed.data.limit,
      search: parsed.data.search
    });

    res.json({
      friends: result.friends,
      pagination: result.pagination
    });
  } catch (error) {
    console.error("Get friends error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
