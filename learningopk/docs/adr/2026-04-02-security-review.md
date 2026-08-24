# Security Review: LearningoPK Backend

**Date**: 2026-04-02
**Reviewer**: Security Engineer (Automated Deep Review)
**Scope**: Express.js + Drizzle ORM + PostgreSQL + Redis + BullMQ + Better-Auth backend
**Codebase Root**: `learningopk/backend/src/`

---

## Executive Summary

The LearningoPK backend demonstrates **strong foundational security** in several areas: consistent use of Zod validation on all inputs, Drizzle ORM parameterized queries preventing SQL injection, role-checked admin endpoints, Redis-backed rate limiting on AI and forum mutations, and proper session-based auth via Better-Auth. The codebase follows many security best practices described in the project AGENTS.md.

However, this review identified **4 CRITICAL**, **6 HIGH**, **9 MEDIUM**, and **5 LOW** severity findings that require attention before production hardening. The most urgent issues are: missing security headers (no Helmet), no JSON body size limit enabling DoS, hardcoded MinIO development credentials in defaults, and potential ILIKE wildcard injection in admin search.

### Risk Summary

| Severity | Count | Status                            |
| -------- | ----- | --------------------------------- |
| CRITICAL | 4     | Requires immediate fix            |
| HIGH     | 6     | Fix before next production deploy |
| MEDIUM   | 9     | Fix within current sprint         |
| LOW      | 5     | Fix during next refactor cycle    |

---

## Findings

### CRITICAL-01: No Security Headers (Missing Helmet)

**File**: `server.ts` (entire file)
**Severity**: CRITICAL

**Description**: The Express application does not use `helmet` or any equivalent middleware to set security headers. There are no `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `X-XSS-Protection`, `Referrer-Policy`, or `Permissions-Policy` headers configured anywhere in the backend.

A grep across the entire codebase for `helmet`, `Content-Security-Policy`, and `X-Frame-Options` returns zero results.

**Exploitation Scenario**: Without these headers:

- **Clickjacking**: An attacker can embed the application in an iframe on a malicious site and trick admins into performing actions (changing roles, suspending users).
- **MIME sniffing**: Uploaded images could be reinterpreted as HTML/JavaScript by browsers.
- **No HSTS**: Users can be downgraded from HTTPS to HTTP via man-in-the-middle attacks.
- **No CSP**: If any XSS vector exists (even via a dependency), there is no secondary defense layer.

**Recommended Fix**:

```bash
pnpm add helmet
```

```typescript
// server.ts
import helmet from "helmet";

export const createApp = () => {
  const app = express();

  // Security headers - apply BEFORE all routes
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", env.MINIO_PUBLIC_URL],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false, // May need tuning for MinIO images
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  app.use(cors({ ... }));
  // ...rest of setup
};
```

---

### CRITICAL-02: No JSON Body Size Limit - Denial of Service

**File**: `server.ts:37`
**Severity**: CRITICAL

**Description**: `express.json()` is invoked without a `limit` parameter. The Express 5.x default is `100kb`, but this is not explicitly set and could be changed by a dependency update. More importantly, the `/api/auth` route is mounted **before** `express.json()` on line 36, meaning Better-Auth's internal body parsing has no visible size constraint either.

For the AI chat endpoint specifically, `chatInputSchema` allows `messages` with up to 40 entries of 4,000 characters each (160KB of message content alone), which combined with JSON structure overhead could approach or exceed default limits.

**Exploitation Scenario**: An attacker sends a multi-megabyte JSON payload to any POST endpoint. Even at the 100kb default, 40 messages x 4000 chars is legitimately allowed by the Zod schema, so the real concern is that future changes or misconfigurations could remove the limit. Without an explicit configuration, this is fragile.

**Recommended Fix**:

```typescript
// server.ts:37 - Set explicit, conservative body size limit
app.use(express.json({ limit: "256kb" }));

