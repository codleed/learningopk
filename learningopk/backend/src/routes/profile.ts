import { z } from "zod";
import { eq } from "drizzle-orm";
import { Router } from "express";

import {
  buildProfileImageObjectKey,
  deleteObjectIfExists,
  extractManagedObjectKeyFromPublicUrl,
  fileExtensionFromMimeType,
  type SupportedImageMimeType,
  uploadImageBuffer
} from "../lib/minio.js";
import { db } from "../lib/db/index.js";
import { users } from "../lib/db/schema.js";
import { env } from "../lib/env.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { createSingleImageUploadMiddleware } from "../middleware/image-upload.js";
import { leaderboardService } from "../services/leaderboard.service.js";

export const profileRouter = Router();

const leaderboardSettingsSchema = z.object({
  public: z.boolean()
});

const uploadProfileImage = createSingleImageUploadMiddleware({
  fieldName: "image",
  maxFileSizeBytes: 2 * 1024 * 1024
});

profileRouter.put("/me/profile-image", requireSession, uploadProfileImage, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const file = authedReq.file;

  if (!file) {
    res.status(400).json({
      error: "Missing image file."
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

  const userId = authedReq.session.user.id;
  const objectKey = buildProfileImageObjectKey({
    userId,
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

    const existingUserRows = await db
      .select({
        image: users.image
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const previousImageUrl = existingUserRows[0]?.image ?? null;

    const updatedRows = await db
      .update(users)
      .set({
        image: objectUrl,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({
        image: users.image
      });

    const updatedImageUrl = updatedRows[0]?.image ?? objectUrl;

    if (previousImageUrl && previousImageUrl !== updatedImageUrl) {
      const previousObjectKey = extractManagedObjectKeyFromPublicUrl({
        publicUrl: env.MINIO_PUBLIC_URL,
        bucket: env.MINIO_BUCKET,
        objectUrl: previousImageUrl
      });

      if (previousObjectKey) {
        await deleteObjectIfExists({
          objectKey: previousObjectKey
        });
      }
    }

    shouldCleanupNewObject = false;

    res.status(200).json({
      imageUrl: updatedImageUrl
    });
  } catch (error) {
    if (shouldCleanupNewObject) {
      await deleteObjectIfExists({
        objectKey
      });
    }

    console.error("Failed to upload profile image:", error);
    res.status(500).json({
      error: "Failed to upload profile image."
    });
  }
});

profileRouter.get("/me/leaderboard-settings", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;

  try {
    const settings = await leaderboardService.getSettings(authedReq.session.user.id);
    res.status(200).json(settings);
  } catch (error) {
    console.error("Failed to load leaderboard settings:", error);
    res.status(500).json({
      error: "Failed to load leaderboard settings."
    });
  }
});

profileRouter.put("/me/leaderboard-settings", requireSession, async (req, res) => {
  const parsed = leaderboardSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid leaderboard settings payload.",
      details: parsed.error.flatten()
    });
    return;
  }

  const authedReq = req as AuthenticatedRequest;

  try {
    const settings = await leaderboardService.updateSettings(authedReq.session.user.id, parsed.data.public);
    res.status(200).json(settings);
  } catch (error) {
    console.error("Failed to update leaderboard settings:", error);
    res.status(500).json({
      error: "Failed to update leaderboard settings."
    });
  }
});
