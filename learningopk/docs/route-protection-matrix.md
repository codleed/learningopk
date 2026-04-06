# Route Protection Matrix

> Last updated: 2026-04-05 (TASK-58)

This document catalogues every frontend route, its protection level, and whether
it requires personalized (session-dependent) data during SSR.

## Protection Levels

| Level | Mechanism | Behaviour |
|---|---|---|
| **Public** | None | Accessible to everyone, no auth check |
| **Proxy-protected** | `proxy.ts` middleware | Redirects to `/login` before the page component runs |
| **Page-gated** | `getServerSession()` + `redirect("/login")` inside the page | Renders the page server component, checks session, redirects if absent |
| **Layout-gated** | `getServerSession()` + guard in a layout component | All child routes inherit the check from the shared layout |

## Student Routes

| Route | URL Pattern | Protection | SSR Personalized Data | Notes |
|---|---|---|---|---|
| Landing | `/` | Public | No | Marketing page |
| Login | `/login` | Public | No | Auth form |
| Register | `/register` | Public | No | Auth form |
| Dashboard | `/dashboard` | Proxy-protected + Page-gated | Yes (summary, subjects) | Double-protected: middleware redirects first, page also checks session |
| Dashboard Subject | `/dashboard/[subject]` | Proxy-protected + Page-gated | Yes (subject progress) | Uses cookies for progress API |
| Subjects List | `/subjects` | Page-gated | Yes (progress data) | Redirects to login if no session |
| Subject Redirect | `/subjects/[subject]` | Page-gated | Yes | Resolves slug to learn route |
| Subject Chapter Redirect | `/subjects/[subject]/[chapter]` | Page-gated | Yes | Resolves legacy slug to learn route |
| Stats | `/stats` | Proxy-protected + Page-gated | Yes (analytics data) | Double-protected |
| Settings | `/settings` | Page-gated | Yes (user profile) | Session required for profile data |
| Calendar | `/calendar` | Page-gated | Yes (progress data) | Session required for study calendar |
| AI Tutor | `/ai-tutor` | Page-gated | Yes (chat requires auth) | Redirects to login |
| Forum Feed | `/forum` | Public | Optional (session for compose) | Session checked but not required; anonymous users see full feed |
| Forum Thread | `/forum/[threadId]` | Public | Optional (viewerVoteType) | Session forwarded via cookies for personalized reply vote state |
| Past Papers | `/past-papers` | Page-gated | No (client fetches) | Redirects to login |
| Past Paper Solutions | `/past-papers/[id]/solutions` | Page-gated | No (client fetches) | Redirects to login |
| Design System Demo | `/design-system-demo` | Public | No | Dev-only page |

## Learn Routes (Public Content with Optional Personalization)

| Route | URL Pattern | Protection | SSR Personalized Data | Notes |
|---|---|---|---|---|
| Subject Overview | `/[board]/[grade]/[subject]` | Public | Optional | Board/grade gating for students (404 if mismatch), anonymous users see content |
| Chapter Detail | `/[board]/[grade]/[subject]/[chapter]` | Public | Optional (progress tracking) | Same board/grade gating for students |

## Admin Routes (Layout-Gated)

All admin routes are protected by the `admin/layout.tsx` layout which checks for an admin session via `isAdminSession()`. If the user is not an admin, the `AdminGuard` component renders an access-denied state.

| Route | URL Pattern | Protection | Notes |
|---|---|---|---|
| Admin Dashboard | `/admin` | Layout-gated (admin) | Overview KPIs |
| Content Management | `/admin/content/**` | Layout-gated (admin) | CRUD for boards, classes, subjects, chapters, quizzes, flashcards, exercises |
| Board CRUD | `/admin/boards/**` | Layout-gated (admin) | |
| Class CRUD | `/admin/classes/**` | Layout-gated (admin) | |
| Subject CRUD | `/admin/subjects/**` | Layout-gated (admin) | |
| Chapter CRUD | `/admin/chapters/**` | Layout-gated (admin) | |
| Users | `/admin/users` | Layout-gated (admin) | |
| Forum Moderation | `/admin/forum` | Layout-gated (admin) | |
| Community | `/admin/community` | Layout-gated (admin) | |
| Moderation | `/admin/moderation` | Layout-gated (admin) | |
| Analytics | `/admin/analytics` | Layout-gated (admin) | |
| Audit | `/admin/audit` | Layout-gated (admin) | |
| Notifications | `/admin/notifications` | Layout-gated (admin) | |
| Settings | `/admin/settings` | Layout-gated (admin) | |

## Proxy Middleware Configuration

**File:** `frontend/proxy.ts`

Protected prefixes:
- `/dashboard`
- `/stats`

Matcher: `/dashboard/:path*`, `/stats/:path*`

## Intentional Differences

1. **`/dashboard` and `/stats`** are double-protected (proxy + page-gate). The proxy middleware provides a fast redirect before the page component runs. The page-gate is a safety net in case middleware is bypassed.

2. **`/settings`, `/calendar`, `/subjects`** are page-gated only (no proxy). These are protected at the page level but not at the middleware level. This is intentional: the proxy middleware only covers the most latency-sensitive routes. Adding them to the proxy would be a minor optimization but is not required for correctness.

3. **`/forum` and `/forum/[threadId]`** are public with optional personalization. Anonymous users can browse threads. Authenticated users get personalized state (vote indicators, compose access). Cookies are forwarded during SSR for the thread detail page so `viewerVoteType` is correct on first render.

4. **Learn routes** (`/[board]/[grade]/[subject]/**`) are public but enforce board/grade constraints for authenticated students. A student whose profile says board=`federal` will get a 404 if they navigate to `/sindh/...`. Anonymous users can view any board's content.

5. **Admin routes** use layout-gated protection (not middleware). The `AdminGuard` component handles both unauthenticated and non-admin users. This is appropriate since admin routes are not high-traffic and the layout check provides clean UX.