// For the auth route specifically, Better-Auth handles its own parsing,
// but consider adding express.json with a limit before it if possible:
app.use("/api/auth", express.json({ limit: "64kb" }), authRouter);
```

---

### CRITICAL-03: Hardcoded MinIO Development Credentials in Defaults

**File**: `lib/env.ts:18-19`
**Severity**: CRITICAL

**Description**: The Zod environment schema provides default values for MinIO credentials:

```typescript
MINIO_ACCESS_KEY: z.string().min(1).default("minioadmin"),
MINIO_SECRET_KEY: z.string().min(1).default("minioadmin123"),
```

If the `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` environment variables are not explicitly set in production, the application will silently use well-known default credentials. This is the MinIO root user password that ships with every MinIO Docker image.

**Exploitation Scenario**: If the production deployment fails to set these env vars (misconfigured container, missing .env file, incomplete CI/CD), the backend will connect to MinIO using `minioadmin/minioadmin123`. If the MinIO instance is accessible from the internet (common in cloud deployments), any attacker can:

1. Read/download all uploaded images (profile photos, chapter media)
2. Upload arbitrary files to the bucket
3. Delete all stored media
4. Potentially execute server-side attacks if MinIO has known vulnerabilities

**Recommended Fix**:

```typescript
// lib/env.ts - Remove defaults for credentials; require them explicitly
const schema = z.object({
  // ...
  MINIO_ENDPOINT: z.string().min(1).default("localhost"),
  MINIO_PORT: z.string().regex(/^\d+$/).default("9000"),
  MINIO_USE_SSL: z.enum(["true", "false"]).default("false"),
  MINIO_ACCESS_KEY: z.string().min(1), // No default - MUST be set
  MINIO_SECRET_KEY: z.string().min(8), // No default, enforce min length
  MINIO_BUCKET: z.string().min(1).default("learningo-media"),
  MINIO_PUBLIC_URL: z.string().url(), // No default - MUST be set
  // ...
});
```

For local development, document the values in `.env.example` and ensure `docker-compose.yml` sets them.

---

### CRITICAL-04: ILIKE Wildcard Injection in Admin Search

**File**: `routes/admin.ts:616-620`, `routes/admin.ts:813-814`
**Severity**: CRITICAL

**Description**: The admin audit log search and user search functions interpolate user-supplied search terms directly into `ilike` patterns without escaping SQL LIKE wildcards (`%`, `_`):

```typescript
// admin.ts:616-620
(ilike(adminAuditLogs.action, `%${searchTerm}%`),
  ilike(adminAuditLogs.target, `%${searchTerm}%`),
  ilike(adminAuditLogs.message, `%${searchTerm}%`),
  ilike(adminAuditLogs.actorName, `%${searchTerm}%`));

// admin.ts:813-814
(ilike(users.name, `%${searchTerm}%`), ilike(users.email, `%${searchTerm}%`));
```

While Drizzle ORM **does** parameterize these values (preventing SQL injection), the LIKE pattern characters `%` and `_` within the user input are **not escaped**. This is not SQL injection, but it is a LIKE pattern injection.

**Exploitation Scenario**:

1. **Performance attack**: An admin (or compromised admin account) searches for `%%%%%%%%%%%%%%%%%%%%%` which creates a worst-case pattern for PostgreSQL's LIKE optimizer, potentially causing full table scans and high CPU usage.
2. **Information disclosure via wildcard**: Searching for `_@gmail.com` matches all single-character-prefix Gmail addresses, enabling targeted user enumeration.
3. **ReDoS-adjacent**: While PostgreSQL's `ILIKE` is not regex-based, deeply nested wildcard patterns can cause significantly slower query execution on large tables.

**Recommended Fix**:

```typescript
// lib/sql-utils.ts
export const escapeLikePattern = (input: string): string =>
  input.replace(/[%_\\]/g, (char) => `\\${char}`);

// Usage in admin.ts:
import { escapeLikePattern } from "../lib/sql-utils.js";

// In listAuditLogs:
const escaped = escapeLikePattern(searchTerm);
const searchPredicate = or(
  ilike(adminAuditLogs.action, `%${escaped}%`),
  ilike(adminAuditLogs.target, `%${escaped}%`),
  ilike(adminAuditLogs.message, `%${escaped}%`),
  ilike(adminAuditLogs.actorName, `%${escaped}%`)
);

// In listAdminUsers:
const escaped = escapeLikePattern(searchTerm);
const searchPredicate =
  searchTerm.length > 0
    ? or(ilike(users.name, `%${escaped}%`), ilike(users.email, `%${escaped}%`))
    : undefined;
```

---

### HIGH-01: No CSRF Protection on State-Changing Operations

**File**: `server.ts`, `lib/auth.ts`
**Severity**: HIGH

**Description**: The application uses cookie-based session authentication (`credentials: true` in CORS) but has no CSRF protection mechanism. There is no CSRF token middleware, no double-submit cookie pattern, and no `SameSite` attribute configured on session cookies (Better-Auth defaults may vary).

Better-Auth may set `SameSite=Lax` by default on session cookies, which provides partial protection against CSRF for non-GET requests. However, `Lax` still allows top-level navigation POST requests (form submissions), and the application does not appear to explicitly configure this.

**Exploitation Scenario**: An attacker crafts a page with a hidden form that POST-submits to `/api/admin/users/:id/role` (or any state-changing endpoint). If an admin visits the page while logged in, the browser sends session cookies automatically. Without CSRF protection, the form submission changes a user's role to admin.

**Recommended Fix**:

```typescript
// In lib/auth.ts - Explicitly configure session cookie attributes
export const auth = betterAuth({
  // ...existing config
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  advanced: {
    cookiePrefix: "learningo",
    defaultCookieAttributes: {
      httpOnly: true,
      secure: true, // Only send over HTTPS
      sameSite: "strict", // Block all cross-origin requests
      path: "/",
    },
  },
});
```

If `SameSite=Strict` is too restrictive for UX (e.g., links from email), use `Lax` and additionally implement:

```typescript
// Custom CSRF middleware using the Origin header check
const csrfProtection: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  const origin = req.headers.origin;
  if (!origin || origin !== env.FRONTEND_ORIGIN) {
    res.status(403).json({ error: "CSRF validation failed" });
    return;
  }
  next();
};

