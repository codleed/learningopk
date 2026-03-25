import { Router } from "express";
import { z } from "zod";

import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { privacyService } from "../services/privacy.service.js";

const updatePrivacySchema = z.object({
  searchability: z
    .object({
      allowFindMeBySearch: z.boolean().optional(),
      allowSearchByName: z.boolean().optional(),
      allowSearchByBoard: z.boolean().optional(),
      allowSearchByInstitution: z.boolean().optional()
    })
    .optional(),
  visibility: z
    .object({
      profileVisibility: z.enum(["everyone", "friends_only", "nobody"]).optional(),
      showBoard: z.boolean().optional(),
      showClass: z.boolean().optional()
    })
    .optional(),
  friendRequests: z
    .object({
      whoCanSendRequests: z.enum(["everyone", "friends_of_friends"]).optional()
    })
    .optional(),
  chat: z
    .object({
      whoCanMessageMe: z.enum(["everyone", "friends_only", "nobody"]).optional(),
      showReadReceipts: z.boolean().optional(),
      showTypingIndicators: z.boolean().optional()
    })
    .optional()
});

export const privacyRouter = Router();

privacyRouter.get("/me/privacy", requireSession, async (req, res) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    const settings = await privacyService.getPrivacySettings(authedReq.session.user.id);

    res.json(settings);
  } catch (error) {
    console.error("Get privacy settings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

privacyRouter.patch("/me/privacy", requireSession, async (req, res) => {
  try {
    const parsed = updatePrivacySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const authedReq = req as AuthenticatedRequest;
    const result = await privacyService.updatePrivacySettings(authedReq.session.user.id, parsed.data);

    res.json({
      success: result.success,
      updatedSettings: result.updatedSettings
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    
    if (message === "Invalid setting value") {
      res.status(400).json({ error: message });
      return;
    }

    console.error("Update privacy settings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
