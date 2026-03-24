# Forum Feed Create Toggle and Incremental Loading Design

## Context
- The forum feed currently shows the create-thread form immediately for signed-in users, which crowds the page.
- The feed currently renders a fixed server-loaded set, so scrolling does not progressively load more threads.

## Goals
- Show a compact create-thread entry point for signed-in users and reveal the form only after interaction.
- Deliver an infinite-scroll style feed:
  - Initial load: 30 threads
  - Incremental load: 10 threads per scroll trigger

## Non-goals
- Changing forum thread ranking logic
- Adding cursor pagination
- Reworking forum filters UX

## UX Design
- Signed-in users see a `+` button above the feed.
- The create-thread form is hidden by default.
- Clicking `+` expands the form; clicking close collapses it.
- Guests keep the existing sign-in prompt and do not see a create-thread action.
- Feed loads 30 threads first; as the user nears the bottom, the next 10 threads append.

## Architecture
- Backend:
  - Extend `GET /api/forum/threads` query schema to accept `offset` (default `0`, min `0`).
  - Keep existing ordering and filtering; apply SQL `limit` + `offset`.
- Frontend data client:
  - Extend forum feed query type and URL builder to include `offset`.
- Forum route:
  - Server-render initial payload with `limit: 30`.
  - Pass initial threads and selected filters to a client feed component.
- Client feed component:
  - Uses `IntersectionObserver` with a sentinel to trigger `getForumThreads` calls.
  - Appends de-duplicated thread results.
  - Stops loading when returned batch size is less than page size (`10`).

## Error Handling
- Preserve existing page-level load error behavior for initial SSR fetch.
- For incremental fetch failures:
  - Show a compact inline error message below the list.
  - Keep existing loaded threads visible.
  - Allow automatic retry on next intersection event.

## Testing Strategy
- Update E2E forum post flow to assert:
  - Create form is hidden by default.
  - User must click create button to reveal form.
- Run type checks for frontend and backend to validate new query shape usage.

## Rollout Risk
- Low risk: additive API query parameter and isolated UI state changes.
- Main risk area is duplicate or repeated load calls from observer events, mitigated by `isLoading` and `hasMore` guards.
