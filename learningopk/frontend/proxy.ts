import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/dashboard", "/stats"];

export const proxy = async (request: NextRequest) => {
  const needsAuth = protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  if (!needsAuth) {
    return NextResponse.next();
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

  try {
    const response = await fetch(`${backendUrl}/api/auth/get-session`, {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? ""
      },
      cache: "no-store"
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Unauthenticated or forbidden - redirect to login
        return NextResponse.redirect(new URL("/login", request.url));
      }
      // Auth service or backend error - show service unavailable
      return new NextResponse("Authentication service unavailable. Please try again later.", { status: 503 });
    }

    const payload = (await response.json()) as { session?: unknown } | null;
    if (!payload?.session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Proxy auth check failed:", error);
    // Network error or backend unreachable
    return new NextResponse("Authentication service unreachable. Please check your connection.", { status: 503 });
  }
};

export const config = {
  matcher: ["/dashboard/:path*", "/stats/:path*"]
};
