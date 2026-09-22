import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { db } from "../../lib/db/index.js";
import { erpTagLinks, erpTags } from "../../lib/db/schema/erp/core.js";
import { ERP_TAG_TARGET_TYPES } from "@learningopk/shared";
import { requireSession } from "../../lib/session.js";
import { errorResponse, successResponse } from "../../lib/response.js";
import { erpGuard, type ErpRequest } from "../../lib/erp/acl.js";

export const erpTagsRouter = Router();

const targetTypes = ERP_TAG_TARGET_TYPES as readonly string[];

// GET /api/erp/tags — list school tags (optional targetType/targetId filter)
erpTagsRouter.get("/", requireSession, erpGuard("ERP_ACCESS"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const rows = await db
    .select()
    .from(erpTags)
    .where(eq(erpTags.schoolId, schoolId))
    .orderBy(erpTags.name);

  res.status(200).json(successResponse({ tags: rows }));
});

// POST /api/erp/tags — create a tag
erpTagsRouter.post("/", requireSession, erpGuard("TAGS_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const bodySchema = z.object({
    name: z.string().min(1).max(60),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid tag", "VALIDATION_ERROR"));
    return;
  }

  const existing = await db
    .select({ id: erpTags.id })
    .from(erpTags)
    .where(and(eq(erpTags.schoolId, schoolId), eq(erpTags.name, parsed.data.name)))
    .limit(1);
  if (existing[0]) {
    res.status(409).json(errorResponse("Tag already exists", "TAG_EXISTS"));
    return;
  }

  const inserted = await db
    .insert(erpTags)
    .values({ schoolId, name: parsed.data.name, color: parsed.data.color ?? null })
    .returning();
  res.status(201).json(successResponse({ tag: inserted[0] }));
});

// DELETE /api/erp/tags/:id
erpTagsRouter.delete("/:id", requireSession, erpGuard("TAGS_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;
  const tagIdParam = req.params.id;
  const tagId = typeof tagIdParam === "string" ? Number.parseInt(tagIdParam, 10) : Number.NaN;
  if (!Number.isSafeInteger(tagId) || tagId <= 0) {
    res.status(400).json(errorResponse("Invalid tag ID", "VALIDATION_ERROR"));
    return;
  }

  const deleted = await db
    .delete(erpTags)
    .where(and(eq(erpTags.id, tagId), eq(erpTags.schoolId, schoolId)))
    .returning({ id: erpTags.id });
  if (deleted.length === 0) {
    res.status(404).json(errorResponse("Tag not found", "TAG_NOT_FOUND"));
    return;
  }
  res.status(200).json(successResponse({ deleted: true }));
});

// POST /api/erp/tags/link — attach/detach a tag to any entity
erpTagsRouter.post("/link", requireSession, erpGuard("TAGS_MANAGE"), async (req, res) => {
  const erpReq = req as ErpRequest;
  const schoolId = erpReq.schoolId!;

  const bodySchema = z.object({
    tagId: z.number().int().positive(),
    targetType: z.string().refine((v) => targetTypes.includes(v)),
    targetId: z.number().int().positive(),
    linked: z.boolean().default(true),
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(errorResponse("Invalid tag link", "VALIDATION_ERROR"));
    return;
  }
  const { tagId, targetType, targetId, linked } = parsed.data;

  const tag = await db
    .select({ id: erpTags.id })
    .from(erpTags)
    .where(and(eq(erpTags.id, tagId), eq(erpTags.schoolId, schoolId)))
    .limit(1);
  if (!tag[0]) {
    res.status(404).json(errorResponse("Tag not found", "TAG_NOT_FOUND"));
    return;
  }

  if (linked) {
    await db
      .insert(erpTagLinks)
      .values({ schoolId, tagId, targetType, targetId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(erpTagLinks)
      .where(
        and(
          eq(erpTagLinks.schoolId, schoolId),
          eq(erpTagLinks.tagId, tagId),
          eq(erpTagLinks.targetType, targetType),
          eq(erpTagLinks.targetId, targetId)
        )
      );
  }

  res.status(200).json(successResponse({ linked }));
});

// GET /api/erp/tags/for/:targetType/:targetId — tags on an entity
erpTagsRouter.get(
  "/for/:targetType/:targetId",
  requireSession,
  erpGuard("ERP_ACCESS"),
  async (req, res) => {
    const erpReq = req as ErpRequest;
    const schoolId = erpReq.schoolId!;
    const { targetType, targetId } = req.params;
    const targetIdNum = typeof targetId === "string" ? Number.parseInt(targetId, 10) : Number.NaN;
    if (
      typeof targetType !== "string" ||
      !targetTypes.includes(targetType) ||
      !Number.isSafeInteger(targetIdNum) ||
      targetIdNum <= 0
    ) {
      res.status(400).json(errorResponse("Invalid target", "VALIDATION_ERROR"));
      return;
    }

    const rows = await db
      .select({ id: erpTags.id, name: erpTags.name, color: erpTags.color })
      .from(erpTagLinks)
      .innerJoin(erpTags, eq(erpTags.id, erpTagLinks.tagId))
      .where(
        and(
          eq(erpTagLinks.schoolId, schoolId),
          eq(erpTagLinks.targetType, targetType),
          eq(erpTagLinks.targetId, targetIdNum)
        )
      );

    res.status(200).json(successResponse({ tags: rows }));
  }
);
