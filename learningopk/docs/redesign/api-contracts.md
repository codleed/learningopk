# LearningoPK API Contract Document

## Date

2026-04-05 (Updated for TASK-57 auth drift repair)

## Auditor

Software Architecture Review - TASK-57

---

## API Overview

**Base URL**: `/api` (frontend proxy) or direct backend
**Auth**: Session-based via `better-auth`
**Content-Type**: `application/json`

---

## Auth Routes (`/api/auth`)

Better Auth provides a comprehensive authentication system. The following endpoints are available:

| Method | Path                  | Auth | Description                           |
| ------ | --------------------- | ---- | ------------------------------------- |
| POST   | `/auth/sign-up/email` | No   | Register new user with email/password |
| POST   | `/auth/sign-in/email` | No   | Login with email/password             |
| POST   | `/auth/sign-out`      | Yes  | Logout current session                |
| GET    | `/auth/get-session`   | Yes  | Get current session                   |

**Note**: Password reset functionality (`/auth/request-password-reset`, `/auth/reset-password`) is **not currently enabled** — no `sendResetPassword` handler is configured in Better Auth. The login UI does not show a "Forgot password?" link. Users who forget passwords must contact support.

**Request/Response Contracts:**

```ts
// POST /auth/sign-up/email
Request: {
  name: string,
  email: string,
  password: string (min 8 chars),
  class: string,
  board: string,
  degree?: string
}
Success 200/201: {
  user: { id, name, email, class, board, degree, role?, createdAt, updatedAt },
  session: {...}
}

// POST /auth/sign-in/email
Request: { email: string, password: string }
Success 200: { user: {...}, session: {...} }
Error 401: { error: "Invalid credentials" }

// POST /auth/sign-out
Success 200: { message: "Signed out" }

// GET /auth/get-session
Success 200: { session: {...} | null }
```

**Supported Features:**

- Email/password authentication (with `autoSignIn` on signup)
- Session-based auth with secure cookies
- User additional fields: `class`, `board`, `degree`, `role` (role is server-set only, not user-input)

**Not Yet Implemented:**

- Remember me / extended session duration (not configured in Better Auth)
- Password reset via email (no `sendResetPassword` handler configured)
- Email verification (not required for current product stage)
- Social login providers (Google button exists in UI but no provider configured)
- Two-factor authentication

---

| Method | Path                                   | Auth | Description                  |
| ------ | -------------------------------------- | ---- | ---------------------------- |
| GET    | `/friends/`                            | Yes  | List friends with pagination |
| POST   | `/friends/requests`                    | Yes  | Send friend request          |
| GET    | `/friends/requests`                    | Yes  | List friend requests         |
| POST   | `/friends/requests/:requestId/accept`  | Yes  | Accept request               |
| POST   | `/friends/requests/:requestId/decline` | Yes  | Decline request              |
| DELETE | `/friends/requests/:requestId`         | Yes  | Cancel outgoing request      |
| DELETE | `/friends/:friendId`                   | Yes  | Remove friend                |

**Request/Response Contracts:**

```ts
// GET /friends/
Query: { page?: number, limit?: number, search?: string }
Success 200: {
  friends: Array<{ id, name, email, createdAt }>,
  pagination: { page, limit, total, totalPages }
}

// POST /friends/requests
Request: { targetUserId: string }
Success 201: { requestId, status, targetUserId, createdAt }
Error 400: { error: "Cannot send friend request to yourself" }
Error 404: { error: "Target user not found" }
Error 403: { error: "Cannot send friend request to this user" }

// GET /friends/requests
Query: { type?: "incoming" | "outgoing" | "all", page?: number, limit?: number }
Success 200: Array<{ requestId, fromUser, toUser, status, createdAt }>

// POST /friends/requests/:requestId/accept
Success 200: { friendshipId, friend: { id, name, email } }
Error 400: { error: "Request not found or not incoming" }
```

---

### Forum Routes (`/api/forum`)

| Method | Path                               | Auth | Description                          |
| ------ | ---------------------------------- | ---- | ------------------------------------ |
| GET    | `/forum/filters`                   | No   | Get boards/classes/subjects/chapters |
| GET    | `/forum/threads`                   | No   | List threads with filters            |
| GET    | `/forum/threads/:threadId`         | No   | Get thread with replies              |
| POST   | `/forum/threads`                   | Yes  | Create new thread                    |
| POST   | `/forum/threads/:threadId/replies` | Yes  | Add reply to thread                  |
| POST   | `/forum/replies/:replyId/vote`     | Yes  | Vote on reply                        |
| POST   | `/forum/replies/:replyId/accept`   | Yes  | Accept reply as answer               |

**Request/Response Contracts:**

