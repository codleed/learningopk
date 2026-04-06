/**
 * Utility helpers for identifying auth-service errors thrown by `getServerSession()`.
 *
 * `getServerSession` throws errors with `code === "AUTH_SERVICE_UNAVAILABLE"` when
 * the backend / auth service is unreachable or returns a non-401/403 HTTP error.
 * These helpers let error boundaries distinguish service outages from other errors.
 */

type AuthServiceError = Error & {
  status?: number;
  code?: "AUTH_SERVICE_UNAVAILABLE";
};

/**
 * Returns `true` when the error was thrown because the auth/backend service
 * is unreachable or returned an unexpected HTTP error (not 401/403/429).
 */
export function isAuthServiceUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const asAuth = error as AuthServiceError;
  if (asAuth.code === "AUTH_SERVICE_UNAVAILABLE") return true;

  // Next.js may digest/wrap the original error. Check the message as a fallback.
  const msg = error.message.toLowerCase();
  return (
    msg.includes("authentication service unavailable") ||
    msg.includes("failed to connect to authentication service")
  );
}
