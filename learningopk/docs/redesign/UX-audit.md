# LearningoPK UX Audit & Redesign

## Date

2026-03-25

## Auditor

UX Architecture Review

---

## User Journey Maps

### 1. New User Journey: Landing → First Learning

```
[Landing Page]
    ↓ (Register or Login)
[(auth)/login] → [(auth)/register]
    ↓ (Success)
[(dashboard)/dashboard] ← "Welcome to LearningoPK!"
    ↓ (Select Board)
[(dashboard)/subjects]
    ↓ (Select Subject)
[(dashboard)/subjects/[subject]]
    ↓ (Select Chapter)
[(learn)/[board]/[grade]/[subject]/[chapter]]
    ↓ (Start Learning)
```

**Issues Found:**

- No clear "getting started" flow for new users
- Dashboard shows empty state without guidance
- Subject selection is a separate route instead of nested navigation

### 2. Learning Flow: Subject → Chapter → Quiz

```
[(dashboard)/dashboard]
    ↓
[(dashboard)/subjects/[subject]]
    ↓ [Select Chapter]
[(dashboard)/subjects/[subject]/[chapter]]
    ↓ [Exercises]
[chapter-exercises-with-ai]
    ↓ [Ask AI]
[ai-chat-panel] (inline)
    ↓ [Take Quiz]
[quiz-runner]
    ↓ [Complete]
[quiz-result-summary]
```

**Issues Found:**

- Multiple ways to reach same content (dashboard/subjects AND learn routes)
- AI chat is hidden inside exercise accordion
- Quiz flow doesn't save progress on exit

### 3. AI Tutor Flow

```
[Any Context - Ask AI Button]
    ↓
[ai-tutor/page.tsx] OR [inline ai-chat-panel]
    ↓ (Ask Question)
[AI Response with Socratic follow-up]
    ↓ (Continue)
[Conversation Thread]
    ↓ (Resolve)
[Return to previous context]
```

**Issues Found:**

- AI Tutor is a separate page AND inline panel - inconsistent
- No way to tell if AI is available
- Conversation history not persisted across sessions

### 4. Forum Flow

```
[(dashboard)/dashboard]
    ↓
[forum/page.tsx] ← Forum landing
    ↓ [Select Thread]
[forum/[threadId]/page.tsx]
    ↓ [Reply] or [Create New]
[New Thread Modal] or [Reply Form]
    ↓
[forum/page.tsx] or [stay on thread]
```

**Issues Found:**

