import { randomUUID } from "node:crypto";

import { Client } from "minio";

import { env } from "./env.js";

export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type SupportedImageMimeType = (typeof SUPPORTED_IMAGE_MIME_TYPES)[number];

const IMAGE_EXTENSION_BY_MIME_TYPE: Record<SupportedImageMimeType, "jpg" | "png" | "webp" | "gif"> =
  {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: Number(env.MINIO_PORT),
  useSSL: env.MINIO_USE_SSL === "true",
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

const normalizedPublicUrl = env.MINIO_PUBLIC_URL.replace(/\/+$/, "");
const defaultBucketInPublicUrl = env.MINIO_BUCKET_IN_PUBLIC_URL === "true";
let ensureBucketPromise: Promise<void> | null = null;

const sanitizePathSegment = (value: string) => value.trim().replace(/[^a-zA-Z0-9_-]/g, "_");

export const fileExtensionFromMimeType = (
  mimeType: string
): "jpg" | "png" | "webp" | "gif" | null => {
  return IMAGE_EXTENSION_BY_MIME_TYPE[mimeType as SupportedImageMimeType] ?? null;
};

export const buildProfileImageObjectKey = ({
  userId,
  fileExtension,
  objectId = randomUUID(),
}: {
  userId: string;
  fileExtension: "jpg" | "png" | "webp" | "gif";
  objectId?: string;
}): string => {
  return `profile-images/${sanitizePathSegment(userId)}/${sanitizePathSegment(objectId)}.${fileExtension}`;
};

export const buildChapterSummaryObjectKey = ({
  chapterId,
  userId,
  fileExtension,
  objectId = randomUUID(),
}: {
  chapterId: number;
  userId: string;
  fileExtension: "jpg" | "png" | "webp" | "gif";
  objectId?: string;
}): string => {
  return `chapter-summaries/${chapterId}/${sanitizePathSegment(userId)}/${sanitizePathSegment(objectId)}.${fileExtension}`;
};

// Canonical prefix for any object produced by `buildChapterSummaryObjectKey`.
// Used by the confirm-upload endpoint to validate user-supplied object keys
// with the same sanitization that was applied when the key was generated.
export const buildChapterSummaryObjectPrefix = (chapterId: number, userId: string): string =>
  `chapter-summaries/${chapterId}/${sanitizePathSegment(userId)}/`;

export const buildChapterCoverObjectKey = ({
  chapterId,
  fileExtension,
  objectId = randomUUID(),
}: {
  chapterId: number;
  fileExtension: "jpg" | "png" | "webp" | "gif";
  objectId?: string;
}): string => {
  return `chapter-covers/${chapterId}/${sanitizePathSegment(objectId)}.${fileExtension}`;
};

export const buildSubjectCoverObjectKey = ({
  subjectId,
  fileExtension,
  objectId = randomUUID(),
}: {
  subjectId: number;
  fileExtension: "jpg" | "png" | "webp" | "gif";
  objectId?: string;
}): string => {
  return `subject-covers/${subjectId}/${sanitizePathSegment(objectId)}.${fileExtension}`;
};

export const buildPublicObjectUrl = ({
  bucket = env.MINIO_BUCKET,
  objectKey,
  bucketInPublicUrl = defaultBucketInPublicUrl,
}: {
  bucket?: string;
  objectKey: string;
  bucketInPublicUrl?: boolean;
}): string => {
  const encodedKey = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  if (bucketInPublicUrl) {
    return `${normalizedPublicUrl}/${bucket}/${encodedKey}`;
  }

  return `${normalizedPublicUrl}/${encodedKey}`;
};

export const extractManagedObjectKeyFromPublicUrl = ({
  publicUrl,
  bucket,
  objectUrl,
  bucketInPublicUrl = defaultBucketInPublicUrl,
}: {
  publicUrl: string;
  bucket: string;
  objectUrl: string;
  bucketInPublicUrl?: boolean;
}): string | null => {
  try {
    const parsedPublic = new URL(publicUrl);
    const parsedObject = new URL(objectUrl);
    if (parsedPublic.origin !== parsedObject.origin) {
      return null;
    }

    const prefix = bucketInPublicUrl ? `/${bucket}/` : "/";
    if (!parsedObject.pathname.startsWith(prefix)) {
      return null;
    }

    let encodedObjectKey = parsedObject.pathname.slice(prefix.length);
    if (!encodedObjectKey) {
      return null;
    }

    if (!bucketInPublicUrl && encodedObjectKey.startsWith(`${bucket}/`)) {
      encodedObjectKey = encodedObjectKey.slice(bucket.length + 1);
    }

    return encodedObjectKey
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/");
  } catch {
    return null;
  }
};

export const ensureMediaBucket = async (bucket = env.MINIO_BUCKET): Promise<void> => {
  if (!ensureBucketPromise) {
    ensureBucketPromise = (async () => {
      const exists = await minioClient.bucketExists(bucket);
      if (!exists) {
        await minioClient.makeBucket(bucket);
      }
    })().catch((error) => {
      ensureBucketPromise = null;
      throw error;
    });
  }

  await ensureBucketPromise;
};

export const uploadImageBuffer = async ({
  objectKey,
  buffer,
  mimeType,
  bucket = env.MINIO_BUCKET,
}: {
  objectKey: string;
  buffer: Buffer;
  mimeType: SupportedImageMimeType;
  bucket?: string;
}): Promise<{ objectKey: string; objectUrl: string }> => {
  await ensureMediaBucket(bucket);

  await minioClient.putObject(bucket, objectKey, buffer, buffer.length, {
    "Content-Type": mimeType,
    "Cache-Control": "public, max-age=31536000, immutable",
  });

  return {
    objectKey,
    objectUrl: buildPublicObjectUrl({ bucket, objectKey }),
  };
};

export const deleteObjectIfExists = async ({
  bucket = env.MINIO_BUCKET,
  objectKey,
}: {
  bucket?: string;
  objectKey: string;
}): Promise<void> => {
  try {
    await minioClient.removeObject(bucket, objectKey);
  } catch {
    // Object replacement should not fail the primary request if cleanup misses.
  }
};

export const objectExists = async ({
  bucket = env.MINIO_BUCKET,
  objectKey,
}: {
  bucket?: string;
  objectKey: string;
}): Promise<boolean> => {
  try {
    await minioClient.statObject(bucket, objectKey);
    return true;
  } catch {
    return false;
  }
};

export const generatePresignedPutUrl = async ({
  objectKey,
  mimeType,
  expirySeconds = 3600,
  bucket = env.MINIO_BUCKET,
}: {
  objectKey: string;
  mimeType: string;
  expirySeconds?: number;
  bucket?: string;
}): Promise<string> => {
  await ensureMediaBucket(bucket);
  return minioClient.presignedPutObject(bucket, objectKey, expirySeconds);
};
