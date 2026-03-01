import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { requireAdminRole } from "../lib/admin.js";
import { db } from "../lib/db/index.js";
import { chapterSummaryMedia, chapters } from "../lib/db/schema.js";
import {
  buildChapterSummaryObjectKey,
  deleteObjectIfExists,
  fileExtensionFromMimeType,
  type SupportedImageMimeType,
  uploadImageBuffer
} from "../lib/minio.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { createSingleImageUploadMiddleware } from "../middleware/image-upload.js";

const chapterIdParamsSchema = z.object({
  chapterId: z.coerce.number().int().positive()
});

export const chapterMediaRouter = Router();

const uploadChapterSummaryMedia = createSingleImageUploadMiddleware({
  fieldName: "media",
  maxFileSizeBytes: 10 * 1024 * 1024
});

chapterMediaRouter.post("/chapters/:chapterId/summary-media", requireSession, uploadChapterSummaryMedia, async (req, res) => {
  const parsedParams = chapterIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      error: "Invalid chapter identifier.",
      details: parsedParams.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const file = authedReq.file;
  if (!file) {
    res.status(400).json({
      error: "Missing media file."
    });
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
    res.status(404).json({
      error: "Chapter not found."
    });
    return;
  }

  const fileExtension = fileExtensionFromMimeType(file.mimetype);
  if (!fileExtension) {
    res.status(400).json({
      error: "Unsupported image type."
    });
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
      res.status(500).json({
        error: "Failed to persist chapter summary media."
      });
      return;
    }

    res.status(201).json({
      asset: {
        id: asset.id,
        chapterId: asset.chapterId,
        objectUrl: asset.objectUrl,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
        createdAt: asset.createdAt.toISOString()
      },
      markdown: `![Chapter summary media](${asset.objectUrl})`
    });
    shouldCleanupNewObject = false;
  } catch (error) {
    if (shouldCleanupNewObject) {
      await deleteObjectIfExists({
        objectKey
      });
    }

    console.error("Failed to upload chapter summary media:", error);
    res.status(500).json({
      error: "Failed to upload chapter summary media."
    });
  }
});
