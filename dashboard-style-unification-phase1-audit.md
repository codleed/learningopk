# LearningoPK Dashboard Unification - Phase 1 Baseline Interaction Audit

Date: 2026-02-24  
Scope: `/`, `/login`, `/register`, `/forgot-password`, `/dashboard`, `/dashboard/[subject]`, `/<board>/<grade>/<subject>`, `/<board>/<grade>/<subject>/<chapter>?tab=summary|exercises|flashcards|quiz`, `/forum`, `/forum/[threadId]`, `/admin`, `/admin/content`, `/admin/forum`

Status legend: `working`, `broken`, `placeholder`

| Route | Interactive element | Current behavior | Status | Recommended fix |
| --- | --- | --- | --- | --- |
| Shared AppShell routes | Top nav links (`Home`, `Forum`, `Dashboard`, `Admin`) | Link navigation works; items are role/session gated | working | Keep as shared baseline for later route restyles |
| Shared AppShell guest state | Top nav auth actions (`Log in`, `Get started`) | Routes to `/login` and `/register` | working | No immediate change |
| `/` | `Start learning` CTA | Links to `/register` | working | No immediate change |
| `/` | `Browse forum` CTA | Links to `/forum` | working | No immediate change |
| `/login` | Sign-in form submit | Client validation + `authClient.signIn.email`; redirects to `/dashboard` on success | working | No immediate change |
| `/login` | `Forgot password?` link | Routes to `/forgot-password` | working | No immediate change |
| `/login` | `Create account` link | Routes to `/register` | working | No immediate change |
| `/register` | Register form submit | Client validation + `authClient.signUp.email`; redirects to `/dashboard` on success | working | No immediate change |
| `/register` | `Sign in` link | Routes to `/login` | working | No immediate change |
| `/forgot-password` | Reset request form submit | Posts to `/api/auth/forgot-password`, but errors are swallowed and UI still shows success | broken | Implement real reset flow backend endpoint/token email and surface non-200 failure states in dev mode |
| `/forgot-password` | `Send another request` button | Resets success state to show form again | working | No immediate change |
| `/forgot-password` | `Return to sign in` link | Routes to `/login` | working | No immediate change |
| `/dashboard` | Left rail icon buttons (`Home`, `Dashboard`, `Stats`, `Calendar`, `Messages`, `Settings`) | Rendered as buttons with no handlers/hrefs | placeholder | Wire to routes/actions or convert to semantic non-interactive elements until wired |
| `/dashboard` | Left rail `Log out shortcut` button | Button has no action | placeholder | Connect to existing sign-out flow (`authClient.signOut`) |
| `/dashboard` | Top search input | Visual input only; no state/filtering/submission | placeholder | Bind to real class/course filtering or remove interactivity styling for now |
| `/dashboard` | Notifications bell button | Button has no handler | placeholder | Connect to notification center or disable until implemented |
| `/dashboard` | Hero `Continue course` link | Navigates to first available learning route fallback | working | No immediate change |
| `/dashboard` | `Learning Screens` cards | Deep links to summary/exercises/quiz/ai query states when seeded chapter exists | working | No immediate change |
| `/dashboard` | `Filter by` button in courses panel | Button has no filter behavior | placeholder | Add filter modal/dropdown and query state integration |
| `/dashboard` | Subject cards | Link to `/dashboard/[subject]` | working | No immediate change |
| `/dashboard` | `Open first subject progress` link | Link to first ranked subject progress page | working | No immediate change |
| `/dashboard/[subject]` | `Back to dashboard` link | Routes to `/dashboard` | working | No immediate change |
| `/<board>/<grade>/<subject>` | `View dashboard` link | Routes to `/dashboard` | working | No immediate change |
| `/<board>/<grade>/<subject>` | Chapter cards | Link to chapter detail route | working | No immediate change |
| `/<board>/<grade>/<subject>/<chapter>?tab=*` | Tab links (`summary`, `exercises`, `flashcards`, `quiz`) | Route/query tab navigation works | working | No immediate change |
| `/<board>/<grade>/<subject>/<chapter>?tab=*` | Disabled quiz tab state | Renders non-clickable disabled chip when chapter has no quiz | working | No immediate change |
| `/<board>/<grade>/<subject>/<chapter>?tab=*` | `Back to subject` link | Routes to subject page | working | No immediate change |
| `/<board>/<grade>/<subject>/<chapter>?tab=exercises` | `Open AI Tutor` button | Seeds AI prompt in side panel | working | No immediate change |
| `/<board>/<grade>/<subject>/<chapter>?tab=exercises` | Exercise expand/collapse (`details`) | Expands content and tracks progress event | working | No immediate change |
| `/<board>/<grade>/<subject>/<chapter>?tab=exercises` | `Ask AI About This` button | Pushes exercise-specific prompt to AI panel | working | No immediate change |
| `/<board>/<grade>/<subject>/<chapter>?tab=exercises` | AI chat submit form | Posts stream request to `/api/ai/chat` and renders streaming output/errors | working | Add explicit UX for missing `MISTRAL_API_KEY` (503) if needed |
| `/<board>/<grade>/<subject>/<chapter>?tab=exercises` | `Start Fresh Session` button | Clears local AI session/message state | working | No immediate change |
| `/<board>/<grade>/<subject>/<chapter>?tab=flashcards` | Flashcard controls (`Show front/back`, `Mark known/review`, `Previous/Next`) | All controls work; status persisted in `localStorage` | working | No immediate change |
| `/<board>/<grade>/<subject>/<chapter>?tab=quiz` | Answer option buttons | Selects local answer state per question | working | No immediate change |
| `/<board>/<grade>/<subject>/<chapter>?tab=quiz` | Quiz `Previous/Next` question buttons | Navigates local question index | working | No immediate change |
| `/<board>/<grade>/<subject>/<chapter>?tab=quiz` | `Submit Quiz` button | Posts to `/api/quiz/submit`; returns result view on success | working | Add auth-redirect UX for 401 responses when user is logged out |
| `/<board>/<grade>/<subject>/<chapter>?tab=quiz` | `Retake Quiz` button | Resets quiz state for a new run | working | No immediate change |
| `/forum` | Thread creation form submit (`Post thread`) | Posts to `/api/forum/threads` and redirects to new thread | working | No immediate change |
| `/forum` | Thread form preview toggle (`Preview`/`Edit`) | Toggles markdown preview vs textarea | working | No immediate change |
| `/forum` | Forum filter form (`Apply filters`) | GET query filters feed results | working | No immediate change |
| `/forum` | `Reset` filter action | Navigates to `/forum` default feed | working | No immediate change |
| `/forum` | Thread cards | Link to `/forum/[threadId]` detail | working | No immediate change |
| `/forum` (guest) | `Sign in` prompt link for posting | Routes to `/login` | working | No immediate change |
| `/forum/[threadId]` | `Back to forum` link | Routes to `/forum` | working | No immediate change |
| `/forum/[threadId]` | Reply form submit (`Post reply`) | Posts to `/api/forum/threads/:id/replies` and refreshes thread | working | No immediate change |
| `/forum/[threadId]` | Reply preview toggle (`Preview`/`Edit`) | Toggles markdown preview vs textarea | working | No immediate change |
| `/forum/[threadId]` | Reply vote buttons (`Upvote`/`Downvote`) | Posts to `/api/forum/replies/:id/vote` and refreshes | working | No immediate change |
| `/forum/[threadId]` | `Mark accepted` button | Thread owner can post to `/api/forum/replies/:id/accept` | working | No immediate change |
| `/forum/[threadId]` (guest) | `Sign in` prompt link for replies | Routes to `/login` | working | No immediate change |
| `/admin` | `Open content controls` button/link | Routes to `/admin/content` | working | No immediate change |
| `/admin` | `Open forum moderation` button/link | Routes to `/admin/forum` | working | No immediate change |
| `/admin` (guard states) | Auth guard actions (`Log in`, `Go back`) | Gate messaging controls for unauth/unauthorized users | working | No immediate change |
| `/admin/content` | `Back to admin` link | Routes to `/admin` | working | No immediate change |
| `/admin/content` | `Publish`/`Unpublish` action + confirm dialog | Calls `/api/admin/content/chapters/:id/publish`; optimistic table update + toast | working | No immediate change |
| `/admin/content` | Chapter table data source | Built from `/api/forum/filters` published-only chapters; hidden chapters disappear after unpublish | broken | Add dedicated admin chapter list endpoint returning both published and unpublished chapters |
| `/admin/content` | Audit log panel | Local in-memory log only; resets on refresh | placeholder | Persist admin action log server-side and read paginated history |
| `/admin/forum` | `Back to admin` link | Routes to `/admin` | working | No immediate change |
| `/admin/forum` | `Pin`/`Unpin` action + confirm dialog | Calls `/api/admin/forum/threads/:threadId/pin`; optimistic table update + toast | working | No immediate change |
| `/admin/forum` | Audit log panel | Local in-memory log only; resets on refresh | placeholder | Persist moderation log server-side and read paginated history |

## Baseline Summary

- Broken controls: 2
- Placeholder controls: 7
- Working controls: remaining audited controls in scope
