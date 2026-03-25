# LearningoPK API Contract Document

## Date
2026-03-25

## Auditor
Backend Architecture Review

---

## API Overview

**Base URL**: `/api` (frontend proxy) or direct backend
**Auth**: Session-based via `better-auth`
**Content-Type**: `application/json`

---

## Response Shape Conventions

### Success Response
```json
{
  "data": { ... }
}
```
OR direct return (inconsistent - see Issues)

### Error Response
```json
{
  "error": "Error message",
  "details": { ... }  // Optional, from Zod validation
}
```

### Pagination Response
```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Issues Found

### 1. Inconsistent Response Shapes
Some endpoints return `{ data }` wrapper, others return directly:

```ts
// friends.ts - returns directly
res.json({ friends, pagination });

// forum.ts - returns { threads: [...] } wrapper
res.status(200).json({ threads: threadRows });

// learn.ts - returns chapter detail directly
res.status(200).json({ board, grade, class, subject, chapter, exercises, ... });
```

**Recommendation**: Standardize on `{ data: ... }` wrapper for all responses.

### 2. Missing Error Response Standardization
Errors should follow consistent shape:
```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",  // For client handling
  "details": { ... }  // Optional validation details
}
```

### 3. Over-Fetching in Forum Thread List
`GET /forum/threads/:threadId` returns ALL replies in single request:
- No pagination for replies
- Replies can be hundreds for active threads
- `replyCount` is redundant since replies are loaded

**Recommendation**: Add pagination to replies or use cursor-based loading.

### 4. N+1 Query Pattern in Forum
`GET /forum/threads/:threadId` makes separate query for votes:
```sql
-- Query 1: Get thread + replies
-- Query 2: Get viewer votes for ALL replies (if viewerUserId exists)
```
With 100 replies, this is 101 queries.

**Recommendation**: Join votes in initial query.

---

## Auth Flow

### Session-Based Auth (better-auth)
```
Client → POST /api/auth/login { email, password }
       ← Set-Cookie: session=<token>

Client → Subsequent requests include Cookie
       ← 401 if session expired/invalid
```

### Protected Routes
All routes requiring authentication use `requireSession` middleware:
- `/api/friends/*` - all endpoints
- `/api/forum/*` - POST endpoints (GET is public)
- `/api/chat/*` - all endpoints
- `/api/progress/*` - all endpoints
- `/api/notifications/*` - all endpoints
- `/api/learn/*/graph` - requires session

### Role-Based Access
```ts
// Example from learn.ts
if (authedReq.session.user.role === "student") {
  if (authedReq.session.user.board !== board) {
    res.status(403).json({ error: "Forbidden" });
  }
}
```

---

## Endpoint Inventory

### Auth Routes (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Login with email/password |
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/logout` | Yes | Logout current session |
| GET | `/auth/session` | Yes | Get current session |

**Request/Response Contracts:**

```ts
// POST /auth/login
Request: { email: string, password: string }
Success 200: { user: { id, email, name, role, board?, class? }, session: {...} }
Error 400: { error: "Invalid credentials" }

// POST /auth/register  
Request: { email: string, password: string, name: string, board: string, class: string }
Success 201: { user: {...}, session: {...} }
Error 400: { error: "Email already exists", details: {...} }
```

---

### Friends Routes (`/api/friends`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/friends/` | Yes | List friends with pagination |
| POST | `/friends/requests` | Yes | Send friend request |
| GET | `/friends/requests` | Yes | List friend requests |
| POST | `/friends/requests/:requestId/accept` | Yes | Accept request |
| POST | `/friends/requests/:requestId/decline` | Yes | Decline request |
| DELETE | `/friends/requests/:requestId` | Yes | Cancel outgoing request |
| DELETE | `/friends/:friendId` | Yes | Remove friend |

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

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/forum/filters` | No | Get boards/classes/subjects/chapters |
| GET | `/forum/threads` | No | List threads with filters |
| GET | `/forum/threads/:threadId` | No | Get thread with replies |
| POST | `/forum/threads` | Yes | Create new thread |
| POST | `/forum/threads/:threadId/replies` | Yes | Add reply to thread |
| POST | `/forum/replies/:replyId/vote` | Yes | Vote on reply |
| POST | `/forum/replies/:replyId/accept` | Yes | Accept reply as answer |

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

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/learn/:board/:grade/:subject` | No | Get subject with chapters |
| GET | `/learn/:board/:grade/:subject/graph` | Yes | Get chapter progress graph |
| GET | `/learn/:board/:grade/:subject/:chapter` | No | Get chapter detail |

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

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/progress/dashboard` | Yes | Get dashboard stats |
| GET | `/progress/subjects` | Yes | Get subject progress |
| GET | `/progress/subjects/:subjectId` | Yes | Get specific subject progress |
| POST | `/progress/chapter/:chapterId` | Yes | Update chapter progress |

---

### Chat Routes (`/api/chat`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/chat/conversations` | Yes | List conversations |
| GET | `/chat/conversations/:id` | Yes | Get messages in conversation |
| POST | `/chat/conversations` | Yes | Create/start conversation |
| POST | `/chat/messages` | Yes | Send message (also WebSocket) |

---

### Notifications Routes (`/api/notifications`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | Yes | List notifications |
| POST | `/notifications/read` | Yes | Mark as read |

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

| Priority | Issue | Location |
|----------|-------|----------|
| High | Inconsistent response shapes | All routes |
| High | N+1 query in thread replies | `GET /forum/threads/:threadId` |
| Medium | No reply pagination | `GET /forum/threads/:threadId` |
| Medium | Missing rate limit headers | All routes |
| Low | No cursor-based pagination | Forum list endpoints |

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