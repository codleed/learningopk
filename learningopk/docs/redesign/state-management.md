# LearningoPK State Management & Performance Audit

## Date

2026-03-25

## Auditor

Data Engineering Review

---

## Current State of State

### Analysis

The LearningoPK frontend has **minimal explicit state management**:

| State Type   | Current Implementation           | Issues                        |
| ------------ | -------------------------------- | ----------------------------- |
| Server State | Server Components + direct fetch | No caching, no deduplication  |
| URL State    | searchParams                     | OK for shareable state        |
| Local State  | useState in components           | Scattered, some prop drilling |
| Global State | None                             | No shared UI state            |
| Form State   | Local useState                   | No form library               |

### Folder Analysis

**`src/lib/`** - API clients (data fetching only)

- `forum-api.ts` - Zod schemas + fetch functions
- `progress-api.ts` - Dashboard/progress data
- `friends-api.ts` - Social features
- `learn-api.ts` - Learning content
- `auth-client.ts` - Authentication
- `chat-api.ts` - Messaging
- `stats-metrics.ts` - Stats calculations
- `utils.ts` - Utility functions

**`src/hooks/`** - Custom hooks

- `use-websocket.ts` - WebSocket for real-time features

**Key Observation**: No state management library (Redux, Zustand, Jotai, etc.)

---

## Data Fetching Patterns

### Pattern 1: Direct Fetch in Server Components

```tsx
// app/(dashboard)/dashboard/page.tsx
export default async function DashboardPage() {
  const data = await getDashboardSummary(cookie);
  return <DashboardClient data={data} />;
}
```

**Pros**: Simple, data fetched at build/request time
**Cons**: No caching, no revalidation, full page reload

### Pattern 2: Client-Side Fetch with useEffect

```tsx
// Some component
const [data, setData] = useState(null);
useEffect(() => {
  fetch("/api/...")
    .then((res) => res.json())
    .then(setData);
}, []);
```

**Pros**: Interactive, shows loading state
**Cons**: No caching, potential race conditions

### Pattern 3: URL State for Filters

```tsx
// Subject view switcher
const searchParams = useSearchParams();
const view = searchParams.get("view") || "grid";
```

**Pros**: Shareable, persists navigation
**Cons**: Limited to filter-like state

---

## Performance Issues Found

### 1. No Data Caching

- Every navigation refetches all data
- No React Query / SWR equivalent
- No Next.js `unstable_cache` usage

### 2. N+1 Pattern in Dashboard

Dashboard loads:

```tsx
// Sequential fetches - no parallelization
const summary = await getDashboardSummary();
const subjectProgress = await getSubjectProgress();
// More sequential calls
```

### 3. Large Payload on Dashboard

`getDashboardSummary()` returns:

- All subjects with progress
- Full quiz history
- Full activity history
- Weekly activity (7 days)
- Daily activity (30 days)

**No pagination** - returns everything at once.

### 4. Missing Skeleton States

Some pages have skeleton loaders, others don't:

- `forum/page.tsx` - has skeleton
- `friends/page.tsx` - NO skeleton (blank screen on load)
- `dashboard/page.tsx` - NO skeleton (just spinner)

### 5. Image Optimization Missing

```tsx
// Found in various components
<img src={user.image} />  // No next/image
<img src={post.mediaUrl} />  // No optimization
```

### 6. No Code Splitting

- `react-force-graph-2d` loaded on chapter graph page only
- But it's imported at module level, not lazy loaded

### 7. Framer Motion Bundle Impact

`design-system/components/Button.tsx` uses Framer Motion:

```tsx
import { motion } from "framer-motion";
// ~50kb bundle added for simple button animations
```

---

## Database Schema Audit

### Main Entities

