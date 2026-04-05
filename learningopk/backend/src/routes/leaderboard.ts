import { Router } from "express";
import { z } from "zod";

import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { leaderboardService } from "../services/leaderboard.service.js";

const leaderboardQuerySchema = z.object({
  scope: z.enum(["global", "board", "school"]).default("global"),
  metric: z.enum(["xp", "streak", "quizzes"]).default("xp")
});

export const leaderboardRouter = Router();

leaderboardRouter.get("/", requireSession, async (req, res) => {
  const parsed = leaderboardQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid leaderboard query",
      details: parsed.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;

  try {
    const leaderboard = await leaderboardService.getLeaderboard(
      authedReq.session.user.id,
      parsed.data.scope,
      parsed.data.metric
    );
    res.status(200).json(leaderboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});
