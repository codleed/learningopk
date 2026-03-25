# LearningoPK Friends Discovery - Enhanced Search Design

## Date
2026-03-25

## Status
Draft - Awaiting Implementation

---

## Overview

Redesign the Find Friends screen to provide **Enhanced Search** capabilities. Users can discover study partners through multi-field filtering (Institute, Board, Class, Subject) with search history support.

---

## Design Decisions

### Keep
- Existing design tokens (green #7ac943 primary, serif fonts)
- Existing FriendsContent layout with tab navigation
- Current FriendCard and ChatWindow components (unchanged)
- Existing friends-api.ts interface

### Change
- Replace simple text-only search with multi-filter search
- Add filter panel with Institute, Board, Class, Subject dropdowns
- Add search history (stored in localStorage, last 5 queries)
- Add result count and sort options

### Remove
- Trending students section (not in scope)

---

## Component Changes

### 1. New: EnhancedFriendSearch Component

Replaces existing `FriendSearch` component.

**Props:**
```typescript
interface EnhancedFriendSearchProps {
  onUserSelect?: (user: UserSearchResult) => void;
  excludeUserIds?: string[];
  className?: string;
}
```

**State:**
- `query: string` - current search text
- `filters: FilterState` - { instituteId?, boardSlug?, classSlug?, subjectSlug? }
- `searchHistory: string[]` - last 5 searches from localStorage
- `sortBy: 'relevance' | 'name' | 'recent'`

**Layout:**
```
┌─────────────────────────────────────────────┐
│  🔍 Search by name or email...              │
├─────────────────────────────────────────────┤
│  [Institute ▼]  [Board ▼]  [Class ▼]        │
├─────────────────────────────────────────────┤
│  Subject: [Math] [Science] [English] +more  │
└─────────────────────────────────────────────┘
```

### 2. Filter Components

**InstituteFilter:**
- Fetch from `/institutes` API
- Dropdown with search-within capability
- Shows institution name

**BoardFilter:**
- Options: "Sindh Board", "Punjab Board", "Federal Board", "All Boards"
- Based on Pakistani education system

**ClassFilter:**
- Options: Class 9, Class 10, Class 11, Class 12

**SubjectFilter:**
- Multi-select chips
- Shows user's enrolled subjects + "All Subjects" option

### 3. Search History

- Stored in `localStorage` key: `learningopk_friends_search_history`
- Max 5 entries, most recent first
- Click to populate search box
- "Clear history" button

### 4. Results Section

**Header:**
- "X students found" (or "No results" if empty)
- Sort dropdown: Relevance | Name A-Z | Recently Active

**User Cards:**
- Enhanced UserSearchCard with:
  - Avatar (48x48, rounded-full)
  - Name (semibold)
  - Email (muted, smaller)
  - Institute badge
  - Board + Class badges (if available)
  - Subject chips (max 3, "+N more" if overflow)
  - Mutual friends count (if > 0)
  - Add/Cancel Request button

---

## API Changes

### Request
```typescript
// New search parameters for friends-api.ts
interface SearchUsersParams {
  query?: string;
  instituteId?: number;
  boardSlug?: string;
  classSlug?: string;
  subjectSlug?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'name' | 'recent';
}
```

### Backend Requirements
- `searchUsers` in `friends-api.ts` (frontend) → `friends.repository.ts` → `friends.service.ts` → `friends.controller.ts`
- Repository already exists at `backend/src/repositories/friends.repository.ts`
- May need to extend the repository methods to support new filters

---

## File Changes

### Frontend
1. **New:** `src/components/friends/enhanced-friend-search.tsx`
2. **Modify:** `src/components/friends/user-search-card.tsx` (add more user info)
3. **Modify:** `src/lib/friends-api.ts` (extend SearchUsersParams)
4. **Modify:** `app/(dashboard)/friends/friends-content.tsx` (use new component)

### Backend (if API changes needed)
1. **Modify:** `backend/src/repositories/friends.repository.ts`
2. **Modify:** `backend/src/services/friends.service.ts`
3. **Modify:** `backend/src/routes/friends.ts`

---

## Implementation Order

1. Update `friends-api.ts` types and API call signature
2. Create `EnhancedFriendSearch` component
3. Create filter sub-components (InstituteFilter, BoardFilter, etc.)
4. Update `UserSearchCard` with enhanced display
5. Add search history localStorage logic
6. Update `FriendsContent` to use new component
7. Test with Playwright

---

## Verification

Run existing E2E tests:
```bash
npx playwright test tests/e2e/
```

Manual verification:
1. Navigate to /friends
2. Test search by name
3. Test institute filter
4. Test board/class filters
5. Test search history persistence
6. Test empty state
7. Test error state

---

## Out of Scope

- Trending students section
- "People you may know" recommendations
- Rich profile improvements
- Chat UI changes
