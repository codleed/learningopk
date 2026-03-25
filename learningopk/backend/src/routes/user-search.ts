import { Router } from "express";
import { z } from "zod";

import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { userSearchService } from "../services/user-search.service.js";
import { searchRateLimiter } from "../lib/rate-limit.js";
import { sanitizeSearchQuery } from "../lib/sanitize.js";

const searchUsersSchema = z.object({
  query: z.string().optional(),
  board: z.string().optional(),
  institution_id: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20)
});

const userProfileSchema = z.object({
  userId: z.string()
});

export const userSearchRouter = Router();

userSearchRouter.get("/search", 
  requireSession, 
  searchRateLimiter.middleware("search_users"),
  async (req, res) => {
  try {
    const parsed = searchUsersSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const sanitizedQuery = sanitizeSearchQuery(parsed.data.query ?? "");

    const authedReq = req as AuthenticatedRequest;
    const result = await userSearchService.searchUsers(authedReq.session.user.id, {
      query: sanitizedQuery,
      board: parsed.data.board,
      institutionId: parsed.data.institution_id,
      page: parsed.data.page,
      limit: parsed.data.limit,
      excludeUserId: authedReq.session.user.id
    });

    res.json({
      users: result.items,
      pagination: result.pagination
    });
  } catch (error) {
    console.error("User search error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

userSearchRouter.get("/:userId", requireSession, async (req, res) => {
  try {
    const parsed = userProfileSchema.safeParse({ userId: req.params.userId as string });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }

    const authedReq = req as AuthenticatedRequest;
    const profile = await userSearchService.getUserProfile(authedReq.session.user.id, parsed.data.userId);

    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(profile);
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
