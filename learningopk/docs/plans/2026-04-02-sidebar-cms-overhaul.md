# Sidebar & Content Management System Overhaul

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix sidebar content overlap across all viewports, build a rich media-enabled CMS for chapter summaries, and produce a backend architecture review ADR.

**Architecture:** The LeftRail (foundation system) uses `position: fixed` but the main content in AuthLayoutWrapper uses `flex-1` without accounting for the sidebar width, causing overlap. Fix: add a spacer div or margin-left matching the sidebar width. The old layout system (components/layout/) is dead code and should be removed. CMS upgrade adds Tiptap editor with MinIO-backed media uploads using presigned URLs.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Tiptap, MinIO, Express 5, Drizzle ORM, sharp (image optimization)

---

## Phase 1: Frontend Architecture & UX Fixes

### Task 1: Fix Sidebar Content Overlap in AuthLayoutWrapper

**Files:**

- Modify: `frontend/src/components/foundation/auth-layout-wrapper.tsx`
- Modify: `frontend/src/components/foundation/left-rail.tsx`

**Problem:** `LeftRail` is `position: fixed` at 72px wide (collapsed), but `AuthLayoutWrapper` uses flex layout where main content doesn't reserve space for the fixed sidebar.

**Step 1: Add sidebar spacer in AuthLayoutWrapper**

In `auth-layout-wrapper.tsx`, add a spacer `<div>` before the main content that matches the LeftRail collapsed width (72px on desktop, 0 on mobile). The spacer ensures the flex layout reserves space.

```tsx
// auth-layout-wrapper.tsx - inside the flex container, before <main>
{
  /* Sidebar spacer - reserves space for the fixed LeftRail */
}
<div
  className="hidden md:block shrink-0 transition-[width] duration-300 ease-in-out"
  style={{ width: 72 }}
  aria-hidden="true"
/>;
```

**Step 2: Verify no content overlap on desktop and mobile**

### Task 2: Ensure Header Doesn't Overlap Sidebar

**Files:**

- Verify: `frontend/src/components/foundation/left-rail.tsx` (z-index 40)
- Verify: All pages using `AppShell` have proper content margins

**Step 1:** Confirm sticky headers in pages (e.g., chapter-manage-client.tsx tab bar with `sticky top-0 z-10`) don't conflict with sidebar z-index (40).

### Task 3: Remove Dead Layout System

**Files:**

- Delete: `frontend/src/components/layout/app-sidebar.tsx`
- Delete: `frontend/src/components/layout/app-layout.tsx`
- Delete: `frontend/src/components/layout/app-header.tsx`
- Keep: `frontend/src/components/layout/page-container.tsx` (still used)

**Step 1:** Verify `AppLayout`, `AppSidebar`, `AppHeader` from layout/ are not imported anywhere.
**Step 2:** Delete the dead files.
**Step 3:** Verify build passes.

### Task 4: Improve Mobile Sidebar Behavior

**Files:**

- Modify: `frontend/src/components/foundation/left-rail.tsx`

**Step 1:** Ensure mobile hamburger button doesn't overlap page content. Currently fixed at `top-4 left-4 z-50` which may conflict with breadcrumbs.
**Step 2:** Add proper padding-top to mobile content area to account for hamburger button.

---

## Phase 2: Content Management System Redesign

### Task 5: Install Tiptap Dependencies

**Step 1:** Install tiptap packages in frontend:

```bash
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-placeholder @tiptap/extension-code-block-lowlight @tiptap/extension-link @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-highlight @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-youtube @tiptap/pm lowlight
```

### Task 6: Build Tiptap Rich Text Editor Component

**Files:**

- Create: `frontend/src/components/admin/rich-text-editor.tsx`
- Create: `frontend/src/components/admin/editor-toolbar.tsx`

**Step 1:** Build a Tiptap editor with markdown input/output support.
**Step 2:** Add toolbar with: Bold, Italic, Underline, Headings, Lists, Code blocks, Links, Image insertion, Table, Math (LaTeX).
**Step 3:** Support paste-to-upload images (triggers media upload).
**Step 4:** Add auto-save with debounce.

### Task 7: Build Media Upload Component

**Files:**

- Create: `frontend/src/components/admin/media-upload.tsx`
- Create: `frontend/src/components/admin/media-library.tsx`

**Step 1:** Build drag-and-drop upload zone using native HTML5 drag API.
**Step 2:** Support multi-file upload with progress indicators per file.
**Step 3:** Show image preview thumbnails after upload.
**Step 4:** Build media library panel showing all uploaded media for a chapter.
**Step 5:** Allow clicking media in library to insert markdown reference into editor.

### Task 8: Backend - Presigned URL Upload Endpoint

**Files:**

- Modify: `backend/src/routes/chapter-media.ts`
- Modify: `backend/src/lib/minio.ts`

**Step 1:** Add presigned URL generation endpoint:

```
POST /api/admin/content/chapters/:chapterId/presigned-upload
Body: { fileName, mimeType, fileSize }
Response: { uploadUrl, objectKey, publicUrl }
```

**Step 2:** Add image optimization endpoint (post-upload webhook or on-demand):

- Use sharp for WebP conversion
- Generate responsive sizes (thumbnail, medium, full)

**Step 3:** Add media listing endpoint:

```
GET /api/admin/content/chapters/:chapterId/media
Response: { media: [...] }
```

**Step 4:** Add media deletion endpoint:

```
DELETE /api/admin/content/chapters/:chapterId/media/:mediaId
```

### Task 9: Integrate Rich Editor into Chapter Management

**Files:**

- Modify: `frontend/app/admin/content/chapters/[id]/manage/chapter-manage-client.tsx`

**Step 1:** Replace `CodeMirrorMarkdownEditor` with new Tiptap `RichTextEditor`.
**Step 2:** Wire up media upload to the editor (image button + paste handler).
**Step 3:** Add media library sidebar/panel.
**Step 4:** Maintain backward compatibility with existing markdown content.

---

## Phase 3: Backend Architecture Review

### Task 10: Produce Architecture Decision Record (ADR)

**Files:**

- Create: `docs/architectural-decisions/ADR-sidebar-cms-overhaul.md`

**Review Areas:**

1. Database: Schema design audit, missing indexes, query patterns
2. Authentication: Better-Auth config, session handling, rate limiting
3. API Design: Route organization (admin.ts monolith), response standardization
4. File Handling: Current MinIO setup, presigned URL pattern, CDN strategy
5. Caching: Redis patterns, TTL strategy, cache invalidation
6. Background Jobs: BullMQ design, worker reliability, dead-letter queues
7. Monitoring: Logging gaps, error tracking needs
8. Testing: Coverage gaps, missing integration tests

**Output:** Priority-ranked improvement plan with effort estimates.
