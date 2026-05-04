import { cookies } from "next/headers";

type AuthServiceError = Error & {
  status?: number;
  code?: "AUTH_SERVICE_UNAVAILABLE";
};

export type SessionPayload = {
  session: {
    id: string;
    userId: string;
    expiresAt: string;
  };
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    class?: string | null;
    degree?: string | null;
    board?: string | null;
    role?: "student" | "admin" | "moderator";
  };
};

/**
 * Retrieves the server-side session.
 * Throws an error if auth service is unreachable or returns an error.
 * Returns null if user is not authenticated (401/403/429 or no session).
 */
export const getServerSession = async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

  try {
    const response = await fetch(`${backendUrl}/api/auth/get-session`, {
      method: "GET",
      headers: {
        cookie: cookieStore.toString()
      },
      cache: "no-store"
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 429) {
        return null;
      }
      // Other errors indicate service issue
      const errorData = await response.json().catch(() => ({ error: "Authentication service error" }));
      const err: AuthServiceError = new Error(errorData?.error ?? "Authentication service unavailable");
      err.status = response.status;
      err.code = "AUTH_SERVICE_UNAVAILABLE";
      throw err;
    }

    const payload = (await response.json()) as SessionPayload | null;
    if (!payload?.session || !payload?.user) {
      return null;
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && (error as AuthServiceError).code === "AUTH_SERVICE_UNAVAILABLE") {
      throw error;
    }
    // Network or other unexpected error
    const err: AuthServiceError = new Error("Failed to connect to authentication service");
    err.code = "AUTH_SERVICE_UNAVAILABLE";
    throw err;
  }
};
