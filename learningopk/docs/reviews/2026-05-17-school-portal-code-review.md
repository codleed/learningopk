# Code Review: School Portal Feature (`feature/school-portal`)

**Branch:** `feature/school-portal`
**Reviewer:** OpenCode (AI Reviewer)
**Date:** 2026-05-17
**Scope:** Ultra-Lean School Portal (Approach A)

---

## Executive Summary

The implementation successfully delivers the core school portal functionality for B2B demos. The code follows existing patterns and TypeScript passes cleanly. However, there are **2 critical issues**, **3 important issues**, and **5 minor issues** that should be addressed before pitching to schools.

---

## Critical Issues (Fix Before Demo)

### 1. Invite Code Collision Risk — `backend/src/routes/schools.ts:120`

**Problem:**

```typescript
const inviteCode = "LPK-" + Math.random().toString(36).slice(2, 8).toUpperCase();
```

`Math.random()` is not cryptographically secure and produces only ~6 characters of entropy (36^6 ≈ 2 billion combinations). With the birthday paradox, collisions become likely after just ~47,000 schools. The `create-school.ts` script has the same issue.

**Impact:** Two schools could get the same invite code. A student joining with that code would be assigned to the wrong school.

**Fix:**

```typescript
import { randomBytes } from "node:crypto";

const inviteCode = "LPK-" + randomBytes(4).toString("hex").toUpperCase(); // 8 hex chars = 4.2B combinations
```

**Also fix in:** `backend/scripts/create-school.ts:14`

---

### 2. Double Dashboard Fetch — Frontend Performance Issue

**Problem:**
`frontend/app/school/layout.tsx:10` calls `getSchoolDashboard()` to check if the user is a school admin. Then `frontend/app/school/page.tsx:5` calls `getSchoolDashboard()` again to get the data. This results in **two identical API calls** on every `/school` page load.

**Impact:** Unnecessary backend load and slower page renders.

**Fix:** Pass dashboard data from layout to page via React context, or use a single fetch in the layout and pass it as children prop. For Approach A simplicity, move the fetch to `page.tsx` and remove it from `layout.tsx`:

```typescript
// layout.tsx — simplified
export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");
  // Don't fetch dashboard here — let page.tsx handle it
  return <>{children}</>;
}

// page.tsx — add the admin check
export default async function SchoolPage() {
  const dashboard = await getSchoolDashboard();
  if (!dashboard) redirect("/dashboard"); // Redirect non-admins
  return <SchoolDashboardClient initialData={dashboard} />;
}
```

---

## Important Issues (Fix Soon)

### 3. No Transaction in Join Endpoint — `backend/src/routes/schools.ts:50-52`

**Problem:**

```typescript
await schoolRepository.assignUserToSchool(userId, school.id);
await schoolRepository.updateStudentCount(school.id);
```

If the server crashes between these two calls, the student count will be incorrect.

**Impact:** Stale `studentCount` in the database. Not critical for a demo, but bad data hygiene.

**Fix:** Wrap in a Drizzle transaction:

```typescript
await db.transaction(async (tx) => {
  await tx.update(users).set({ schoolId: school.id }).where(eq(users.id, userId));
  const countResult = await tx
    .select({ count: count() })
    .from(users)
    .where(
      and(eq(users.schoolId, school.id), eq(users.role, "student"), eq(users.status, "active"))
    );
  await tx
    .update(schools)
    .set({ studentCount: countResult[0]?.count ?? 0 })
    .where(eq(schools.id, school.id));
});
```

---

### 4. Weak Areas Show Raw Chapter IDs — `frontend/src/components/school/school-dashboard-client.tsx:64`

**Problem:**

```tsx
<span>Chapter ID {area.chapterId}</span>
```

Principals will see "Chapter ID 42" instead of "Kinematics" or "Atomic Structure". This makes the feature nearly useless in a demo.

**Impact:** Demo-killer. A principal won't understand what "Chapter ID 42" means.

**Fix:** The backend should join with the `chapters` table to get chapter titles. Update `getWeakAreas` in the repository:

```typescript
async getWeakAreas(schoolId: number) {
  return db
    .select({
      chapterId: userProgress.chapterId,
      chapterTitle: chapters.title, // Add this
      avgScore: sql<number>`coalesce(avg(${userProgress.quizBestScore}), 0)::int`,
      studentCount: count(),
    })
    .from(userProgress)
    .innerJoin(users, eq(userProgress.userId, users.id))
    .innerJoin(chapters, eq(userProgress.chapterId, chapters.id)) // Add this
    .where(and(eq(users.schoolId, schoolId), eq(users.role, "student")))
    .groupBy(userProgress.chapterId, chapters.title) // Update this
    .having(sql`count(*) > 0`)
    .orderBy(sql`coalesce(avg(${userProgress.quizBestScore}), 0)::int`);
}
```

Then update the frontend to display `area.chapterTitle`.

---

### 5. No Rate Limiting on Join Endpoint — `backend/src/routes/schools.ts:33`