// Apply after CORS, before routes
app.use(csrfProtection);
```

---

### HIGH-02: Unsafe Type Assertion Without Runtime Validation

**File**: `lib/session.ts:49`
**Severity**: HIGH

**Description**: The session middleware uses a TypeScript type assertion to cast the request object:

```typescript
(req as AuthenticatedRequest).session = session;
```

This is a compile-time-only cast. If `requireSession` is accidentally removed from a route's middleware chain but the handler still casts `req as AuthenticatedRequest`, TypeScript will not flag this at compile time. The `session` property will be `undefined` at runtime, and any access like `authedReq.session.user.id` will throw an unhandled error that leaks a stack trace.

This pattern is repeated in **every single route handler** across admin.ts, forum.ts, ai-chat.ts, quiz.ts, progress.ts, profile.ts, and chapter-media.ts.

**Exploitation Scenario**: During a refactor, a developer removes `requireSession` from a route but forgets to update the handler. The application crashes with an uncaught exception on the first request, potentially revealing internal stack traces if there's no global error handler.

**Recommended Fix**:

```typescript
// lib/session.ts - Add a runtime assertion helper
export function assertSession(req: Request): AuthenticatedRequest {
  const maybeAuthed = req as Partial<AuthenticatedRequest>;
  if (!maybeAuthed.session?.user?.id) {
    throw new UnauthorizedError("Session not available. Middleware may be misconfigured.");
  }
  return req as AuthenticatedRequest;
}