- Forum has no connection to learning content (can't reference a chapter)
- Create thread is a modal, not a dedicated page
- No search within forum

### 5. Social/Friends Flow

```
[(dashboard)/dashboard]
    ↓
[(dashboard)/friends/page.tsx]
    ↓
- [Search Users] → [Send Friend Request]
- [Pending Requests] → [Accept/Decline]
- [Friends List] → [Chat]

[(dashboard)/messages/page.tsx] ← Conversation list
    ↓ [Select Conversation]
[(dashboard)/messages/[conversationId]/page.tsx] ← Chat view
```

**Issues Found:**

- Friend search results show minimal info
- Chat is disconnected from forum (different contexts)
- No online/offline indicators

---

## Screen State Matrix

| View          | Empty State                             | Loading State            | Error State                 | Success State              | Edge Cases                      |
| ------------- | --------------------------------------- | ------------------------ | --------------------------- | -------------------------- | ------------------------------- |
| Dashboard     | "Start by selecting a subject" with CTA | Skeleton cards           | "Failed to load" + retry    | Weekly progress shown      | Zero activity, streak at 0      |
| Subjects List | "No subjects available"                 | Skeleton list            | "Couldn't load subjects"    | Subject grid with progress | Subjects without chapters       |
| Chapter       | "No exercises yet"                      | Skeleton exercises       | "Failed to load chapter"    | Exercise list with AI      | Exercises without solutions     |
| Quiz Runner   | N/A                                     | "Preparing quiz..."      | "Quiz unavailable"          | Score + review             | Time expired, partial complete  |
| AI Tutor      | "Ask a question to begin"               | Streaming dots animation | "AI unavailable, try again" | Response displayed         | Rate limited, long response     |
| Forum         | "Be the first to start a discussion"    | Skeleton threads         | "Couldn't load forum"       | Thread list                | Locked threads, deleted content |
| Friends       | "Find friends to study with"            | Skeleton cards           | "Couldn't load friends"     | Friend list                | Blocked users, pending requests |
| Messages      | "No conversations yet"                  | Skeleton list            | "Couldn't load messages"    | Conversation list          | Blocked sender, archived chat   |

---

## UX Violations Found

### Critical Issues (Affect Core Flow)

1. **Inconsistent Navigation Entry Points**
   - Location: Multiple routes to same content
   - Impact: Users confused about where to find content
   - Example: `/subjects/[subject]/[chapter]` vs `/[board]/[grade]/[subject]/[chapter]`

2. **Missing Loading States**
   - Location: `friends/page.tsx`, `forum/page.tsx`
   - Impact: Blank screen while data fetches
   - Expected: Skeleton loaders matching content shape

3. **No Quiz Progress Saving**
   - Location: `quiz-runner.tsx`
   - Impact: Lost progress on accidental navigation
   - Expected: Auto-save progress, resume on return

4. **AI Chat Disconnect**
   - Location: `ai-tutor/page.tsx` vs `ai-chat-panel.tsx`
   - Impact: Conversations don't persist between contexts
   - Expected: Unified conversation history

### Moderate Issues (Reduced Usability)

5. **Unclear Empty States**
   - Location: `dashboard/page.tsx`
   - Impact: New users don't know what to do
   - Expected: Guided onboarding with sample actions

6. **Inconsistent Breadcrumbs**
   - Location: `navigation/breadcrumbs.tsx`
   - Impact: Users lose context
   - Expected: Consistent breadcrumb pattern across all pages

7. **No Form Validation Feedback**
   - Location: `register-form.tsx`, `forum/create`
   - Impact: Errors only shown on submit
   - Expected: Inline validation as user types

8. **Missing Keyboard Shortcuts**
   - Location: Global
   - Impact: Power users inefficient
   - Expected: `/` for search, `j/k` for navigation, `?` for help

---

## Navigation Patterns - Current vs Proposed

### Current Navigation Structure

```
Root Layout
├── (auth) routes - standalone, no shell
│   ├── /login
│   ├── /register
│   ├── /forgot-password
│   └── /reset-password
├── (dashboard) routes - AppShell wrapper
│   ├── /dashboard
│   ├── /dashboard/[subject]
│   ├── /subjects
│   ├── /subjects/[subject]
│   ├── /subjects/[subject]/[chapter]
│   ├── /friends
│   ├── /messages
│   ├── /messages/[conversationId]
│   ├── /stats
│   ├── /calendar
│   └── /settings
├── (learn) routes - No shell (different pattern!)
│   └── /[board]/[grade]/[subject]/[chapter]
├── ai-tutor - Standalone
├── forum - Standalone (no shell?)
│   └── /forum/[threadId]
├── admin - Separate layout
└── settings - Separate layout
```

### Issues with Current Navigation

1. **Inconsistent Shell Usage**: `(dashboard)` has shell, `(learn)` doesn't, forum doesn't
2. **Nested Subject Routes**: `/dashboard/subjects/[subject]` AND `/subjects/[subject]` both exist
3. **Settings Outside Dashboard**: `/settings` is separate from dashboard routes
4. **AI Tutor Standalone**: Not integrated into learning context

### Proposed Navigation Hierarchy

```
Root Layout
├── (auth) - Public routes
│   └── /login, /register, /forgot-password, /reset-password
│
├── (app) - Authenticated routes with consistent shell
│   ├── Dashboard
│   │   ├── /dashboard (home)
│   │   └── /dashboard/[subject]
│   ├── Learn
│   │   ├── /learn/[board]/[grade]/[subject] (subject view)
│   │   └── /learn/[board]/[grade]/[subject]/[chapter] (chapter view)
│   ├── Quiz
│   │   ├── /quiz/[subject] (quiz list)
│   │   └── /quiz/[subject]/[chapter]/attempt (active quiz)
│   ├── AI Tutor
│   │   └── /ai-tutor (unified AI chat)
│   ├── Forum
│   │   ├── /forum (list)
│   │   └── /forum/[threadId] (thread detail)
│   ├── Social
│   │   ├── /friends
│   │   └── /messages/[conversationId]
│   ├── Progress
│   │   ├── /stats
│   │   └── /calendar
│   └── Settings
│       ├── /settings (general)
│       └── /settings/privacy
│
└── (admin) - Admin routes with admin shell
    └── /admin/...
```

---

## Recommended Improvements

### 1. Unified Shell Pattern

All authenticated routes should use the same shell pattern with:

- Consistent sidebar navigation
- Same header structure
- Unified breadcrumb system

### 2. Consistent Route Grouping

- Merge `/dashboard/subjects` and `/subjects` into single `/learn`
- Move settings under main app shell
- Integrate AI tutor as slide-over panel OR dedicated page (not both)

### 3. State Recovery

- Quiz progress: auto-save to localStorage + server
- Form drafts: preserve across navigation
- Search queries: persist in URL

### 4. Progressive Disclosure

- Dashboard: Show 3-4 key actions, hide advanced features
- Chapter view: Exercise accordion collapsed by default
- Forum: Simple thread list, expand for full view

---

## Component-Specific Recommendations

### Dashboard Components

| Component                     | Issue                     | Recommendation         |
| ----------------------------- | ------------------------- | ---------------------- |
| `DashboardClient.tsx`         | Complex stagger animation | Simplify, use CSS      |
| `welcome-card.tsx`            | Static content            | Add quick actions      |
| `streak-card.tsx`             | No explanation            | Add streak tips        |
| `weekly-activity-heatmap.tsx` | Unclear data              | Add hover explanations |

### Learn Components

| Component                       | Issue            | Recommendation         |
| ------------------------------- | ---------------- | ---------------------- |
| `chapter-exercises-with-ai.tsx` | AI hidden        | Make AI more prominent |
| `exercise-accordion.tsx`        | Many clicks      | Default expand first   |
| `quiz-runner.tsx`               | No progress save | Add auto-save          |

### Forum Components

| Component        | Issue         | Recommendation     |
| ---------------- | ------------- | ------------------ |
| `forum/page.tsx` | No search     | Add search bar     |
| Thread creation  | Modal vs page | Use dedicated page |

---

## Next Steps

1. **Consolidate navigation** into single coherent structure
2. **Implement skeleton loaders** for all async content
3. **Add empty state guidance** with clear CTAs
4. **Unify AI chat** into single context
5. **Add quiz progress recovery**

---

**Status**: Ready for Implementation Planning
**Priority**: Critical issues should be addressed in Phase 6