```sql
-- Users
users: id, email, name, passwordHash, role, board, class, avatarUrl

-- Content
subjects: id, name, slug, grade, boardId, boardClassId
chapters: id, title, slug, subjectId, chapterNumber, summary
exercises: id, chapterId, number, title, type, content
flashcards: id, chapterId, front, back
quizzes: id, chapterId, title, timeLimit

-- Progress
chapterProgress: userId, chapterId, viewedAt, exercisesViewed
quizAttempts: userId, quizId, score, startedAt, completedAt
streaks: userId, currentStreak, longestStreak, lastActiveAt

-- Social
friends: userId, friendId, createdAt
friendRequests: fromUserId, toUserId, status, createdAt
forumThreads: userId, title, body, subjectId, chapterId
forumReplies: threadId, userId, body, parentReplyId

-- Chat
conversations: id, participant1Id, participant2Id
messages: conversationId, senderId, body, mediaType, mediaUrl
```

### Issues

1. **No soft deletes** - forum_threads, users have no deletedAt
2. **No index on chapterProgress.userId** - slow dashboard queries
3. **No pagination on quizAttempts** - history grows unbounded
4. **forumReplies N+1** - votes loaded separately

---

## State Architecture Recommendations

### Recommended: React Query (TanStack Query)

Add `@tanstack/react-query` for:

```tsx
// Provider in layout
<QueryClientProvider>{children}</QueryClientProvider>;

// Usage in components
const { data, isLoading, error } = useQuery({
  queryKey: ["dashboard", userId],
  queryFn: () => getDashboardSummary(cookie),
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
});
```

### Cache Invalidation Strategy

| Data          | Invalidation Trigger | Strategy        |
| ------------- | -------------------- | --------------- |
| Dashboard     | Any progress update  | On window focus |
| Forum threads | Create/update thread | Immediate       |
| Friends list  | Friend action        | Immediate       |
| Messages      | WebSocket event      | Real-time       |

### State Boundaries

| State Type  | Solution        | Example            |
| ----------- | --------------- | ------------------ |
| Server data | React Query     | Dashboard, Forum   |
| URL state   | Next.js router  | Filters, view mode |
| Form state  | React Hook Form | Create thread      |
| UI state    | Local useState  | Modals, toggles    |
| Global UI   | Context         | Theme, sidebar     |

### Local State Limits

**Prop Drilling Check**:

```tsx
// BAD - prop drilling 3+ levels
<Page><Layout><Content><Card><Button>Save</Button></Card></Content></Layout></Page>

// GOOD - context or composition
<Page><Layout><Card><CardActions>Save</CardActions></Card></Layout></Page>
```

---

## Performance Optimization Plan

### Priority 1: Add Skeleton Loaders

- Friends page
- Messages page
- Stats page
- Any async content

### Priority 2: Lazy Load Heavy Components

```tsx
// Instead of: import ForceGraph from 'react-force-graph-2d'
const ForceGraph = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => <GraphSkeleton />,
});
```

### Priority 3: Optimize Images

```tsx
import Image from "next/image";

// Instead of: <img src={src} />
<Image src={src} width={64} height={64} alt={alt} />;
```

### Priority 4: Dashboard Data Pagination

Split `getDashboardSummary` into:

- `getStreakSummary()` - lightweight
- `getSubjectProgressList(pagination)` - paginated
- `getRecentActivity(limit)` - recent only

### Priority 5: React Query Caching

```tsx
// Optimistic updates for instant feedback
const mutation = useMutation({
  mutationFn: sendFriendRequest,
  onMutate: async (newRequest) => {
    await queryClient.cancelQueries(["friends"]);
    const previous = queryClient.getQueryData(["friends"]);
    queryClient.setQueryData(["friends"], (old) => [...old, newRequest]);
    return { previous };
  },
  onError: (err, newRequest, context) => {
    queryClient.setQueryData(["friends"], context.previous);
  },
});
```

---

## Summary

| Category       | Current State            | Target State           |
| -------------- | ------------------------ | ---------------------- |
| Data Fetching  | Direct fetch, no cache   | React Query with cache |
| Loading States | Inconsistent             | Skeleton for all async |
| Bundle Size    | Framer Motion everywhere | Selective animation    |
| Images         | Native img               | next/image             |
| State          | useState everywhere      | Appropriate boundaries |
| Performance    | Room for improvement     | Core Web Vitals good   |

---

**Status**: Ready for Implementation Planning
**Priority**: Implement in Phase 6
