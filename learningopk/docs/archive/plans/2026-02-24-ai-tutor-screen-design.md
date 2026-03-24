# AI Tutor Screen Design

## Context
- The product already has an AI tutoring endpoint (`POST /api/ai/chat`) and chapter-level AI chat panel.
- There is no dedicated, general-purpose AI Tutor screen in primary navigation.
- User request: add a new screen similar to ChatGPT, named `AI Tutor`, and show it in the left rail for signed-in users only.

## Goals
- Add a protected `/ai-tutor` route for authenticated users.
- Add `AI Tutor` to left rail primary navigation.
- Deliver a chat-first page layout with a clear conversation area and bottom composer.
- Reuse existing AI backend endpoint without adding new backend APIs.

## Non-goals
- No conversation history sidebar/list in this MVP.
- No rename/delete chat sessions.
- No backend schema or route changes.

## UX
- Route: `/ai-tutor`
- Guests: redirected to `/login`
- Signed-in users:
  - See a dashboard chrome header:
    - Eyebrow: `AI`
    - Title: `AI Tutor`
    - Subtitle: general tutoring guidance
  - Main chat surface with:
    - Scrollable message timeline
    - Empty state prompt when no messages
    - Inline error display for failed requests
    - Sticky bottom composer with textarea and send button
    - `New chat` action to clear the local conversation state

## Architecture
- Keep backend unchanged; use existing `/api/ai/chat` contract.
- Create a dedicated client component for full-page chat UX:
  - `frontend/components/ai/ai-tutor-chat.tsx`
- Add page route:
  - `frontend/app/ai-tutor/page.tsx`
- Add route loading/error boundaries:
  - `frontend/app/ai-tutor/loading.tsx`
  - `frontend/app/ai-tutor/error.tsx`
- Update left rail with `AI Tutor` link and active-state matcher.
- Update dashboard chrome route type union to allow `/ai-tutor`.

## Data Flow
1. User submits prompt.
2. UI appends user message + pending assistant bubble.
3. Client calls `POST /api/ai/chat` with:
   - `messages` (conversation transcript)
   - `sessionId` when available
   - no `chapterId` for general tutor mode
4. Stream response text into assistant bubble.
5. Persist returned session id from response headers/body where available.

## Error Handling
- AI response/network errors:
  - keep existing messages visible
  - remove pending assistant placeholder
  - display concise inline error

## Testing Strategy
- E2E coverage update:
  - Left rail includes `AI Tutor` for authenticated user.
  - Authenticated navigation to `/ai-tutor` renders heading and composer controls.
- Verification commands:
  - `pnpm --filter frontend typecheck`
  - `pnpm --filter frontend lint`
  - targeted Playwright spec(s) when environment permits.
