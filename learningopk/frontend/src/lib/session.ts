import { cookies } from "next/headers";

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
    role?: "student" | "admin";
  };
};

/**
 * Retrieves the server-side session.
 * Throws an error if auth service is unreachable or returns an error.
 * Returns null if user is not authenticated (401 or no session).
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
      if (response.status === 401 || response.status === 403) {
        return null;
      }
      // Other errors indicate service issue
      const errorData = await response.json().catch(() => ({ error: "Authentication service error" }));
      const err = new Error(errorData?.error ?? "Authentication service unavailable");
      (err as any).status = response.status;
      (err as any).code = "AUTH_SERVICE_UNAVAILABLE";
      throw err;
    }

    const payload = (await response.json()) as SessionPayload | null;
    if (!payload?.session || !payload?.user) {
      return null;
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && (error as any).code === "AUTH_SERVICE_UNAVAILABLE") {
      throw error;
    }
    // Network or other unexpected error
    const err = new Error("Failed to connect to authentication service");
    (err as any).code = "AUTH_SERVICE_UNAVAILABLE";
    throw err;
  }
};