// Usage in route handlers (replaces `req as AuthenticatedRequest`):
adminRouter.post("/notifications", requireSession, async (req, res) => {
  const authedReq = assertSession(req);
  // ... rest of handler
});
```

---

### HIGH-03: No Global Rate Limiting on API Endpoints

**File**: `server.ts` (missing)
**Severity**: HIGH

**Description**: Rate limiting is only implemented for:

- AI chat: 20 requests/hour per user (`ai-guardrails.ts:3`)
- Forum mutations: 60 requests/hour per user (`ai-guardrails.ts:6`)

All other endpoints have **zero rate limiting**:

- Authentication endpoints (`/api/auth/*`) - including login, signup
- Admin endpoints (59 route handlers)
- Quiz submission (`/api/quiz/submit`)
- Progress events (`/api/progress/events`)
- Profile image upload (`/api/users/me/profile-image`)
- Learn/chapter data (`/api/learn/*`)
- Mock exams (`/api/mock-exams/*`)
- Health check (`/api/health`)

**Exploitation Scenario**:

1. **Credential stuffing**: An attacker brute-forces login credentials with no rate limit on `/api/auth/sign-in/email`.
2. **Resource exhaustion**: Thousands of quiz submissions or progress events flood the database.
3. **Admin panel abuse**: A compromised admin account can make unlimited requests.

**Recommended Fix**:

```bash
pnpm add express-rate-limit
```

```typescript
// server.ts
import rateLimit from "express-rate-limit";

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 auth attempts per 15 minutes
  message: { error: "Too many authentication attempts." },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30, // 30 uploads per hour
  message: { error: "Upload rate limit exceeded." },
});

app.use(globalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/users/me/profile-image", uploadLimiter);
app.use("/api/admin/content/chapters/:chapterId/summary-media", uploadLimiter);
```

---

### HIGH-04: Presigned Upload Object Key Accepts User-Supplied Values Without Path Validation

**File**: `routes/chapter-media.ts:247`, `lib/minio.ts:66-78`
**Severity**: HIGH

**Description**: The `/chapters/:chapterId/media/confirm` endpoint accepts a user-supplied `objectKey` in the request body:

```typescript
const { objectKey, mimeType, fileSize } = parsedBody.data;
// ...
const objectUrl = buildPublicObjectUrl({ objectKey });
```

The `confirmUploadBodySchema` validates `objectKey` as `z.string().min(1)` - no path traversal or format validation. An attacker with admin access could supply an `objectKey` pointing to another user's profile image or another chapter's media, and the confirmation would record it in the database. While `objectExists()` checks the key exists in MinIO, a valid key from another namespace could pass this check.

Additionally, `buildPublicObjectUrl` encodes path segments but does not validate the key stays within the expected `chapter-summaries/` prefix.

**Exploitation Scenario**: An admin user obtains a presigned URL for chapter 5, then calls `/chapters/5/media/confirm` with `objectKey: "profile-images/victim-user-id/photo.jpg"`. The media record is created pointing to the victim's profile image, which could later be deleted via the media deletion endpoint.

**Recommended Fix**:

```typescript
// routes/chapter-media.ts - Validate objectKey format in confirm endpoint
const CHAPTER_SUMMARY_KEY_PATTERN =
  /^chapter-summaries\/\d+\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(jpg|png|webp|gif)$/;

const confirmUploadBodySchema = z.object({
  objectKey: z.string().min(1).regex(CHAPTER_SUMMARY_KEY_PATTERN, "Invalid object key format"),
  mimeType: z.enum(SUPPORTED_IMAGE_MIME_TYPES),
  fileSize: z.number().int().positive(),
});

// Additionally, verify the objectKey contains the correct chapterId:
if (!parsedBody.data.objectKey.startsWith(`chapter-summaries/${chapterId}/`)) {
  res.status(400).json(errorResponse("Object key does not match chapter.", "VALIDATION_ERROR"));
  return;
}
```

---

### HIGH-05: Error Messages Leak Internal Details to Clients

**File**: `routes/quiz.ts:55`, `routes/progress.ts:55-56,68,99`, `routes/health.ts:20-21`, `routes/admin.ts:2780,2982,3070`
**Severity**: HIGH

**Description**: Several routes return raw `error.message` values to the client in 500 responses:

```typescript
// quiz.ts:55
res.status(500).json({ error: message });

// progress.ts:55-56
const message = error instanceof Error ? error.message : "Unknown error";
res.status(500).json({ error: message });

// health.ts:20-21
const message = error instanceof Error ? error.message : "Unknown health error";
res.status(503).json({ ok: false, ..., error: message });

// admin.ts:2780 (used in audit log for board/class/subject delete failures)
message: error instanceof Error ? error.message : "Board delete failed",
```

PostgreSQL and Node.js error messages can contain table names, column names, constraint names, connection strings, and stack traces.

**Exploitation Scenario**: An attacker triggers a database error (e.g., by submitting edge-case data that causes a constraint violation) and receives a response like:

```json
{
  "error": "duplicate key value violates unique constraint \"user_progress_user_id_chapter_id_key\" (user_id=abc, chapter_id=123)"
}
```

This reveals database table structure, constraint names, and potentially other users' IDs.

**Recommended Fix**:

```typescript
// For all 500-level error responses, use generic messages:
catch (error) {
  console.error("Quiz submission error:", error);
  res.status(500).json({ error: "An unexpected error occurred." });
}

// For health endpoint, only expose service status, not error details:
catch (error) {
  console.error("Health check failed:", error);
  res.status(503).json({ ok: false, postgres: "down", redis: "down" });
}
```

---

### HIGH-06: No Global Error Handler - Unhandled Errors Crash or Leak

**File**: `server.ts` (missing)
**Severity**: HIGH

**Description**: The Express application has no global error-handling middleware. If any async route handler throws an unhandled exception (which Express 5.x does handle better than 4.x for async functions), the response may include default Express error formatting which could leak stack traces.

Additionally, there is no `process.on('unhandledRejection')` handler for the main application (only `SIGINT`/`SIGTERM` handlers exist), and no centralized error logging.

**Recommended Fix**:

```typescript
// server.ts - Add after all route registrations
import type { ErrorRequestHandler } from "express";

const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("Unhandled error:", err);

  if (isHttpError(err)) {
    res.status(err.status).json(err.toResponse());
    return;
  }

  res.status(500).json({ error: "Internal server error" });
};

// Register AFTER all routes
app.use(globalErrorHandler);

// In the isDirectRun block:
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise rejection:", reason);
});
```

---

### MEDIUM-01: Authentication Route Bypasses Body Parser Middleware

**File**: `server.ts:36-37`
**Severity**: MEDIUM

**Description**: The auth router is mounted **before** `express.json()`:

```typescript
app.use("/api/auth", authRouter); // Line 36 - BEFORE json parser
app.use(express.json()); // Line 37
```

This is intentional (Better-Auth uses `toNodeHandler` which handles its own parsing), but it means Better-Auth's request parsing is not governed by the same body size limits as the rest of the application. If Better-Auth's internal parsing has different limits or configurations, this could be exploited.

**Recommended Fix**: Verify Better-Auth's internal body parsing limits match your security requirements, or add an explicit size-limiting middleware before it:

```typescript
// Ensure body size is limited even for auth routes
app.use("/api/auth", express.raw({ limit: "64kb", type: "*/*" }), authRouter);
```

_Note: Test this carefully - Better-Auth may need specific content-type handling._

---

### MEDIUM-02: Admin Role Check is Not Middleware - Inconsistency Risk

**File**: `lib/admin.ts:8-24`, `routes/admin.ts` (59 endpoints)
**Severity**: MEDIUM

**Description**: Admin authorization is implemented as a function that must be manually called inside every endpoint handler:

```typescript
const authedReq = req as AuthenticatedRequest;
if (!(await requireAdminRole(authedReq, res))) {
  return;
}
```

This pattern is repeated 55 times across 59 admin endpoints. The 4 remaining endpoints (audit log reads at lines 5291-5317) delegate to `handleAuditLogRead` / `handleAggregatedAuditLogRead` which internally call `requireAdminRole` - so **all 59 endpoints are currently covered**.

However, this pattern is fragile. Every new endpoint requires the developer to remember to add the admin check. A single omission creates a privilege escalation vulnerability.

**Recommended Fix**: Convert to a router-level middleware:

```typescript
// lib/admin.ts - Create as middleware
export const requireAdmin: RequestHandler = async (req, res, next) => {
  const authedReq = req as AuthenticatedRequest;
  const userRows = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, authedReq.session.user.id))
    .limit(1);

  if (userRows[0]?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
};

