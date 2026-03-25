# Friends Enhanced Search - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement enhanced user search with multi-field filters (Institute, Board, Class) for the Find Friends screen.

**Architecture:** Replace the simple text-only search with a multi-filter search panel. The existing FriendSearch component will be replaced with EnhancedFriendSearch. Filter state is managed locally with localStorage for search history.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Phosphor Icons, Zod validation

---

## Task 1: Update friends-api.ts Types

**Files:**
- Modify: `learningopk/frontend/src/lib/friends-api.ts`

**Step 1: Modify the search request schema to add new filter fields**

Find lines 15-20 and update the `searchUsersRequestSchema`:

```typescript
export const searchUsersRequestSchema = z.object({
  query: z.string().min(1).max(100).optional().default(""),
  instituteId: z.number().int().positive().optional(),
  boardSlug: z.string().optional(),
  classSlug: z.string().optional(),
  subjectSlug: z.string().optional(),
  limit: z.number().int().positive().max(50).default(20),
  offset: z.number().int().nonnegative().default(0),
  sortBy: z.enum(["relevance", "name", "recent"]).optional().default("relevance"),
});
```

**Step 2: Update the searchUsers function to send new params**

Find lines 176-189 and update the `searchUsers` function:

```typescript
export const searchUsers = async (params: SearchUsersRequest): Promise<SearchUsersResponse> => {
  const searchParams = new URLSearchParams();
  if (params.query) {
    searchParams.set("query", params.query);
  }
  if (params.instituteId) {
    searchParams.set("instituteId", String(params.instituteId));
  }
  if (params.boardSlug) {
    searchParams.set("boardSlug", params.boardSlug);
  }
  if (params.classSlug) {
    searchParams.set("classSlug", params.classSlug);
  }
  if (params.subjectSlug) {
    searchParams.set("subjectSlug", params.subjectSlug);
  }
  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }
  searchParams.set("limit", String(params.limit));
  searchParams.set("offset", String(params.offset));

  return fetchJson(
    `${backendUrl}/api/users/search?${searchParams.toString()}`,
    { method: "GET" }
  );
};
```

**Step 3: Add getBoards and getClasses helper functions**

Add these after the `getInstitutes` function (after line 340):

```typescript
export const getBoards = async (): Promise<{ boards: Array<{ slug: string; name: string }> }> => {
  return fetchJson(`${backendUrl}/api/boards`, {
    method: "GET",
  });
};

export const getClasses = async (): Promise<{ classes: Array<{ slug: string; name: string; level: number }> }> => {
  return fetchJson(`${backendUrl}/api/classes`, {
    method: "GET",
  });
};

export const getSubjects = async (): Promise<{ subjects: Array<{ slug: string; name: string }> }> => {
  return fetchJson(`${backendUrl}/api/subjects`, {
    method: "GET",
  });
};
```

**Step 4: Add search history localStorage helpers**

Add at the end of the file:

```typescript
const SEARCH_HISTORY_KEY = "learningopk_friends_search_history";
const MAX_SEARCH_HISTORY = 5;

export const getSearchHistory = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const addToSearchHistory = (query: string): void => {
  if (typeof window === "undefined") return;
  if (!query.trim()) return;
  
  const history = getSearchHistory();
  const filtered = history.filter((item) => item !== query);
  const updated = [query, ...filtered].slice(0, MAX_SEARCH_HISTORY);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
};

export const clearSearchHistory = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SEARCH_HISTORY_KEY);
};
```

---

## Task 2: Create Filter Components

**Files:**
- Create: `learningopk/frontend/src/components/friends/board-filter.tsx`
- Create: `learningopk/frontend/src/components/friends/class-filter.tsx`
- Create: `learningopk/frontend/src/components/friends/subject-filter.tsx`

**Step 1: Create BoardFilter component**

