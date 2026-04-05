import { Router } from "express";
import { z } from "zod";

import { aiContextRepository } from "../repositories/ai-context.repository.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { successResponse, errorResponse } from "../lib/response.js";

const VALID_EXPLANATION_STYLES = ["balanced", "visual", "step-by-step", "examples", "analogies"] as const;

const updateContextSchema = z.object({
  preferredExplanationStyle: z.enum(VALID_EXPLANATION_STYLES).optional(),
  weakTopics: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  strongTopics: z.array(z.string().trim().min(1).max(200)).max(20).optional()
});

const topicParamSchema = z.object({
  topic: z.string().trim().min(1).max(200)
});

export const aiContextRouter = Router();

aiContextRouter.get("/context", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  try {
    const context = await aiContextRepository.findByUserId(userId);

    res.status(200).json(successResponse({
      weakTopics: context?.weakTopics ?? [],
      strongTopics: context?.strongTopics ?? [],
      preferredExplanationStyle: context?.preferredExplanationStyle ?? "balanced",
      lastConceptsDiscussed: context?.lastConceptsDiscussed ?? [],
      updatedAt: context?.updatedAt?.toISOString() ?? null
    }));
  } catch (error) {
    console.error("Failed to get AI context:", error);
    res.status(500).json(errorResponse("Failed to retrieve AI context.", "AI_CONTEXT_FETCH_ERROR"));
  }
});

aiContextRouter.patch("/context", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  const parsed = updateContextSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid update payload.", "VALIDATION_ERROR", parsed.error.flatten()));
    return;
  }

  const { preferredExplanationStyle, weakTopics, strongTopics } = parsed.data;

  try {
    const updateData: Record<string, unknown> = {};

    if (preferredExplanationStyle !== undefined) {
      updateData.preferredExplanationStyle = preferredExplanationStyle;
    }
    if (weakTopics !== undefined) {
      updateData.weakTopics = weakTopics.map((t) => t.toLowerCase());
    }
    if (strongTopics !== undefined) {
      updateData.strongTopics = strongTopics.map((t) => t.toLowerCase());
    }

    const updated = await aiContextRepository.upsertContext(userId, updateData as {
      preferredExplanationStyle?: string;
      weakTopics?: string[];
      strongTopics?: string[];
    });

    res.status(200).json(successResponse({
      weakTopics: updated.weakTopics,
      strongTopics: updated.strongTopics,
      preferredExplanationStyle: updated.preferredExplanationStyle,
      lastConceptsDiscussed: updated.lastConceptsDiscussed,
      updatedAt: updated.updatedAt.toISOString()
    }));
  } catch (error) {
    console.error("Failed to update AI context:", error);
    res.status(500).json(errorResponse("Failed to update AI context.", "AI_CONTEXT_UPDATE_ERROR"));
  }
});

aiContextRouter.delete("/context/weak-topics/:topic", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  const rawTopic = req.params.topic;
  const topicStr = Array.isArray(rawTopic) ? rawTopic[0] ?? "" : rawTopic ?? "";
  const parsed = topicParamSchema.safeParse({ topic: decodeURIComponent(topicStr) });
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid topic parameter.", "VALIDATION_ERROR"));
    return;
  }

  try {
    await aiContextRepository.removeWeakTopic(userId, parsed.data.topic);
    res.status(200).json(successResponse({ removed: parsed.data.topic.toLowerCase() }));
  } catch (error) {
    console.error("Failed to remove weak topic:", error);
    res.status(500).json(errorResponse("Failed to remove weak topic.", "AI_CONTEXT_UPDATE_ERROR"));
  }
});

aiContextRouter.delete("/context/strong-topics/:topic", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const userId = authedReq.session.user.id;

  const rawTopic = req.params.topic;
  const topicStr = Array.isArray(rawTopic) ? rawTopic[0] ?? "" : rawTopic ?? "";
  const parsed = topicParamSchema.safeParse({ topic: decodeURIComponent(topicStr) });
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid topic parameter.", "VALIDATION_ERROR"));
    return;
  }

  try {
    await aiContextRepository.removeStrongTopic(userId, parsed.data.topic);
    res.status(200).json(successResponse({ removed: parsed.data.topic.toLowerCase() }));
  } catch (error) {
    console.error("Failed to remove strong topic:", error);
    res.status(500).json(errorResponse("Failed to remove strong topic.", "AI_CONTEXT_UPDATE_ERROR"));
  }
});
