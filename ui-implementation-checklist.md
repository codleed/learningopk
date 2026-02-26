# 12. UI Design and Frontend Implementation Checklist

Use this checklist as the UI execution source of truth.
Follow item order unless marked parallel-safe.

Effort scale:

- S: 0.5-1 day
- M: 1-2 days
- L: 3-4 days

## 12.0 Screen Inventory (Build Targets)

The following screens should be designed and implemented.

### Public and Auth

- `/` Landing page
- `/login` Login
- `/register` Register
- `/forgot-password` Forgot password

### Learning Flow (Investor Demo Critical)

- `/[board]/[grade]/[subject]` Subject overview and chapter list
- `/[board]/[grade]/[subject]/[chapter]?tab=summary` Chapter summary
- `/[board]/[grade]/[subject]/[chapter]?tab=exercises` Chapter exercises + AI entry points
- `/[board]/[grade]/[subject]/[chapter]?tab=flashcards` Flashcards
- `/[board]/[grade]/[subject]/[chapter]?tab=quiz` Quiz and results

### Progress

- `/dashboard` Dashboard summary
- `/dashboard/[subject]` Subject progress detail

### Community

- `/forum` Forum feed (filters + thread creation for authenticated users)
- `/forum/[threadId]` Thread detail with replies/votes/accepted answer

### Admin (Required by product docs)

- `/admin` Admin dashboard shell
- `/admin/content` Content publishing/unpublishing and chapter visibility
- `/admin/forum` Forum moderation and thread pin/unpin tools

## 12.1 Component Inventory (Design System + Features)

The following component groups should be created and reused across screens.

### Foundation Components

- `AppShell` (layout wrapper with responsive spacing)
- `TopNav` (navigation + auth state)
- `PageHeader` (title/subtitle/actions)
- `SectionCard` (consistent card UI)
- `Tabs` (chapter tabs and section navigation)
- `Badge` and `StatusPill`
- `Button` variants (primary/secondary/ghost/danger)
- `Input`, `Textarea`, `Select`, `Checkbox`
- `EmptyState`, `ErrorState`, `LoadingSkeleton`
- `ConfirmDialog` and `Toast`

### Auth Components

- `LoginForm`
- `RegisterForm`
- `ForgotPasswordForm`
- `AuthGuardMessage` (session/permission messaging)

### Learning Components

- `SubjectHeader`
- `ChapterCard`
- `ChapterProgressTracker`
- `MarkdownMathRenderer` (Markdown + KaTeX)
- `ExerciseAccordion`
- `ExerciseItem`
- `ExerciseSolutionPanel`
- `AskAiButton`
- `AIChatPanel` (streaming, reset session)
- `FlashcardDeck`
- `FlashcardCard`
- `QuizRunner`
- `QuizQuestionCard`
- `QuizTimer`
- `QuizResultSummary`
- `QuizQuestionReviewList`

### Dashboard Components

- `WelcomeCard`
- `StreakCard`
- `WeeklyActivityHeatmap`
- `SubjectProgressCard`
- `RecentActivityFeed`
- `SubjectProgressTable`

### Forum Components

- `ForumFilterBar`
- `ForumThreadForm`
- `ForumThreadList`
- `ForumThreadCard`
- `ForumThreadHeader`
- `ForumReplyList`
- `ForumReplyForm`
- `ForumReplyActions` (vote/accept)

### Admin Components

- `AdminGuard`
- `ChapterPublishTable`
- `ChapterPublishToggle`
- `ForumModerationTable`
- `ThreadPinToggle`
- `AdminAuditLogList`

## 12.2 UI Foundations

- [ ] `UIF-01` Define design tokens (color, spacing, radius, typography, elevation, states) in `frontend/app/globals.css`.  
  Depends on: none  
  Effort: S  
  Done when: tokens exist and all new UI uses tokenized values.

- [ ] `UIF-02` Create reusable foundation components (`AppShell`, `PageHeader`, `SectionCard`, base controls, states).  
  Depends on: `UIF-01`  
  Effort: M  
  Done when: auth, learn, dashboard, and forum pages consume shared foundations.

- [ ] `UIF-03` Define responsive rules (mobile/tablet/desktop) and shared layout primitives.  
  Depends on: `UIF-02`  
  Effort: S  
  Done when: no horizontal overflow and all primary screens are usable on mobile.

## 12.3 Auth Screens

- [ ] `AUI-01` Design and implement `/login` and `/register` with consistent visual structure and validation states.  
  Depends on: `UIF-02`  
  Effort: S  
  Done when: both flows have clear success/error feedback and match shared auth styling.

