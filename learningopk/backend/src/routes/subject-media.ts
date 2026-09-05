import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { requireAdminRole } from "../lib/admin.js";
import { db } from "../lib/db/index.js";
import { subjects } from "../lib/db/schema.js";
import {
  buildPublicObjectUrl,
  deleteObjectIfExists,
  extractManagedObjectKeyFromPublicUrl,
  fileExtensionFromMimeType,
  buildSubjectCoverObjectKey,
  uploadImageBuffer,
  SUPPORTED_IMAGE_MIME_TYPES,
  type SupportedImageMimeType,
} from "../lib/minio.js";
import { env } from "../lib/env.js";
import { errorResponse } from "../lib/response.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { createSingleImageUploadMiddleware } from "../middleware/image-upload.js";

const subjectIdParamsSchema = z.object({
  subjectId: z.coerce.number().int().positive(),
});

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const subjectMediaRouter = Router();

const uploadSubjectCoverImage = createSingleImageUploadMiddleware({
  fieldName: "cover",
  maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
});

subjectMediaRouter.post(
  "/subjects/:subjectId/cover-image",
  requireSession,
  uploadSubjectCoverImage,
  async (req, res) => {
    const parsedParams = subjectIdParamsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res
        .status(400)
        .json(
          errorResponse(
            "Invalid subject identifier.",
            "VALIDATION_ERROR",
            parsedParams.error.flatten()
          )
        );
      return;
    }

    const authedReq = req as AuthenticatedRequest;
    if (!(await requireAdminRole(authedReq, res))) {
      return;
    }

    const file = authedReq.file;
    if (!file) {
      res.status(400).json(errorResponse("Missing cover image file.", "VALIDATION_ERROR"));
      return;
    }

    const subjectId = parsedParams.data.subjectId;

    const subjectRows = await db
      .select({
        id: subjects.id,
        coverImageUrl: subjects.coverImageUrl,
        name: subjects.name,
      })
      .from(subjects)
      .where(eq(subjects.id, subjectId))
      .limit(1);

    const subject = subjectRows[0];
    if (!subject) {
      res.status(404).json(errorResponse("Subject not found.", "NOT_FOUND"));
      return;
    }

    const fileExtension = fileExtensionFromMimeType(file.mimetype);
    if (!fileExtension) {
      res.status(400).json(errorResponse("Unsupported image type.", "VALIDATION_ERROR"));
      return;
    }

    try {
      const objectKey = buildSubjectCoverObjectKey({
        subjectId,
        fileExtension,
      });

      const { objectUrl } = await uploadImageBuffer({
        objectKey,
        buffer: file.buffer,
        mimeType: file.mimetype as SupportedImageMimeType,
      });

      try {
        await db
          .update(subjects)
          .set({ coverImageUrl: objectUrl })
          .where(eq(subjects.id, subjectId));
      } catch (dbError) {
        console.error("Failed to update subject cover image in DB:", dbError);

        // Cleanup: delete the uploaded object since DB update failed
        try {
          await deleteObjectIfExists({ objectKey });
        } catch (deleteError) {
          console.error("Failed to cleanup uploaded object after DB error:", deleteError);
        }

        throw dbError;
      }

      if (subject.coverImageUrl && subject.coverImageUrl !== objectUrl) {
        const oldObjectKey = extractManagedObjectKeyFromPublicUrl({
          publicUrl: env.MINIO_PUBLIC_URL,
          bucket: env.MINIO_BUCKET,
          objectUrl: subject.coverImageUrl,
        });
        if (oldObjectKey) {
          try {
            await deleteObjectIfExists({ objectKey: oldObjectKey });
          } catch (deleteError) {
            console.error("Failed to delete old cover image:", deleteError);
          }
        }
      }

      res.json({
        coverImageUrl: objectUrl,
      });
    } catch (error) {
      console.error("Failed to upload subject cover image:", error);
      res
        .status(500)
        .json(errorResponse("Failed to upload subject cover image.", "INTERNAL_ERROR"));
    }
  }
);

subjectMediaRouter.delete("/subjects/:subjectId/cover-image", requireSession, async (req, res) => {
  const parsedParams = subjectIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res
      .status(400)
      .json(
        errorResponse(
          "Invalid subject identifier.",
          "VALIDATION_ERROR",
          parsedParams.error.flatten()
        )
      );
    return;
  }

  const authedReq = req as AuthenticatedRequest;
  if (!(await requireAdminRole(authedReq, res))) {
    return;
  }

  const subjectId = parsedParams.data.subjectId;

  const subjectRows = await db
    .select({
      id: subjects.id,
      coverImageUrl: subjects.coverImageUrl,
    })
    .from(subjects)
    .where(eq(subjects.id, subjectId))
    .limit(1);

  const subject = subjectRows[0];
  if (!subject) {
    res.status(404).json(errorResponse("Subject not found.", "NOT_FOUND"));
    return;
  }

  try {
    if (subject.coverImageUrl) {
      const objectKey = extractManagedObjectKeyFromPublicUrl({
        publicUrl: env.MINIO_PUBLIC_URL,
        bucket: env.MINIO_BUCKET,
        objectUrl: subject.coverImageUrl,
      });
      if (objectKey) {
        try {
          await deleteObjectIfExists({ objectKey });
        } catch (deleteError) {
          console.error("Failed to delete cover image from storage:", deleteError);
          res
            .status(500)
            .json(errorResponse("Failed to delete cover image from storage.", "INTERNAL_ERROR"));
          return;
        }
      }
    }

    await db.update(subjects).set({ coverImageUrl: null }).where(eq(subjects.id, subjectId));

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete subject cover image:", error);
    res.status(500).json(errorResponse("Failed to delete subject cover image.", "INTERNAL_ERROR"));
  }
});