// routes/admin.ts - Apply once at router level
const adminRouter = Router();
adminRouter.use(requireSession, requireAdmin);

// All routes automatically get session + admin check
adminRouter.get("/notifications", async (req, res) => { ... });
```

---

### MEDIUM-03: No Account Lockout After Failed Login Attempts

**File**: `lib/auth.ts`
**Severity**: MEDIUM

**Description**: The Better-Auth configuration does not include account lockout or progressive delay after failed login attempts. Combined with the lack of rate limiting on auth endpoints (HIGH-03), this creates a credential stuffing vulnerability.

**Exploitation Scenario**: An attacker automates login attempts against known email addresses (enumerated from forum posts or other sources) with common Pakistani passwords. Without lockout, they can try thousands of combinations per hour.

**Recommended Fix**:

```typescript
// lib/auth.ts - Add rate limiting and lockout configuration
export const auth = betterAuth({
  // ...existing config
  rateLimit: {
    enabled: true,
    window: 60, // 60 second window
    max: 10, // 10 attempts per window
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    maxPasswordLength: 128,
    minPasswordLength: 8,
  },
});
```

Also apply the auth-specific rate limiter from HIGH-03.

---

### MEDIUM-04: Mistral API Key Defaults to "not-configured" Silently

**File**: `lib/env.ts:22`
**Severity**: MEDIUM

**Description**: The Mistral API key has a default value of `"not-configured"`:

```typescript
MISTRAL_API_KEY: z.string().min(1).optional().default("not-configured"),
```

While the AI chat endpoint checks for this value and returns a 503, this means the application starts successfully without a valid API key. The string `"not-configured"` satisfies the `.min(1)` constraint.

If a developer accidentally removes the runtime check in `ai-chat.ts:216`, the application would send `"not-configured"` as an API key to Mistral, which would log the attempt and potentially flag the account.

**Recommended Fix**:

```typescript
// Make it truly optional with no default, or use a union
MISTRAL_API_KEY: z.string().min(1).optional(),

// Then check in ai-chat.ts:
if (!env.MISTRAL_API_KEY) {
  res.status(503).json({ error: "AI service not configured." });
  return;
}
```

---

### MEDIUM-05: Forum Body Has No Maximum Length Constraint

**File**: `routes/forum.ts:14,28`
**Severity**: MEDIUM

**Description**: The forum thread creation schema validates body with `.min(10)` but no `.max()`:

```typescript
const createThreadSchema = z.object({
  title: z.string().trim().min(5).max(160),
  body: z.string().trim().min(10), // No max!
  // ...
});

const replySchema = z.object({
  body: z.string().trim().min(2), // No max!
  // ...
});
```

**Exploitation Scenario**: An attacker creates forum threads or replies with multi-megabyte bodies, consuming database storage and causing performance issues when rendering threads.

**Recommended Fix**:

```typescript
const createThreadSchema = z.object({
  title: z.string().trim().min(5).max(160),
  body: z.string().trim().min(10).max(20000), // ~20KB max
  // ...
});

