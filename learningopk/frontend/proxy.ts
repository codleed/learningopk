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
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const payload = (await response.json()) as { session?: unknown };
    if (!payload.session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
};

export const config = {
  matcher: ["/dashboard/:path*", "/stats/:path*"]
};