```typescript
"use client";

import { useEffect, useState } from "react";
import { getBoards } from "@/lib/friends-api";

interface Board {
  slug: string;
  name: string;
}

interface BoardFilterProps {
  value?: string;
  onChange: (slug: string | undefined) => void;
  className?: string;
}

export function BoardFilter({ value, onChange, className }: BoardFilterProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const { boards: fetchedBoards } = await getBoards();
        setBoards(fetchedBoards);
      } catch {
        setBoards([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBoards();
  }, []);

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      disabled={isLoading}
      className={className}
    >
      <option value="">All Boards</option>
      {boards.map((board) => (
        <option key={board.slug} value={board.slug}>
          {board.name}
        </option>
      ))}
    </select>
  );
}
```

**Step 2: Create ClassFilter component**

```typescript
"use client";

import { useEffect, useState } from "react";
import { getClasses } from "@/lib/friends-api";

interface ClassItem {
  slug: string;
  name: string;
  level: number;
}

interface ClassFilterProps {
  value?: string;
  onChange: (slug: string | undefined) => void;
  className?: string;
}

export function ClassFilter({ value, onChange, className }: ClassFilterProps) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { classes: fetchedClasses } = await getClasses();
        setClasses(fetchedClasses.sort((a, b) => a.level - b.level));
      } catch {
        setClasses([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClasses();
  }, []);

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      disabled={isLoading}
      className={className}
    >
      <option value="">All Classes</option>
      {classes.map((cls) => (
        <option key={cls.slug} value={cls.slug}>
          {cls.name}
        </option>
      ))}
    </select>
  );
}
```

**Step 3: Create SubjectFilter component (multi-select chips)**

```typescript
"use client";

import { useEffect, useState } from "react";
import { getSubjects } from "@/lib/friends-api";
import { cn } from "@/lib/utils";

interface Subject {
  slug: string;
  name: string;
}

interface SubjectFilterProps {
  value?: string[];
  onChange: (slugs: string[] | undefined) => void;
  className?: string;
}

export function SubjectFilter({ value = [], onChange, className }: SubjectFilterProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { subjects: fetchedSubjects } = await getSubjects();
        setSubjects(fetchedSubjects);
      } catch {
        setSubjects([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  const toggleSubject = (slug: string) => {
    if (value.includes(slug)) {
      onChange(value.filter((s) => s !== slug));
    } else {
      onChange([...value, slug]);
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {isLoading ? (
        <span className="text-sm text-muted-foreground">Loading subjects...</span>
      ) : (
        subjects.map((subject) => (
          <button
            key={subject.slug}
            type="button"
            onClick={() => toggleSubject(subject.slug)}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors",
              value.includes(subject.slug)
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {subject.name}
          </button>
        ))
      )}
    </div>
  );
}
```

---

## Task 3: Create EnhancedFriendSearch Component

**Files:**
- Create: `learningopk/frontend/src/components/friends/enhanced-friend-search.tsx`

**Step 1: Create the EnhancedFriendSearch component**

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";
import { MagnifyingGlass, X, Clock, Users as UsersIcon } from "@phosphor-icons/react";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { Input } from "@/components/ui/input";
import { UserSearchCard } from "@/components/friends/user-search-card";
import { BoardFilter } from "@/components/friends/board-filter";
import { ClassFilter } from "@/components/friends/class-filter";
import { cn } from "@/lib/utils";
import {
  searchUsers,
  addFriend,
  cancelFriendRequest,
  getInstitutes,
  getSearchHistory,
  addToSearchHistory,
  clearSearchHistory,
  type UserSearchResult,
  type SearchUsersRequest,
} from "@/lib/friends-api";

interface EnhancedFriendSearchProps {
  onUserSelect?: (user: UserSearchResult) => void;
  excludeUserIds?: string[];
  className?: string;
}

interface Institute {
  id: number;
  name: string;
}