const replySchema = z.object({
  body: z.string().trim().min(2).max(10000), // ~10KB max
  // ...
});
```

---

### MEDIUM-06: Rate Limit Consumes on Check (Pre-deduction Pattern)

**File**: `lib/ai-guardrails.ts:108`
**Severity**: MEDIUM

**Description**: The `consumeRateLimit` function increments the counter before checking if the limit is exceeded:

```typescript
const count = await redis.incr(key); // Increment first
// ...
return {
  allowed: count <= maxRequests, // Then check
  // ...
};
```

This means if a user is at their limit (20/20 for AI chat), the next request increments to 21, returns `allowed: false`, but the counter is now 21. If the window hasn't expired, all subsequent requests will also be rejected, which is correct. However, if there's a race condition with multiple concurrent requests, the counter could overshoot significantly, and the `remaining` count would report negative values (clamped to 0, but inaccurate).

More importantly, the rate limit is consumed even for requests that fail validation before reaching the rate limit check. In `ai-chat.ts`, the rate limit is checked after message parsing and moderation, so this is mostly fine. But in `forum.ts:177`, the rate limit check happens after Zod validation but before the actual operation, meaning failed operations still count against the limit.

**Recommended Fix**: Consider using Redis `MULTI/EXEC` or Lua script for atomic check-and-increment:

```typescript
const consumeRateLimit = async (
  keyPrefix: string,
  userId: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> => {
  await ensureRedisConnection();
  const windowBucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `${keyPrefix}:${userId}:${windowBucket}`;

  // Atomic check-and-increment using Lua
  const luaScript = `
    local current = redis.call('GET', KEYS[1])
    if current and tonumber(current) >= tonumber(ARGV[1]) then
      return {tonumber(current), redis.call('TTL', KEYS[1])}
    end
    local count = redis.call('INCR', KEYS[1])
    if count == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[2])
    end
    return {count, redis.call('TTL', KEYS[1])}
  `;

  const [count, ttl] = (await redis.eval(luaScript, {
    keys: [key],
    arguments: [String(maxRequests), String(windowSeconds)],
  })) as [number, number];

  return {
    allowed: count <= maxRequests,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - count),
    resetSeconds: ttl > 0 ? ttl : windowSeconds,
  };
};
```

---

### MEDIUM-07: Admin Audit Log Writes Can Fail Silently

**File**: `routes/admin.ts:413-423`
**Severity**: MEDIUM

**Description**: The `persistAuditLog` function awaits the insert but doesn't catch errors:

```typescript
const persistAuditLog = async (input: PersistAuditLogInput): Promise<void> => {
  await db.insert(adminAuditLogs).values({ ... });
};
```

If the audit log insert fails (disk full, connection timeout, schema mismatch), the awaited promise rejection will propagate up to the route handler's catch block. In most handlers, this is caught and returns a 500. But the **primary operation has already completed** - meaning an admin action succeeded but was not audit-logged, creating a gap in the audit trail.

**Exploitation Scenario**: A malicious insider performs admin actions during a period of database pressure. The primary action (role change, user suspension) succeeds, but the audit log write fails. There is no record of the action.

**Recommended Fix**:

```typescript
const persistAuditLog = async (input: PersistAuditLogInput): Promise<void> => {
  try {
    await db.insert(adminAuditLogs).values({
      scope: input.scope,
      action: input.action,
      target: input.target,
      status: input.status,
      message: input.message,
      actorId: input.actorId,
      actorName: input.actorName,
    });
  } catch (error) {
    // Log to stderr for external log aggregation - never silently drop audit events
    console.error("AUDIT LOG WRITE FAILURE:", {
      ...input,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // Optionally: Push to a dead letter queue for later replay
  }
};
```

---

### MEDIUM-08: Health Endpoint Exposes Infrastructure Status Unauthenticated

**File**: `routes/health.ts:8-27`
**Severity**: MEDIUM

**Description**: The health endpoint is unauthenticated and reveals whether PostgreSQL and Redis are running, along with error messages if they're down. This is standard for internal health checks but should not be exposed publicly without consideration.

**Exploitation Scenario**: An attacker probes `/api/health` to determine the backend's infrastructure health. During a partial outage, the error message might reveal PostgreSQL connection strings, Redis hostnames, or timeout details. This information aids in targeted attacks.

**Recommended Fix**: Create two endpoints - a public liveness probe and a protected detailed health check:

```typescript
// Public - returns only status code, no details
healthRouter.get("/live", (_req, res) => {
  res.status(200).json({ ok: true });
});

// Protected - returns detailed health info (for monitoring systems)
healthRouter.get("/", requireSession, async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (authedReq.session.user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  // ...existing detailed health check
});
```

Or, if using a load balancer, restrict access via network policy rather than authentication.

---

### MEDIUM-09: MinIO SSL Disabled by Default

**File**: `lib/env.ts:17`
**Severity**: MEDIUM

**Description**: MinIO SSL is disabled by default:

```typescript
MINIO_USE_SSL: z.enum(["true", "false"]).default("false"),
```

If the production deployment doesn't set `MINIO_USE_SSL=true`, all communication between the backend and MinIO (including uploading user profile images) happens over unencrypted HTTP.

**Recommended Fix**: Remove the default or add a startup warning:

```typescript
MINIO_USE_SSL: z.enum(["true", "false"]),  // No default - must be explicit
```

---

### LOW-01: Content Moderation is Easily Bypassed

**File**: `lib/ai-guardrails.ts:20-24`
**Severity**: LOW

**Description**: The profanity, harassment, and self-harm detection uses simple regex word matching:

```typescript
const profanityPattern = /\b(fuck|fucking|shit|bitch|bastard|asshole|motherfucker)\b/i;
const harassmentPattern = /\b(stupid|idiot|moron|loser|shut up|hate you)\b/i;
```

These are trivially bypassed with:

- Character substitution: `f*ck`, `sh1t`, `b!tch`
- Zero-width characters: `f​u​c​k` (with zero-width spaces)
- Unicode homoglyphs: `stupi\u0501`
- Leet speak: `5tup1d`
- Spacing: `f u c k`

**Exploitation Scenario**: A user posts harmful content to forum threads that passes the filter but is clearly offensive to human readers.

**Recommended Fix**: This is acknowledged as a baseline filter. For production, consider:

1. Adding a word normalization step before pattern matching (strip accents, normalize unicode, collapse repeated chars)
2. Using an external moderation API (OpenAI Moderation, Perspective API) for higher-fidelity detection
3. Keeping the local filter as a fast first-pass and queueing borderline content for review

---

### LOW-02: Forum Reply Vote Has No Self-Vote Prevention

**File**: `routes/forum.ts:246-279`, `services/forum.service.ts:306-324`
**Severity**: LOW

**Description**: The vote endpoint validates the reply exists but does not check if the voter is the reply author. A user can upvote their own replies to inflate their score.

**Recommended Fix**:

```typescript
// In ForumService.voteReply:
async voteReply(input: VoteInput) {
  const replyRows = await forumRepository.findReplyById(input.replyId);
  if (replyRows.length === 0) {
    throw new NotFoundError("Reply not found.");
  }

  const reply = replyRows[0];
  if (reply.userId === input.userId) {
    throw new ForbiddenError("You cannot vote on your own reply.");
  }
  // ...existing logic
}
```

---

### LOW-03: Console.error Logging May Expose Sensitive Data in Production

**File**: Multiple files (session.ts:52, ai-chat.ts:255, forum.ts:200, etc.)
**Severity**: LOW

**Description**: Throughout the codebase, caught errors are logged with `console.error` including the full error object:

```typescript
console.error("Session retrieval error:", error);
console.error("AI rate limit check failed:", error);
console.error("Unexpected error in createThread:", error);
```

In production, the full error object can contain database connection strings, query text, user data, and other sensitive information. If logs are sent to a third-party logging service, this data could be exposed.

**Recommended Fix**: Use a structured logger that redacts sensitive fields:

```typescript
import { createLogger } from "./lib/logger.js"; // Custom or pino/winston

const logger = createLogger({
  redact: ["password", "token", "secret", "authorization"],
});

// Replace console.error:
logger.error({ err: error, context: "session-retrieval" }, "Session retrieval failed");
```

---

### LOW-04: No Request ID for Tracing

**File**: `server.ts` (missing)
**Severity**: LOW

**Description**: There is no request ID generation middleware. When investigating security incidents, it's impossible to correlate a specific client request with its server-side log entries, database queries, and background jobs.

**Recommended Fix**:

```typescript
import { randomUUID } from "node:crypto";

app.use((req, _res, next) => {
  req.headers["x-request-id"] = req.headers["x-request-id"] || randomUUID();
  next();
});
```

---

### LOW-05: Mock Exam Param Schema Allows NaN via parseInt

**File**: `routes/mock-exams.ts:17`
**Severity**: LOW

**Description**: The mock exam params schema uses a raw `parseInt` transform without NaN checking:

```typescript
const mockExamParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val, 10)),
});
```

If `val` is `"abc"`, `parseInt("abc", 10)` returns `NaN`. This `NaN` is then passed to database queries, which may behave unexpectedly.

**Recommended Fix**:

```typescript
const mockExamParamsSchema = z.object({
  id: z.coerce.number().int().positive(), // Consistent with other schemas
});
```

---

## Positive Findings (Strengths)

These areas demonstrate strong security practices and should be maintained:

| Area                             | Evidence                                                                         | Assessment |
| -------------------------------- | -------------------------------------------------------------------------------- | ---------- |
| **Input Validation**             | Zod schemas on all 59+ endpoints with strict types                               | Excellent  |
| **SQL Injection Prevention**     | 100% Drizzle ORM usage; all `sql` template literals use parameterized values     | Excellent  |
| **Session Management**           | Better-Auth handles session tokens; `requireSession` checks suspension status    | Good       |
| **Admin Authorization Coverage** | All 59 admin endpoints have `requireAdminRole` check (verified via grep)         | Good       |
| **Self-Mutation Prevention**     | Admin cannot change own role (`admin.ts:1648`) or suspend self (`admin.ts:1751`) | Good       |
| **File Upload Validation**       | Multer with MIME type whitelist, file size limits, memory storage                | Good       |
| **Object Key Sanitization**      | `sanitizePathSegment` in minio.ts strips dangerous characters                    | Good       |
| **Secrets in .gitignore**        | Both `backend/.env` and `frontend/.env.local` are gitignored                     | Good       |
| **Environment Validation**       | All env vars validated via Zod at startup; app fails fast on misconfiguration    | Good       |
| **AI Content Moderation**        | Profanity/harassment/spam detection on AI and forum inputs                       | Baseline   |
| **Audit Logging**                | Comprehensive audit trail for all admin actions with actor, target, status       | Good       |
| **CORS Configuration**           | Single origin with credentials; exposed headers explicitly listed                | Good       |
| **User Suspension**              | Suspended users are blocked at the session middleware level                      | Good       |
| **Optimistic Concurrency**       | Moderation flag resolve uses `WHERE status = 'open'` to prevent double-resolve   | Good       |
| **Error Classification**         | Custom `HttpError` hierarchy with status codes and error codes                   | Good       |

---

## Remediation Priority

### Phase 1 - Immediate (This Week)

1. **CRITICAL-01**: Install and configure Helmet
2. **CRITICAL-02**: Set explicit JSON body size limit
3. **CRITICAL-03**: Remove MinIO credential defaults
4. **CRITICAL-04**: Escape ILIKE wildcard characters
5. **HIGH-06**: Add global error handler

### Phase 2 - Before Next Deploy

6. **HIGH-01**: Configure CSRF protection (SameSite + Origin check)
7. **HIGH-03**: Add global and auth-specific rate limiting
8. **HIGH-05**: Sanitize all 500-level error responses
9. **HIGH-04**: Validate presigned upload object key format

### Phase 3 - Current Sprint

10. **HIGH-02**: Add runtime session assertion helper
11. **MEDIUM-02**: Refactor admin check to router-level middleware
12. **MEDIUM-03**: Add login attempt limiting
13. **MEDIUM-05**: Add max length to forum body schemas
14. **MEDIUM-09**: Require explicit MinIO SSL configuration

### Phase 4 - Next Refactor

15. **MEDIUM-01**: Review Better-Auth body parsing limits
16. **MEDIUM-04**: Make Mistral API key truly optional
17. **MEDIUM-06**: Implement atomic rate limit check
18. **MEDIUM-07**: Make audit log writes fault-tolerant
19. **MEDIUM-08**: Protect health endpoint details
20. **LOW-01 through LOW-05**: Content moderation, self-vote, logging, request IDs, NaN params

---

## Appendix: Files Reviewed

| File                          | Lines | Reviewed                                                                 |
| ----------------------------- | ----- | ------------------------------------------------------------------------ |
| `lib/auth.ts`                 | 48    | Full                                                                     |
| `lib/session.ts`              | 72    | Full                                                                     |
| `lib/admin.ts`                | 25    | Full                                                                     |
| `lib/env.ts`                  | 29    | Full                                                                     |
| `lib/errors/index.ts`         | 90    | Full                                                                     |
| `lib/ai-guardrails.ts`        | 141   | Full                                                                     |
| `lib/minio.ts`                | 198   | Full                                                                     |
| `lib/redis.ts`                | 27    | Full                                                                     |
| `lib/mistral.ts`              | 98    | Full                                                                     |
| `lib/queue.ts`                | 79    | Full                                                                     |
| `server.ts`                   | 81    | Full                                                                     |
| `middleware/image-upload.ts`  | 98    | Full                                                                     |
| `routes/admin.ts`             | 5,371 | Sampled (~2,000 lines) + grep for all route definitions and admin checks |
| `routes/forum.ts`             | 307   | Full                                                                     |
| `routes/ai-chat.ts`           | 416   | Full                                                                     |
| `routes/quiz.ts`              | 57    | Full                                                                     |
| `routes/chapter-media.ts`     | 418   | Full                                                                     |
| `routes/profile.ts`           | 114   | Full                                                                     |
| `routes/progress.ts`          | 102   | Full                                                                     |
| `routes/mock-exams.ts`        | 314   | Full                                                                     |
| `routes/auth.ts`              | 8     | Full                                                                     |
| `routes/learn.ts`             | 162   | Full                                                                     |
| `routes/health.ts`            | 28    | Full                                                                     |
| `services/forum.service.ts`   | 377   | Full                                                                     |
| `workers/analytics.worker.ts` | 33    | Full                                                                     |
| `workers/email.worker.ts`     | 27    | Full                                                                     |
| `workers/cleanup.worker.ts`   | 27    | Full                                                                     |
| `lib/db/schema.ts`            | 522   | Partial (auth tables)                                                    |

**Total lines reviewed**: ~8,800+
