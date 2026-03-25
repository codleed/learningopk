import type { RequestHandler } from "express";
import multer from "multer";

const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
] as const;

const SUPPORTED_DOCUMENT_MIME_TYPES = ["application/pdf", "text/plain"] as const;

const ALL_SUPPORTED_TYPES = [...SUPPORTED_IMAGE_MIME_TYPES, ...SUPPORTED_DOCUMENT_MIME_TYPES] as const;

const sendUploadError = ({
  res,
  code,
  message
}: {
  res: Parameters<RequestHandler>[1];
  code: number;
  message: string;
}) => {
  res.status(code).json({ error: message });
};

export const createChatAttachmentUploadMiddleware = ({
  maxFileSizeBytes,
  allowedMimeTypes = ALL_SUPPORTED_TYPES
}: {
  maxFileSizeBytes: number;
  allowedMimeTypes?: readonly string[];
}): RequestHandler => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxFileSizeBytes,
      files: 1
    },
    fileFilter: (_req, file, callback) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
        return;
      }
      callback(null, true);
    }
  }).single("file");

  return (req, res, next) => {
    upload(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          sendUploadError({
            res,
            code: 413,
            message: `File exceeds ${Math.floor(maxFileSizeBytes / (1024 * 1024))}MB limit.`
          });
          return;
        }

        if (error.code === "LIMIT_UNEXPECTED_FILE") {
          sendUploadError({
            res,
            code: 400,
            message: "File type not supported"
          });
          return;
        }

        sendUploadError({
          res,
          code: 400,
          message: "Invalid upload payload."
        });
        return;
      }

      if (error instanceof Error) {
        sendUploadError({
          res,
          code: 400,
          message: error.message
        });
        return;
      }

      next();
    });
  };
};

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024;