- [ ] `AUI-02` Design and implement `/forgot-password` screen and empty/success states.  
  Depends on: `AUI-01`  
  Effort: S  
  Done when: the screen is visually complete and aligned with auth flow.

## 12.4 Learning Screens

- [ ] `LUI-01` Design and refine subject overview screen (`/[board]/[grade]/[subject]`) with chapter cards and progress affordances.  
  Depends on: `UIF-02`  
  Effort: S  
  Done when: chapter list hierarchy is clear and actionable.

- [ ] `LUI-02` Design chapter shell and tab navigation for summary/exercises/flashcards/quiz.  
  Depends on: `LUI-01`  
  Effort: S  
  Done when: chapter route has stable, reusable tabbed layout.

- [ ] `LUI-03` Design Summary and Exercises tabs (markdown readability, formula readability, exercise expansion pattern).  
  Depends on: `LUI-02`  
  Effort: M  
  Done when: dense educational content remains readable and scannable.

- [ ] `LUI-04` Design Flashcards tab interactions and progress states.  
  Depends on: `LUI-02`  
  Effort: S  
  Done when: review flow is intuitive on both desktop and mobile.

- [ ] `LUI-05` Design Quiz tab and results views (timer, question navigation, score review).  
  Depends on: `LUI-02`  
  Effort: M  
  Done when: quiz taking and post-submit review are visually distinct and clear.

- [ ] `LUI-06` Design AI chat panel UX (open/close, streaming states, failure states, reset session action).  
  Depends on: `LUI-03`  
  Effort: M  
  Done when: AI assistance feels integrated into exercise workflow.

## 12.5 Dashboard Screens

- [ ] `DUI-01` Design `/dashboard` summary (welcome, streak, heatmap, subject cards, recent activity).  
  Depends on: `UIF-02`  
  Effort: M  
  Done when: students can understand status in under 10 seconds.

- [ ] `DUI-02` Design `/dashboard/[subject]` table view with status color semantics (green/yellow/grey).  
  Depends on: `DUI-01`  
  Effort: S  
  Done when: chapter progress and performance trends are easy to compare.

## 12.6 Forum Screens

- [ ] `FUI-01` Design `/forum` feed screen (filters, search, create-thread area, thread cards).  
  Depends on: `UIF-02`  
  Effort: M  
  Done when: users can browse/filter/create with minimal friction.

- [ ] `FUI-02` Design `/forum/[threadId]` detail screen (reply tree, vote actions, accept-answer controls).  
  Depends on: `FUI-01`  
  Effort: M  
  Done when: thread readability and interaction hierarchy are clear.

## 12.7 Admin Screens

- [ ] `ADM-01` Design admin shell and permissions UX for `/admin`.  
  Depends on: `UIF-02`, `AUI-01`  
  Effort: S  
  Done when: non-admin users receive clear access messaging and admins get a consistent control panel.

- [ ] `ADM-02` Design `/admin/content` workflows for publish/unpublish and chapter visibility controls.  
  Depends on: `ADM-01`  
  Effort: S  
  Done when: chapter moderation actions are one-click and auditable in UI.

- [ ] `ADM-03` Design `/admin/forum` workflows for pin/unpin and moderation queues.  
  Depends on: `ADM-01`, `FUI-01`  
  Effort: S  
  Done when: forum moderation operations are efficient and low-risk.

## 12.8 Accessibility and UI Quality Gates

- [ ] `QAU-01` Add accessibility pass for labels, keyboard navigation, focus states, and contrast.  
  Depends on: `AUI-02`, `LUI-06`, `DUI-02`, `FUI-02`, `ADM-03`  
  Effort: M  
  Done when: all primary interactions are keyboard accessible and readable.

- [ ] `QAU-02` Add screen-level loading/error/empty states for all primary routes.  
  Depends on: `UIF-02`  
  Effort: S  
  Done when: no route falls back to raw/unhandled errors.

- [ ] `QAU-03` Add visual regression smoke checks for critical screens (auth, chapter, dashboard, forum).  
  Depends on: `QAU-02`  
  Effort: S  
  Done when: major layout breakages are detectable in CI/local.

## 12.9 MVP Completion Gate (UI)

- [ ] `REL-UI-01` Verify investor demo UI journey:
  register -> chapter summary/exercises -> quiz -> AI chat -> dashboard.  
  Depends on: `LUI-06`, `DUI-01`, `QAU-02`  
  Effort: S  
  Done when: journey is coherent, responsive, and visually production-ready without manual tweaks.