export function EnhancedFriendSearch({
  onUserSelect,
  excludeUserIds = [],
  className,
}: EnhancedFriendSearchProps) {
  const [query, setQuery] = useState("");
  const [instituteId, setInstituteId] = useState<number | undefined>(undefined);
  const [boardSlug, setBoardSlug] = useState<string | undefined>(undefined);
  const [classSlug, setClassSlug] = useState<string | undefined>(undefined);
  const [subjectSlug, setSubjectSlug] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<"relevance" | "name" | "recent">("relevance");
  
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInstitutes, setIsLoadingInstitutes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [totalResults, setTotalResults] = useState<number | null>(null);

  // Fetch institutes on mount
  useEffect(() => {
    const fetchInstitutes = async () => {
      try {
        const { institutes: fetchedInstitutes } = await getInstitutes();
        setInstitutes(fetchedInstitutes);
      } catch {
        // Silently fail
      } finally {
        setIsLoadingInstitutes(false);
      }
    };
    fetchInstitutes();
  }, []);

  // Load search history
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string, filters: Partial<SearchUsersRequest>) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params: SearchUsersRequest = {
        query: searchQuery.trim(),
        instituteId: filters.instituteId,
        boardSlug: filters.boardSlug,
        classSlug: filters.classSlug,
        subjectSlug: filters.subjectSlug,
        sortBy: filters.sortBy ?? "relevance",
        limit: 20,
        offset: 0,
      };

      const { users: fetchedUsers, total } = await searchUsers(params);

      // Filter out excluded user IDs
      const filteredUsers = fetchedUsers.filter(
        (user) => !excludeUserIds.includes(user.id)
      );
      setUsers(filteredUsers);
      setTotalResults(total);

      // Save to history if query is not empty
      if (searchQuery.trim()) {
        addToSearchHistory(searchQuery.trim());
        setSearchHistory(getSearchHistory());
      }
    } catch {
      setError("Failed to search users. Please try again.");
      setUsers([]);
      setTotalResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [excludeUserIds]);

  // Debounced search handler
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query, { instituteId, boardSlug, classSlug, subjectSlug, sortBy });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, instituteId, boardSlug, classSlug, subjectSlug, sortBy, performSearch]);

  const handleAddFriend = useCallback(async (userId: string) => {
    setLoadingUserId(userId);
    try {
      await addFriend(userId);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, friendStatus: "pending_sent" as const } : user
        )
      );
    } catch {
      // Handle silently
    } finally {
      setLoadingUserId(null);
    }
  }, []);

  const handleCancelRequest = useCallback(async (userId: string) => {
    setLoadingUserId(userId);
    try {
      await cancelFriendRequest(userId);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, friendStatus: "none" as const } : user
        )
      );
    } catch {
      // Handle silently
    } finally {
      setLoadingUserId(null);
    }
  }, []);

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    setShowHistory(false);
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
  };

  const hasActiveFilters = instituteId || boardSlug || classSlug || subjectSlug;

  const clearAllFilters = () => {
    setInstituteId(undefined);
    setBoardSlug(undefined);
    setClassSlug(undefined);
    setSubjectSlug(undefined);
  };

  const showEmptyState = hasSearched && !isLoading && users.length === 0 && !error;
  const showErrorState = error !== null;
  const showResults = users.length > 0 && !isLoading;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Search Input */}
      <div className="relative">
        <MagnifyingGlass
          className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          weight="bold"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowHistory(true)}
          onBlur={() => setTimeout(() => setShowHistory(false), 200)}
          className="pl-12 pr-10"
          aria-label="Search users"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        
        {/* Search History Dropdown */}
        {showHistory && searchHistory.length > 0 && !query && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-medium text-muted-foreground">Recent Searches</span>
              <button
                onClick={handleClearHistory}
                className="text-xs text-[var(--primary)] hover:underline"
              >
                Clear
              </button>
            </div>
            {searchHistory.map((historyQuery, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleHistoryClick(historyQuery)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-muted/50"
              >
                <Clock className="h-4 w-4 text-muted-foreground" />
                {historyQuery}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Institute Filter */}
        <select
          value={instituteId?.toString() ?? ""}
          onChange={(e) => setInstituteId(e.target.value ? Number(e.target.value) : undefined)}
          disabled={isLoadingInstitutes}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
          aria-label="Filter by institute"
        >
          <option value="">All Institutes</option>
          {institutes.map((institute) => (
            <option key={institute.id} value={institute.id.toString()}>
              {institute.name}
            </option>
          ))}
        </select>

        {/* Board Filter */}
        <BoardFilter
          value={boardSlug}
          onChange={setBoardSlug}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
        />

        {/* Class Filter */}
        <ClassFilter
          value={classSlug}
          onChange={setClassSlug}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
        />

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="h-10 px-3 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Clear filters
          </button>
        )}
      </div>

      {/* Results Header */}
      {showResults && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {totalResults !== null ? `${totalResults} students found` : `${users.length} students`}
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-8 rounded-md border border-input bg-card px-2 text-xs"
            aria-label="Sort results"
          >
            <option value="relevance">Relevance</option>
            <option value="name">Name A-Z</option>
            <option value="recent">Recently Active</option>
          </select>
        </div>
      )}

      {/* Content Area */}
      {isLoading && <CardSkeleton count={3} />}

      {showErrorState && (
        <ErrorState
          title="Search failed"
          description={error ?? undefined}
          onRetry={() => performSearch(query, { instituteId, boardSlug, classSlug, subjectSlug, sortBy })}
          retryLabel="Retry"
        />
      )}

      {showEmptyState && (
        <EmptyState
          title="No users found"
          description="Try adjusting your search or filters to find more people."
          icon={<UsersIcon className="h-5 w-5" aria-hidden />}
        />
      )}

      {showResults && (
        <div className="grid gap-3 sm:grid-cols-2" role="list" aria-label="Search results">
          {users.map((user) => (
            <div
              key={user.id}
              role="listitem"
              onClick={() => onUserSelect?.(user)}
              className={onUserSelect ? "cursor-pointer" : undefined}
            >
              <UserSearchCard
                user={user}
                onAddFriend={handleAddFriend}
                onCancelRequest={handleCancelRequest}
                isLoading={loadingUserId !== null}
                loadingUserId={loadingUserId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Task 4: Update FriendsContent to Use EnhancedFriendSearch

**Files:**
- Modify: `learningopk/frontend/app/(dashboard)/friends/friends-content.tsx:1-26`

**Step 1: Update the import to use EnhancedFriendSearch**

Replace line 9:
```typescript
import { FriendSearch } from "@/components/friends/friend-search";
```
With:
```typescript
import { EnhancedFriendSearch } from "@/components/friends/enhanced-friend-search";
```

**Step 2: Update the Find tab content**

Find lines 260-264 where `activeTab === "find"` and replace:
```typescript
{activeTab === "find" && (
  <div className="space-y-4">
    <FriendSearch />
  </div>
)}
```
With:
```typescript
{activeTab === "find" && (
  <div className="space-y-4">
    <EnhancedFriendSearch />
  </div>
)}
```

---

## Task 5: Verify Types and Run Tests

**Step 1: Check TypeScript compilation**

Run in `learningopk/frontend/`:
```bash
npx tsc --noEmit
```

Expected: No errors. If errors occur, fix them before proceeding.

**Step 2: Run E2E tests**

```bash
npx playwright test
```

Or to run just the friends-related tests:
```bash
npx playwright test tests/e2e/
```

**Step 3: Manual verification checklist**

- [ ] Navigate to /friends and click "Find" tab
- [ ] Type a name and see search results appear after 300ms debounce
- [ ] Select an institute filter and see results update
- [ ] Select a board filter and see results update
- [ ] Select a class filter and see results update
- [ ] Verify search history appears when focusing empty search
- [ ] Click a history item to populate the search
- [ ] Click "Clear filters" to reset all filters
- [ ] Verify result count is displayed
- [ ] Change sort option and see results reorder

---

## Verification Summary

After all tasks:
- TypeScript compiles without errors
- E2E tests pass
- Manual verification checklist passes

---

## Dependencies

This implementation depends on the following backend endpoints:
- `GET /api/users/search` - Extended to accept new query params
- `GET /api/institutes` - Already exists
- `GET /api/boards` - May need to be created if not exists
- `GET /api/classes` - May need to be created if not exists
- `GET /api/subjects` - May need to be created if not exists

If these endpoints don't exist, the backend team will need to implement them.

---

## Out of Scope

- Trending students section
- "People you may know" recommendations
- Rich profile improvements
- Chat UI changes
- Backend repository decomposition (the original audit mentioned this but it's not part of this plan)
