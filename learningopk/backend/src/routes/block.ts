import { Router } from "express";

import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { blockService } from "../services/block.service.js";

export const blockRouter = Router();

blockRouter.post("/:userId/block", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const result = await blockService.blockUser(authedReq.session.user.id, req.params.userId as string);

    res.json({
      success: result.success,
      blockedUserId: result.blockedUserId
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    
    if (message === "Cannot block yourself") {
      res.status(400).json({ error: message });
      return;
    }
    if (message === "User not found") {
      res.status(404).json({ error: message });
      return;
    }
    if (message === "User is already blocked") {
      res.status(400).json({ error: message });
      return;
    }

    console.error("Block user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

blockRouter.delete("/:userId/block", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const result = await blockService.unblockUser(authedReq.session.user.id, req.params.userId as string);

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    
    if (message === "User is not blocked") {
      res.status(400).json({ error: message });
      return;
    }

    console.error("Unblock user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

blockRouter.get("/blocked", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const result = await blockService.getBlockedUsers(authedReq.session.user.id);

    res.json({
      blockedUsers: result.blockedUsers
    });
  } catch (error) {
    console.error("Get blocked users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
