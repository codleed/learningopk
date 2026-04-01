import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { requireAdminRole } from "../lib/admin.js";
import { db } from "../lib/db/index.js";
import { chapterSummaryMedia, chapters } from "../lib/db/schema.js";
import {
  buildChapterSummaryObjectKey,
  buildPublicObjectUrl,
  deleteObjectIfExists,
  fileExtensionFromMimeType,
  generatePresignedPutUrl,
  SUPPORTED_IMAGE_MIME_TYPES,
  type SupportedImageMimeType,
  uploadImageBuffer
} from "../lib/minio.js";
import { errorResponse, successResponse } from "../lib/response.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { createSingleImageUploadMiddleware } from "../middleware/image-upload.js";

const chapterIdParamsSchema = z.object({
  chapterId: z.coerce.number().int().positive()
});

const mediaIdParamsSchema = z.object({
  chapterId: z.coerce.number().int().positive(),
  mediaId: z.string().uuid()
});

const presignedUploadBodySchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.enum(SUPPORTED_IMAGE_MIME_TYPES),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024)
});

const confirmUploadBodySchema = z.object({
  objectKey: z.string().min(1),
  mimeType: z.enum(SUPPORTED_IMAGE_MIME_TYPES),
  fileSize: z.number().int().positive()
});

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const chapterMediaRouter = Router();

const uploadChapterSummaryMedia = createSingleImageUploadMiddleware({
  fieldName: "media",
  maxFileSizeBytes: MAX_FILE_SIZE_BYTES
});

// --------------------------------------------------------------------------
// POST /chapters/:chapterId/summary-media  (existing buffer upload)
// --------------------------------------------------------------------------
chapterMediaRouter.post("/chapters/:chapterId/summary-media", requireSession, uploadChapterSummaryMedia, async (req, res) => {
  const parsedParams = chapterIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json(errorResponse("Invalid chapter identifier.", "VALIDATION_ERROR", parsedParams.error.flatten()));
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const file = authedReq.file;
  if (!file) {
    res.status(400).json(errorResponse("Missing media file.", "VALIDATION_ERROR"));
    return;
  }

  const chapterId = parsedParams.data.chapterId;
  const chapterRows = await db
    .select({
      id: chapters.id
    })
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);

  if (!chapterRows[0]) {
    res.status(404).json(errorResponse("Chapter not found.", "NOT_FOUND"));
    return;
  }

  const fileExtension = fileExtensionFromMimeType(file.mimetype);
  if (!fileExtension) {
    res.status(400).json(errorResponse("Unsupported image type.", "VALIDATION_ERROR"));
    return;
  }

  const objectKey = buildChapterSummaryObjectKey({
    chapterId,
    userId: authedReq.session.user.id,
    fileExtension
  });
  let shouldCleanupNewObject = false;

  try {
    const mimeType = file.mimetype as SupportedImageMimeType;
    const { objectUrl } = await uploadImageBuffer({
      objectKey,
      buffer: file.buffer,
      mimeType
    });
    shouldCleanupNewObject = true;

    const insertedRows = await db
      .insert(chapterSummaryMedia)
      .values({
        chapterId,
        objectKey,
        objectUrl,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedBy: authedReq.session.user.id
      })
      .returning({
        id: chapterSummaryMedia.id,
        chapterId: chapterSummaryMedia.chapterId,
        objectUrl: chapterSummaryMedia.objectUrl,
        mimeType: chapterSummaryMedia.mimeType,
        fileSize: chapterSummaryMedia.fileSize,
        createdAt: chapterSummaryMedia.createdAt
      });

    const asset = insertedRows[0];
    if (!asset) {
      res.status(500).json(errorResponse("Failed to persist chapter summary media.", "INTERNAL_ERROR"));
      return;
    }

    res.status(201).json(successResponse({
      asset: {
        id: asset.id,
        chapterId: asset.chapterId,
        objectUrl: asset.objectUrl,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
        createdAt: asset.createdAt.toISOString()
      },
      markdown: `![Chapter summary media](${asset.objectUrl})`
    }));
    shouldCleanupNewObject = false;
  } catch (error) {
    if (shouldCleanupNewObject) {
      await deleteObjectIfExists({
        objectKey
      });
    }

    console.error("Failed to upload chapter summary media:", error);
    res.status(500).json(errorResponse("Failed to upload chapter summary media.", "INTERNAL_ERROR"));
  }
});

// --------------------------------------------------------------------------
// POST /chapters/:chapterId/presigned-upload  (presigned URL upload)
// --------------------------------------------------------------------------
chapterMediaRouter.post("/chapters/:chapterId/presigned-upload", requireSession, async (req, res) => {
  const parsedParams = chapterIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json(errorResponse("Invalid chapter identifier.", "VALIDATION_ERROR", parsedParams.error.flatten()));
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = presignedUploadBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json(errorResponse("Invalid presigned upload payload.", "VALIDATION_ERROR", parsedBody.error.flatten()));
    return;
  }

  const chapterId = parsedParams.data.chapterId;
  const { mimeType } = parsedBody.data;

  try {
    const chapterRows = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.id, chapterId))
      .limit(1);

    if (!chapterRows[0]) {
      res.status(404).json(errorResponse("Chapter not found.", "NOT_FOUND"));
      return;
    }

    const fileExtension = fileExtensionFromMimeType(mimeType);
    if (!fileExtension) {
      res.status(400).json(errorResponse("Unsupported image type.", "VALIDATION_ERROR"));
      return;
    }

    const objectKey = buildChapterSummaryObjectKey({
      chapterId,
      userId: authedReq.session.user.id,
      fileExtension
    });

    const presignedUrl = await generatePresignedPutUrl({
      objectKey,
      mimeType
    });

    const publicUrl = buildPublicObjectUrl({ objectKey });

    res.status(200).json(successResponse({
      presignedUrl,
      objectKey,
      publicUrl
    }));
  } catch (error) {
    console.error("Failed to generate presigned upload URL:", error);
    res.status(500).json(errorResponse("Failed to generate presigned upload URL.", "INTERNAL_ERROR"));
  }
});

