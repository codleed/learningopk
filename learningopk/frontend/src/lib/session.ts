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
      return null;
    }

    const payload = (await response.json()) as SessionPayload | null;
    if (!payload?.session || !payload?.user) {
      return null;
    }

    return payload;
  } catch {
    // Backend may be unavailable during local startup; treat as unauthenticated.
    return null;
  }
};
