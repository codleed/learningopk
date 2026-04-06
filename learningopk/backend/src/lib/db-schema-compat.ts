import { logger } from "./logger.js";

type ErrorWithCode = {
  code?: string;
  message?: string;
  cause?: unknown;
};

const OPTIONAL_SCHEMA_ERROR_CODES = new Set(["42P01", "42703", "42704"]);

const getErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  return (error as ErrorWithCode).code;
};

export const isMissingOptionalDbFeatureError = (error: unknown): boolean => {
  let current: unknown = error;

  while (current && typeof current === "object") {
    const code = getErrorCode(current);
    if (code && OPTIONAL_SCHEMA_ERROR_CODES.has(code)) {
      return true;
    }

    current = (current as ErrorWithCode).cause;
  }

  return false;
};

export const withOptionalDbFallback = async <T>(
  feature: string,
  run: () => Promise<T>,
  fallback: () => Promise<T> | T
): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    if (!isMissingOptionalDbFeatureError(error)) {
      throw error;
    }

    logger.warn(
      {
        feature,
        error,
      },
      "Optional database feature is unavailable; using fallback"
    );

    return await fallback();
  }
};
