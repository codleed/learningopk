import { RequestHandler } from "express";
import crypto from "node:crypto";

const CSRF_TOKEN_HEADER = "x-csrf-token";
const CSRF_HEADER_NAME = "x-csrf-header";
const DOUBLE_SUBMIT_COOKIE_NAME = "csrf-token";
const CSRF_SECRET_LENGTH = 32;

export interface CsrfTokenData {
  token: string;
  signature: string;
  expiresAt: number;
}

export const generateCsrfToken = (sessionId: string): CsrfTokenData => {
  const token = crypto.randomBytes(CSRF_SECRET_LENGTH).toString("hex");
  const signature = crypto
    .createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "development-secret")
    .update(`${token}:${sessionId}`)
    .digest("hex");
  
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

  return { token, signature, expiresAt };
};

export const verifyCsrfToken = (token: string, signature: string, sessionId: string): boolean => {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "development-secret")
    .update(`${token}:${sessionId}`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};

export const csrfProtection: RequestHandler = (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    next();
    return;
  }

  const session = (req as any).session?.user?.id;
  
  if (!session) {
    next();
    return;
  }

  const token = req.headers[CSRF_TOKEN_HEADER] as string | undefined;
  const cookieToken = req.cookies?.[DOUBLE_SUBMIT_COOKIE_NAME];

  if (!token || !cookieToken) {
    res.status(403).json({
      error: "CSRF token required",
      code: "CSRF_TOKEN_MISSING"
    });
    return;
  }

  if (token !== cookieToken) {
    res.status(403).json({
      error: "Invalid CSRF token",
      code: "CSRF_TOKEN_INVALID"
    });
    return;
  }

  const signature = req.headers[CSRF_HEADER_NAME] as string | undefined;
  
  if (signature && !verifyCsrfToken(token, signature, session)) {
    res.status(403).json({
      error: "Invalid CSRF token signature",
      code: "CSRF_SIGNATURE_INVALID"
    });
    return;
  }

  next();
};

export const cookieCsrfOptions = {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 24 * 60 * 60 * 1000
};
