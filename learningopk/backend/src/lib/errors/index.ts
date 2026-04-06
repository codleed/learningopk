/**
 * Custom error classes for precise error handling and status code management.
 * Provides type-safe error handling throughout the application.
 */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, HttpError.prototype);
  }

  toResponse() {
    return {
      error: this.message,
      ...(this.code !== undefined && { code: this.code }),
      ...(this.details !== undefined && { details: this.details })
    };
  }
}

export class ValidationError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(400, message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string, code?: string, details?: unknown) {
    super(404, message, code ?? "NOT_FOUND", details);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string, code?: string, details?: unknown) {
    super(403, message, code ?? "FORBIDDEN", details);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = "Unauthorized", code?: string, details?: unknown) {
    super(401, message, code ?? "UNAUTHORIZED", details);
    this.name = "UnauthorizedError";
  }
}

export class ConflictError extends HttpError {
  constructor(message: string, code?: string, details?: unknown) {
    super(409, message, code ?? "CONFLICT", details);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends HttpError {
  constructor(message: string, retryAfterSeconds: number, details?: unknown) {
    super(429, message, "RATE_LIMIT_EXCEEDED", details);
    Object.defineProperty(this, "retryAfterSeconds", { value: retryAfterSeconds, enumerable: true });
    this.name = "RateLimitError";
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(message: string = "Service temporarily unavailable", code?: string, details?: unknown) {
    super(503, message, code ?? "SERVICE_UNAVAILABLE", details);
    this.name = "ServiceUnavailableError";
  }
}

export class ModerationError extends HttpError {
  constructor(message: string, reason?: string, details?: unknown) {
    super(422, message, "MODERATION_BLOCKED", details);
    Object.defineProperty(this, "reason", { value: reason, enumerable: true });
    this.name = "ModerationError";
  }
}

export class QuizNotFoundError extends HttpError {
  constructor(message = "Quiz not found") {
    super(404, message, "QUIZ_NOT_FOUND");
    this.name = "QuizNotFoundError";
  }
}

export class QuizNoQuestionsError extends HttpError {
  constructor(message = "Quiz has no questions to score") {
    super(422, message, "QUIZ_NO_QUESTIONS");
    this.name = "QuizNoQuestionsError";
  }
}

export class QuizAnswerMismatchError extends HttpError {
  constructor(message = "Answers include question IDs that do not belong to this quiz") {
    super(400, message, "QUIZ_ANSWER_MISMATCH");
    this.name = "QuizAnswerMismatchError";
  }
}

export class QuizAttemptSaveError extends HttpError {
  constructor(message = "Could not save quiz attempt") {
    super(409, message, "QUIZ_ATTEMPT_SAVE_FAILED");
    this.name = "QuizAttemptSaveError";
  }
}

export class QuizChallengeNotFoundError extends HttpError {
  constructor(message = "Quiz challenge not found") {
    super(404, message, "QUIZ_CHALLENGE_NOT_FOUND");
    this.name = "QuizChallengeNotFoundError";
  }
}

export class QuizChallengeExpiredError extends HttpError {
  constructor(message = "Quiz challenge has expired") {
    super(410, message, "QUIZ_CHALLENGE_EXPIRED");
    this.name = "QuizChallengeExpiredError";
  }
}

export class QuizChallengeConflictError extends HttpError {
  constructor(message = "Quiz challenge is not valid for this submission") {
    super(409, message, "QUIZ_CHALLENGE_CONFLICT");
    this.name = "QuizChallengeConflictError";
  }
}

/**
 * Type guard to check if an error is an HttpError
 */
export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError && "status" in error && "toResponse" in error;
}