**Problem:** The `/api/schools/join` endpoint has no rate limiting. A malicious actor could brute-force invite codes.

**Impact:** Low for demo (small scale), but should be fixed before production.

**Fix:** Add a simple rate limiter or at minimum a CAPTCHA requirement. For now, add a Redis-based rate limit:

```typescript
import { rateLimitByKey } from "../lib/rate-limit.js"; // or similar

// In the route handler:
const allowed = await rateLimitByKey(`join:${userId}`, 5, 60); // 5 attempts per minute
if (!allowed) {
  res.status(429).json(errorResponse("Too many attempts", "RATE_LIMITED"));
  return;
}
```

---

## Minor Issues

### 6. Unused Import — `backend/src/repositories/school.repository.ts:1`

**Problem:** `avg` is imported from `drizzle-orm` but never used (line 56 uses raw `sql` instead).

**Fix:** Remove `avg` from the import.

---

### 7. Users Can Join Multiple Schools — `backend/src/routes/schools.ts:33`

**Problem:** The join endpoint doesn't check if the user is already in a school. They could switch schools freely.

**Impact:** A student could accidentally join the wrong school and need manual intervention to fix.

**Fix:** Add a check:

```typescript
const userRows = await db
  .select({ schoolId: users.schoolId })
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
if (userRows[0]?.schoolId) {
  res.status(400).json(errorResponse("You are already in a school", "ALREADY_IN_SCHOOL"));
  return;
}
```

---

### 8. School Nav Visible to All Students — `frontend/src/components/foundation/left-rail/left-rail-config.ts:42`

**Problem:** The "School" nav item is shown to ALL students. Non-admin students who click it get redirected to `/dashboard`, which is jarring.

**Impact:** Minor UX confusion. Students might wonder why there's a School link they can't access.

**Fix (optional for Approach A):** Conditionally show the nav item based on whether the user is a school admin. This requires either:

- A client-side fetch to check admin status
- Or passing an `isSchoolAdmin` flag in the session

For the demo, the current behavior is acceptable, but consider hiding it from non-admins in Phase 2.

---

### 9. No Board Validation — `backend/src/routes/schools.ts:102`

**Problem:** The school creation endpoint accepts any string for `board`. Typos like "punjb" or "Punjab" (capitalized) would create inconsistent data.

**Fix:** Validate against known boards:

```typescript
const createBodySchema = z.object({
  name: z.string().min(2).max(120),
  board: z.enum(["federal", "punjab", "sindh"]),
  adminUserId: z.string().optional(),
});
```

---

### 10. Missing Error Handling in Layout — `frontend/app/school/layout.tsx:10`

**Problem:** `getSchoolDashboard()` can throw if the backend is unreachable. The layout doesn't catch this, resulting in a 500 error page.

**Fix:** Wrap in try-catch:

```typescript
let dashboard = null;
try {
  dashboard = await getSchoolDashboard();
} catch {
  // Backend unreachable — treat as not an admin
}
if (!dashboard) redirect("/dashboard");
```

---

## Positive Findings

1. **TypeScript strict mode passes** on both frontend and backend with zero errors from new code.
2. **Consistent patterns** — follows existing repository, route, and API client patterns perfectly.
3. **Proper auth guards** — `requireSession` and `requireAdminRole` used correctly.
4. **Zod validation** on all API inputs.
5. **Clean separation** — repository for DB, service layer avoided (YAGNI), routes for HTTP.
6. **Frontend uses existing UI components** — no custom styling drift.
7. **Leaderboard integration** is seamless — existing "school" scope now filters by real school ID.

---

## Recommendations

### For Demo (This Week)

1. **Fix Critical #1** (invite code collision) — 2 minutes, prevents embarrassing demo failures
2. **Fix Important #4** (chapter names in weak areas) — 10 minutes, makes the demo compelling
3. **Fix Minor #6** (unused import) — 30 seconds, keeps code clean

### For Production (Next Sprint)

1. Fix Critical #2 (double fetch)
2. Fix Important #3 (transaction in join)
3. Fix Important #5 (rate limiting)
4. Fix Minor #7 (prevent joining multiple schools)
5. Fix Minor #8 (hide School nav from non-admins)
6. Fix Minor #9 (board validation)
7. Fix Minor #10 (layout error handling)
8. Add tests for school routes and repository methods

---

## Risk Assessment

| Risk                          | Likelihood | Impact | Mitigation |
| ----------------------------- | ---------- | ------ | ---------- |
| Invite code collision         | Medium     | High   | Fix #1     |
| Stale student count           | Low        | Low    | Fix #3     |
| Brute force invite codes      | Low        | Medium | Fix #5     |
| Bad demo UX (raw chapter IDs) | High       | High   | Fix #4     |
| Double API call               | High       | Low    | Fix #2     |

**Overall:** The feature is demo-ready with 2 quick fixes. The architecture is sound and production-ready after addressing the important issues.
