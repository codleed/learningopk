import { randomUUID } from "node:crypto";

import {
  buildChatAttachmentObjectKey,
  generatePresignedDownloadUrl,
  generatePresignedUploadUrl,
  getFileExtensionFromMimeType,
  type SupportedAttachmentMimeType,
  uploadBuffer
} from "../lib/minio.js";
import { env } from "../lib/env.js";
import {
  getMaxSizeForMimeType,
  isImageMimeType,
  isValidExtension,
  validateFile,
  type FileValidationResult
} from "../lib/file-validation.js";

export interface UploadResult {
  id: string;
  objectKey: string;
  url: string;
  type: "image" | "file";
  mimeType: string;
  fileName: string;
  fileSize: number;
  thumbnailUrl: string | null;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  objectKey: string;
  id: string;
  expiresAt: Date;
}

export class MediaUploadService {
  async uploadAttachment(
    file: Buffer,
    fileName: string,
    mimeType: string,
    fileSize: number,
    conversationId: string
  ): Promise<UploadResult> {
    if (!isValidExtension(fileName, mimeType)) {
      throw new Error("File extension does not match MIME type");
    }

    const validation = validateFile({
      buffer: file,
      declaredMimeType: mimeType,
      fileSize
    });

    if (!validation.isValid) {
      throw new Error(validation.errorMessage ?? "Invalid file");
    }

    const maxSize = getMaxSizeForMimeType(mimeType);
    if (fileSize > maxSize) {
      throw new Error(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
    }

    const attachmentId = randomUUID();
    const ext = getFileExtensionFromMimeType(mimeType) ?? "bin";
    const objectKey = buildChatAttachmentObjectKey({
      conversationId,
      attachmentId,
      fileExtension: ext
    });

    await uploadBuffer({
      objectKey,
      buffer: file,
      mimeType: mimeType as SupportedAttachmentMimeType
    });

    const url = `${env.MINIO_PUBLIC_URL}/${env.MINIO_BUCKET}/${objectKey}`;
    const isImage = isImageMimeType(mimeType);

    return {
      id: attachmentId,
      objectKey,
      url,
      type: isImage ? "image" : "file",
      mimeType,
      fileName,
      fileSize,
      thumbnailUrl: isImage ? url : null
    };
  }

  async generatePresignedUpload(
    fileName: string,
    mimeType: string,
    fileSize: number,
    conversationId: string,
    expiresSeconds = 300
  ): Promise<PresignedUrlResult> {
    if (!isValidExtension(fileName, mimeType)) {
      throw new Error("File extension does not match MIME type");
    }

    const maxSize = getMaxSizeForMimeType(mimeType);
    if (fileSize > maxSize) {
      throw new Error(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
    }

    if (!ALL_SUPPORTED_MIME_TYPES.includes(mimeType as SupportedAttachmentMimeType)) {
      throw new Error("File type not supported");
    }

    const cappedExpires = Math.min(Math.max(expiresSeconds, 60), 300);
    const attachmentId = randomUUID();
    const ext = getFileExtensionFromMimeType(mimeType) ?? "bin";
    const objectKey = buildChatAttachmentObjectKey({
      conversationId,
      attachmentId,
      fileExtension: ext
    });

    const { uploadUrl } = await generatePresignedUploadUrl({
      objectKey,
      mimeType: mimeType as SupportedAttachmentMimeType,
      expiresSeconds: cappedExpires
    });

    return {
      uploadUrl,
      objectKey,
      id: attachmentId,
      expiresAt: new Date(Date.now() + cappedExpires * 1000)
    };
  }

  async getPresignedDownloadUrl(objectKey: string, expiresSeconds = 3600): Promise<string> {
    const cappedExpires = Math.min(Math.max(expiresSeconds, 60), 3600);
    this.validateObjectKeyScope(objectKey);
    return generatePresignedDownloadUrl({
      objectKey,
      expiresSeconds: cappedExpires
    });
  }

  private validateObjectKeyScope(objectKey: string): void {
    const validPrefixes = ["profile-images/", "chapter-summaries/", "attachments/chat/"];
    const isValid = validPrefixes.some(prefix => objectKey.startsWith(prefix));
    if (!isValid) {
      throw new Error("Invalid object key scope");
    }
  }
}

const ALL_SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain"
] as const;

export const mediaUploadService = new MediaUploadService();
