import type { RequestHandler } from "express";
import multer from "multer";

import { SUPPORTED_IMAGE_MIME_TYPES } from "../lib/minio.js";

const unsupportedTypeMessage = "Only JPEG, PNG, WEBP, and GIF files are allowed.";

const createImageUploader = (maxFileSizeBytes: number) =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxFileSizeBytes,
      files: 1
    },
    fileFilter: (_req, file, callback) => {
      if (!SUPPORTED_IMAGE_MIME_TYPES.includes(file.mimetype as (typeof SUPPORTED_IMAGE_MIME_TYPES)[number])) {
        callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
        return;
      }

      callback(null, true);
    }
  });

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

export const createSingleImageUploadMiddleware = ({
  fieldName,
  maxFileSizeBytes,
  required = true
}: {
  fieldName: string;
  maxFileSizeBytes: number;
  required?: boolean;
}): RequestHandler => {
  const upload = createImageUploader(maxFileSizeBytes).single(fieldName);

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
            message: unsupportedTypeMessage
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

      if (required && !req.file) {
        sendUploadError({
          res,
          code: 400,
          message: `Missing '${fieldName}' file in multipart form data.`
        });
        return;
      }

      next();
    });
  };
};