```ts
// GET /forum/threads
Query: {
  board?: string,
  grade?: string,
  subjectId?: number,
  chapterId?: number,
  q?: string,
  solved?: "all" | "solved" | "unsolved",
  limit?: number,
  offset?: number
}
Success 200: {
  threads: Array<{
    id, title, body, userId, userName,
    subjectId, chapterId, isPinned, isSolved, views,
    createdAt, updatedAt, boardSlug, boardName, grade,
    className, subjectName, replyCount
  }>
}

// GET /forum/threads/:threadId
Success 200: {
  thread: {
    id, title, body, userId, userName,
    subjectId, chapterId, isPinned, isSolved, views,
    createdAt, updatedAt, boardSlug, boardName, grade,
    className, subjectName,
    replies: Array<{...nested structure...}>,
    replyCount: number
  }
}

// POST /forum/threads
Request: {
  title: string (5-160 chars),
  body: string (min 10 chars),
  subjectId?: number,
  chapterId?: number
}
Success 201: { thread: { ...thread data..., userName } }
Error 422: { error: "Forum content blocked by safety checks", reason: string }

// POST /forum/threads/:threadId/replies
Request: { body: string (min 2 chars), parentReplyId?: uuid }
Success 201: { id, threadId, userId, userName, body, parentReplyId, ... }
```

---

### Learn Routes (`/api/learn`)

| Method | Path                                     | Auth | Description                |
| ------ | ---------------------------------------- | ---- | -------------------------- |
| GET    | `/learn/:board/:grade/:subject`          | No   | Get subject with chapters  |
| GET    | `/learn/:board/:grade/:subject/graph`    | Yes  | Get chapter progress graph |
| GET    | `/learn/:board/:grade/:subject/:chapter` | No   | Get chapter detail         |

**Request/Response Contracts:**

```ts
// GET /learn/:board/:grade/:subject
Success 200: {
  board: { slug, name },
  grade: string,
  class: { slug, name },
  subject: { id, slug, name, description },
  chapters: Array<{ id, chapterNumber, title, slug, hasExercises, hasQuiz }>
}

// GET /learn/:board/:grade/:subject/graph
Success 200: { graph: { nodes: [...], edges: [...] } }
Error 403: { error: "Forbidden" } (if student's board/class doesn't match)

// GET /learn/:board/:grade/:subject/:chapter
Success 200: {
  board: { slug, name },
  grade: string,
  class: { slug, name },
  subject: { id, slug, name },
  chapter: { id, chapterNumber, title, slug, summary },
  exercises: Array<{ id, number, title, type }>,
  flashcards: Array<{ id, front, back }>,
  quiz: { id, title, questionCount, timeLimit } | null
}
```

---

### Progress Routes (`/api/progress`)

| Method | Path                            | Auth | Description                   |
| ------ | ------------------------------- | ---- | ----------------------------- |
| GET    | `/progress/dashboard`           | Yes  | Get dashboard stats           |
| GET    | `/progress/subjects`            | Yes  | Get subject progress          |
| GET    | `/progress/subjects/:subjectId` | Yes  | Get specific subject progress |
| POST   | `/progress/chapter/:chapterId`  | Yes  | Update chapter progress       |

---

### Chat Routes (`/api/chat`)

| Method | Path                      | Auth | Description                   |
| ------ | ------------------------- | ---- | ----------------------------- |
| GET    | `/chat/conversations`     | Yes  | List conversations            |
| GET    | `/chat/conversations/:id` | Yes  | Get messages in conversation  |
| POST   | `/chat/conversations`     | Yes  | Create/start conversation     |
| POST   | `/chat/messages`          | Yes  | Send message (also WebSocket) |

---

### Notifications Routes (`/api/notifications`)

| Method | Path                  | Auth | Description        |
| ------ | --------------------- | ---- | ------------------ |
| GET    | `/notifications`      | Yes  | List notifications |
| POST   | `/notifications/read` | Yes  | Mark as read       |

---

## Data Models

### User

```ts
{
  id: string (uuid),
  email: string,
  name: string,
  role: "student" | "admin",
  board?: "federal" | "punjab" | "sindh",
  class?: string,
  avatarUrl?: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Thread

```ts
{
  id: string (uuid),
  title: string,
  body: string,
  userId: string,
  userName: string,
  subjectId?: number,
  chapterId?: number,
  isPinned: boolean,
  isSolved: boolean,
  views: number,
  createdAt: timestamp,
  updatedAt: timestamp,
  replyCount: number
}
```

### Reply

```ts
{
  id: string (uuid),
  threadId: string,
  userId: string,
  userName: string,
  parentReplyId?: string,
  body: string,
  isAcceptedAnswer: boolean,
  upvotes: number,
  viewerVoteType?: "upvote" | "downvote",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## Issues Summary

| Priority | Issue                        | Location                       |
| -------- | ---------------------------- | ------------------------------ |
| High     | Inconsistent response shapes | All routes                     |
| High     | N+1 query in thread replies  | `GET /forum/threads/:threadId` |
| Medium   | No reply pagination          | `GET /forum/threads/:threadId` |
| Medium   | Missing rate limit headers   | All routes                     |
| Low      | No cursor-based pagination   | Forum list endpoints           |

---

## Recommendations

1. **Standardize Response Shape**: All responses should use `{ data: ... }` wrapper
2. **Add Pagination to Replies**: Cursor-based pagination for thread replies
3. **Fix N+1 Queries**: Join vote data in initial thread query
4. **Add Request/Response Types**: Generate TypeScript types from Zod schemas
5. **Document Error Codes**: Machine-readable error codes for client handling

---

**Status**: Ready for Implementation Planning
**Priority**: High-priority items should be addressed in Phase 6
