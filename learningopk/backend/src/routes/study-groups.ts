import { Router } from "express";
import { z } from "zod";

import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { studyGroupsService } from "../services/study-groups.service.js";

const createStudyGroupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  invites: z.array(z.string().trim().min(1)).max(5).default([]),
});
const groupParamsSchema = z.object({ groupId: z.string().uuid() });

export const studyGroupsRouter = Router();

studyGroupsRouter.get("/", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  try {
    res.status(200).json(await studyGroupsService.listGroups(authedReq.session.user.id));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

studyGroupsRouter.post("/", requireSession, async (req, res) => {
  const parsed = createStudyGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid study group payload", details: parsed.error.flatten() });
    return;
  }
  const authedReq = req as AuthenticatedRequest;
  try {
    res.status(201).json(
      await studyGroupsService.createGroup({
        userId: authedReq.session.user.id,
        name: parsed.data.name,
        invites: parsed.data.invites,
      })
    );
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

studyGroupsRouter.get("/:groupId", requireSession, async (req, res) => {
  const parsed = groupParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid study group route parameters", details: parsed.error.flatten() });
    return;
  }
  const authedReq = req as AuthenticatedRequest;
  try {
    const payload = await studyGroupsService.getGroupDetail(
      parsed.data.groupId,
      authedReq.session.user.id
    );
    if (!payload) {
      res.status(404).json({ error: "Study group not found" });
      return;
    }
    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});