// --------------------------------------------------------------------------
// POST /chapters/:chapterId/media/confirm  (confirm presigned upload)
// --------------------------------------------------------------------------
chapterMediaRouter.post("/chapters/:chapterId/media/confirm", requireSession, async (req, res) => {
  const parsedParams = chapterIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json(errorResponse("Invalid chapter identifier.", "VALIDATION_ERROR", parsedParams.error.flatten()));
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const parsedBody = confirmUploadBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json(errorResponse("Invalid confirm upload payload.", "VALIDATION_ERROR", parsedBody.error.flatten()));
    return;
  }

  const chapterId = parsedParams.data.chapterId;
  const { objectKey, mimeType, fileSize } = parsedBody.data;

  try {
    const chapterRows = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.id, chapterId))
      .limit(1);

    if (!chapterRows[0]) {
      res.status(404).json(errorResponse("Chapter not found.", "NOT_FOUND"));
      return;
    }

    const objectUrl = buildPublicObjectUrl({ objectKey });

    const insertedRows = await db
      .insert(chapterSummaryMedia)
      .values({
        chapterId,
        objectKey,
        objectUrl,
        mimeType,
        fileSize,
        uploadedBy: authedReq.session.user.id
      })
      .returning({
        id: chapterSummaryMedia.id,
        chapterId: chapterSummaryMedia.chapterId,
        objectUrl: chapterSummaryMedia.objectUrl,
        mimeType: chapterSummaryMedia.mimeType,
        fileSize: chapterSummaryMedia.fileSize,
        createdAt: chapterSummaryMedia.createdAt
      });

    const asset = insertedRows[0];
    if (!asset) {
      res.status(500).json(errorResponse("Failed to persist chapter summary media.", "INTERNAL_ERROR"));
      return;
    }

    res.status(201).json(successResponse({
      asset: {
        id: asset.id,
        chapterId: asset.chapterId,
        objectUrl: asset.objectUrl,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
        createdAt: asset.createdAt.toISOString()
      },
      markdown: `![Chapter summary media](${asset.objectUrl})`
    }));
  } catch (error) {
    console.error("Failed to confirm chapter summary media upload:", error);
    res.status(500).json(errorResponse("Failed to confirm chapter summary media upload.", "INTERNAL_ERROR"));
  }
});

// --------------------------------------------------------------------------
// GET /chapters/:chapterId/media  (list chapter media)
// --------------------------------------------------------------------------
chapterMediaRouter.get("/chapters/:chapterId/media", requireSession, async (req, res) => {
  const parsedParams = chapterIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json(errorResponse("Invalid chapter identifier.", "VALIDATION_ERROR", parsedParams.error.flatten()));
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const chapterId = parsedParams.data.chapterId;

  try {
    const chapterRows = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.id, chapterId))
      .limit(1);

    if (!chapterRows[0]) {
      res.status(404).json(errorResponse("Chapter not found.", "NOT_FOUND"));
      return;
    }

    const mediaRows = await db
      .select({
        id: chapterSummaryMedia.id,
        chapterId: chapterSummaryMedia.chapterId,
        objectUrl: chapterSummaryMedia.objectUrl,
        mimeType: chapterSummaryMedia.mimeType,
        fileSize: chapterSummaryMedia.fileSize,
        createdAt: chapterSummaryMedia.createdAt
      })
      .from(chapterSummaryMedia)
      .where(eq(chapterSummaryMedia.chapterId, chapterId))
      .orderBy(desc(chapterSummaryMedia.createdAt));

    const media = mediaRows.map((row) => ({
      id: row.id,
      chapterId: row.chapterId,
      objectUrl: row.objectUrl,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      createdAt: row.createdAt.toISOString()
    }));

    res.status(200).json(successResponse({ media }));
  } catch (error) {
    console.error("Failed to list chapter summary media:", error);
    res.status(500).json(errorResponse("Failed to list chapter summary media.", "INTERNAL_ERROR"));
  }
});

// --------------------------------------------------------------------------
// DELETE /chapters/:chapterId/media/:mediaId  (delete chapter media)
// --------------------------------------------------------------------------
chapterMediaRouter.delete("/chapters/:chapterId/media/:mediaId", requireSession, async (req, res) => {
  const parsedParams = mediaIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json(errorResponse("Invalid chapter or media identifier.", "VALIDATION_ERROR", parsedParams.error.flatten()));
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const { chapterId, mediaId } = parsedParams.data;

  try {
    const mediaRows = await db
      .select({
        id: chapterSummaryMedia.id,
        objectKey: chapterSummaryMedia.objectKey
      })
      .from(chapterSummaryMedia)
      .where(
        and(
          eq(chapterSummaryMedia.id, mediaId),
          eq(chapterSummaryMedia.chapterId, chapterId)
        )
      )
      .limit(1);

    const mediaRecord = mediaRows[0];
    if (!mediaRecord) {
      res.status(404).json(errorResponse("Media not found.", "NOT_FOUND"));
      return;
    }

    await deleteObjectIfExists({ objectKey: mediaRecord.objectKey });

    await db
      .delete(chapterSummaryMedia)
      .where(eq(chapterSummaryMedia.id, mediaId));

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to delete chapter summary media:", error);
    res.status(500).json(errorResponse("Failed to delete chapter summary media.", "INTERNAL_ERROR"));
  }
});
