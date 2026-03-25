import { randomUUID } from "node:crypto";

import { Client } from "minio";

import { env } from "./env.js";

export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
] as const;

export const SUPPORTED_DOCUMENT_MIME_TYPES = ["application/pdf", "text/plain"] as const;

export const ALL_SUPPORTED_ATTACHMENT_MIME_TYPES = [
  ...SUPPORTED_IMAGE_MIME_TYPES,
  ...SUPPORTED_DOCUMENT_MIME_TYPES
] as const;

export type SupportedImageMimeType = (typeof SUPPORTED_IMAGE_MIME_TYPES)[number];
export type SupportedDocumentMimeType = (typeof SUPPORTED_DOCUMENT_MIME_TYPES)[number];
export type SupportedAttachmentMimeType = (typeof ALL_SUPPORTED_ATTACHMENT_MIME_TYPES)[number];

const IMAGE_EXTENSION_BY_MIME_TYPE: Record<SupportedImageMimeType, "jpg" | "png" | "webp" | "gif"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

const DOCUMENT_EXTENSION_BY_MIME_TYPE: Record<SupportedDocumentMimeType, "pdf" | "txt"> = {
  "application/pdf": "pdf",
  "text/plain": "txt"
};

export const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: Number(env.MINIO_PORT),
  useSSL: env.MINIO_USE_SSL === "true",
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY
});

const normalizedPublicUrl = env.MINIO_PUBLIC_URL.replace(/\/+$/, "");
let ensureBucketPromise: Promise<void> | null = null;

const sanitizePathSegment = (value: string) => value.trim().replace(/[^a-zA-Z0-9_-]/g, "_");

export const fileExtensionFromMimeType = (mimeType: string): "jpg" | "png" | "webp" | "gif" | null => {
  return IMAGE_EXTENSION_BY_MIME_TYPE[mimeType as SupportedImageMimeType] ?? null;
};

export const documentExtensionFromMimeType = (mimeType: string): "pdf" | "txt" | null => {
  return DOCUMENT_EXTENSION_BY_MIME_TYPE[mimeType as SupportedDocumentMimeType] ?? null;
};

export const getFileExtensionFromMimeType = (mimeType: string): string | null => {
  const ext = fileExtensionFromMimeType(mimeType);
  if (ext) return ext;
  return documentExtensionFromMimeType(mimeType) ?? null;
};

export const buildProfileImageObjectKey = ({
  userId,
  fileExtension,
  objectId = randomUUID()
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
  objectId = randomUUID()
}: {
  chapterId: number;
  userId: string;
  fileExtension: "jpg" | "png" | "webp" | "gif";
  objectId?: string;
}): string => {
  return `chapter-summaries/${chapterId}/${sanitizePathSegment(userId)}/${sanitizePathSegment(objectId)}.${fileExtension}`;
};

export const buildChatAttachmentObjectKey = ({
  conversationId,
  attachmentId,
  fileExtension
}: {
  conversationId: string;
  attachmentId: string;
  fileExtension: string;
}): string => {
  return `attachments/chat/${sanitizePathSegment(conversationId)}/${sanitizePathSegment(attachmentId)}.${fileExtension}`;
};

export const buildPublicObjectUrl = ({
  bucket = env.MINIO_BUCKET,
  objectKey
}: {
  bucket?: string;
  objectKey: string;
}): string => {
  const encodedKey = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${normalizedPublicUrl}/${bucket}/${encodedKey}`;
};

export const extractManagedObjectKeyFromPublicUrl = ({
  publicUrl,
  bucket,
  objectUrl
}: {
  publicUrl: string;
  bucket: string;
  objectUrl: string;
}): string | null => {
  try {
    const parsedPublic = new URL(publicUrl);
    const parsedObject = new URL(objectUrl);
    if (parsedPublic.origin !== parsedObject.origin) {
      return null;
    }

    const prefix = `/${bucket}/`;
    if (!parsedObject.pathname.startsWith(prefix)) {
      return null;
    }

    const encodedObjectKey = parsedObject.pathname.slice(prefix.length);
    if (!encodedObjectKey) {
      return null;
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
  bucket = env.MINIO_BUCKET
}: {
  objectKey: string;
  buffer: Buffer;
  mimeType: SupportedImageMimeType;
  bucket?: string;
}): Promise<{ objectKey: string; objectUrl: string }> => {
  await ensureMediaBucket(bucket);

  await minioClient.putObject(bucket, objectKey, buffer, buffer.length, {
    "Content-Type": mimeType,
    "Cache-Control": "public, max-age=31536000, immutable"
  });

  return {
    objectKey,
    objectUrl: buildPublicObjectUrl({ bucket, objectKey })
  };
};

export const deleteObjectIfExists = async ({
  bucket = env.MINIO_BUCKET,
  objectKey
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

export const generatePresignedUploadUrl = async ({
  objectKey,
  mimeType,
  expiresSeconds = 3600,
  bucket = env.MINIO_BUCKET
}: {
  objectKey: string;
  mimeType: SupportedAttachmentMimeType;
  expiresSeconds?: number;
  bucket?: string;
}): Promise<{ uploadUrl: string; objectKey: string }> => {
  await ensureMediaBucket(bucket);

  const url = await minioClient.presignedPutObject(bucket, objectKey, expiresSeconds);

  return {
    uploadUrl: url,
    objectKey
  };
};

export const generatePresignedDownloadUrl = async ({
  objectKey,
  expiresSeconds = 3600,
  bucket = env.MINIO_BUCKET
}: {
  objectKey: string;
  expiresSeconds?: number;
  bucket?: string;
}): Promise<string> => {
  return minioClient.presignedGetObject(bucket, objectKey, expiresSeconds);
};

export const uploadBuffer = async ({
  objectKey,
  buffer,
  mimeType,
  bucket = env.MINIO_BUCKET
}: {
  objectKey: string;
  buffer: Buffer;
  mimeType: SupportedAttachmentMimeType;
  bucket?: string;
}): Promise<{ objectKey: string; objectUrl: string }> => {
  await ensureMediaBucket(bucket);

  const metadata: Record<string, string> = {
    "Content-Type": mimeType
  };

  if (SUPPORTED_IMAGE_MIME_TYPES.includes(mimeType as SupportedImageMimeType)) {
    metadata["Cache-Control"] = "public, max-age=31536000, immutable";
  }

  await minioClient.putObject(bucket, objectKey, buffer, buffer.length, metadata);

  return {
    objectKey,
    objectUrl: buildPublicObjectUrl({ bucket, objectKey })
  };
};
