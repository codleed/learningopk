import { ALL_SUPPORTED_ATTACHMENT_MIME_TYPES, type SupportedAttachmentMimeType } from "./minio.js";

export interface FileSignature {
  mimeType: SupportedAttachmentMimeType;
  signatures: Array<{ offset: number; bytes: Buffer }>;
}

const FILE_SIGNATURES: FileSignature[] = [
  {
    mimeType: "image/jpeg",
    signatures: [
      { offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]) }
    ]
  },
  {
    mimeType: "image/png",
    signatures: [
      { offset: 0, bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }
    ]
  },
  {
    mimeType: "image/gif",
    signatures: [
      { offset: 0, bytes: Buffer.from("GIF87a", "ascii") },
      { offset: 0, bytes: Buffer.from("GIF89a", "ascii") }
    ]
  },
  {
    mimeType: "image/webp",
    signatures: [
      { offset: 0, bytes: Buffer.from([0x52, 0x49, 0x46, 0x46]) }, // RIFF
      { offset: 8, bytes: Buffer.from("WEBP", "ascii") }
    ]
  },
  {
    mimeType: "application/pdf",
    signatures: [
      { offset: 0, bytes: Buffer.from("%PDF-", "ascii") }
    ]
  },
  {
    mimeType: "text/plain",
    signatures: [
      { offset: 0, bytes: Buffer.from([0xef, 0xbb, 0xbf]) } // UTF-8 BOM (optional, text files may not have it)
    ]
  }
];

export interface FileValidationResult {
  isValid: boolean;
  detectedMimeType: string | null;
  errorMessage: string | null;
}

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024;

export const isImageMimeType = (mimeType: string): boolean => {
  return (
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/webp" ||
    mimeType === "image/gif"
  );
};

export const isDocumentMimeType = (mimeType: string): boolean => {
  return mimeType === "application/pdf" || mimeType === "text/plain";
};

export const getMaxSizeForMimeType = (mimeType: string): number => {
  if (isImageMimeType(mimeType)) {
    return MAX_IMAGE_SIZE;
  }
  if (isDocumentMimeType(mimeType)) {
    return MAX_DOCUMENT_SIZE;
  }
  return MAX_DOCUMENT_SIZE;
};

export const validateFileSignature = (buffer: Buffer, mimeType: string): boolean => {
  const signatureEntry = FILE_SIGNATURES.find((sig) => sig.mimeType === mimeType);
  if (!signatureEntry) {
    return false;
  }

  return signatureEntry.signatures.every((sig) => {
    const fileBytes = buffer.slice(sig.offset, sig.offset + sig.bytes.length);
    return fileBytes.equals(sig.bytes);
  });
};

export const detectMimeTypeFromSignature = (buffer: Buffer): string | null => {
  for (const signature of FILE_SIGNATURES) {
    const allMatch = signature.signatures.every((sig) => {
      const fileBytes = buffer.slice(sig.offset, sig.offset + sig.bytes.length);
      return fileBytes.equals(sig.bytes);
    });

    if (allMatch) {
      return signature.mimeType;
    }
  }
  return null;
};

export const validateFile = ({
  buffer,
  declaredMimeType,
  fileSize
}: {
  buffer: Buffer;
  declaredMimeType: string;
  fileSize: number;
}): FileValidationResult => {
  if (!ALL_SUPPORTED_ATTACHMENT_MIME_TYPES.includes(declaredMimeType as SupportedAttachmentMimeType)) {
    return {
      isValid: false,
      detectedMimeType: null,
      errorMessage: `Unsupported file type: ${declaredMimeType}`
    };
  }

  const maxSize = getMaxSizeForMimeType(declaredMimeType);
  if (fileSize > maxSize) {
    return {
      isValid: false,
      detectedMimeType: null,
      errorMessage: `File size exceeds maximum allowed size of ${Math.floor(maxSize / (1024 * 1024))}MB`
    };
  }

  const detectedMimeType = detectMimeTypeFromSignature(buffer);
  if (detectedMimeType === null) {
    if (declaredMimeType === "text/plain") {
      return {
        isValid: true,
        detectedMimeType,
        errorMessage: null
      };
    }
    return {
      isValid: false,
      detectedMimeType: null,
      errorMessage: "Unable to verify file signature. The file may be corrupted or fake."
    };
  }

  if (detectedMimeType !== declaredMimeType) {
    return {
      isValid: false,
      detectedMimeType,
      errorMessage: `File signature mismatch. Expected ${declaredMimeType} but detected ${detectedMimeType}. This may indicate a spoofing attempt.`
    };
  }

  return {
    isValid: true,
    detectedMimeType,
    errorMessage: null
  };
};

export const isValidExtension = (fileName: string, mimeType: string): boolean => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension) return false;

  const extensionMap: Record<string, string[]> = {
    jpg: ["image/jpeg"],
    jpeg: ["image/jpeg"],
    png: ["image/png"],
    webp: ["image/webp"],
    gif: ["image/gif"],
    pdf: ["application/pdf"],
    txt: ["text/plain"]
  };

  return extensionMap[extension]?.includes(mimeType) ?? false;
};
