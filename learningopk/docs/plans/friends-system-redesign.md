# Friends System Redesign - Implementation Plan

## Overview

Redesign the Friends System for LearningoPK with four cohesive features: Find Friends, Friend Requests, Chat, and Block. The existing implementation is functional but needs modernization with proper state machines, accessibility, and refined UI.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS + CSS custom properties (design tokens)
- **Icons**: Phosphor Icons (already in use)
- **Language**: TypeScript (strict mode)
- **API Layer**: Already exists at `@/lib/friends-api`

---

## Phase 1: UX Architect

### User Flows

#### Find Friends Flow
```
[User clicks "Find Friends" tab]
    → SearchInput focused
    → User types query (debounced 300ms)
    → Loading state (skeleton cards)
    → Results displayed OR "No users found" empty state
    → User clicks "Add Friend" on a result card
    → Button transitions to "Pending..." (disabled)
    → Success: Button shows "Request Sent" (secondary)
    → Can click "Cancel" to undo
```

#### Friend Request Flow
```
[User receives request]
    → Request appears in "Requests" tab with badge count
    → User can Accept or Decline
    → Accept: Request moves to Friends list
    → Decline: Request removed (with confirmation)
    
[User sends request]
    → Appears in "Sent Requests" section
    → Can cancel pending request
```

#### Chat Flow
```
[User clicks "Message" on friend card]
    → Opens ChatWindow component
    → Message history loaded (paginated)
    → User types message in input bar
    → Press Enter or click Send
    → Message appears immediately (optimistic)
    → Sent → Delivered → Read status updates
    → User can Block friend from chat header
```

#### Block Flow
```
[User clicks "Block" action]
    → BlockFriendModal opens (portal)
    → Shows user name and warning text
    → Requires explicit confirmation ("Block" button)
    → On confirm: 
        - API call to block user
        - Friend removed from friends list
        - Chat closed if open
        - Modal closes
        - Toast notification shown
    → Blocked users cannot find or message each other
```

### Screen States

| Component | Empty | Loading | Success | Error | Edge Cases |
|-----------|-------|---------|---------|-------|------------|
| `FriendSearch` | "No users found" with illustration | Skeleton cards (3-5) | User cards list | "Search failed" with retry | Self-search blocked, Rate limited |
| `FriendRequestButton` | N/A | Spinner + "Sending..." | "Request Sent" / "Friends" | "Failed, try again" | Already friends, Blocked user |
| `ChatWindow` | "No messages yet" centered | Message skeletons | Message bubbles | "Connection lost" banner | Blocked user, Offline friend |
| `BlockFriendModal` | N/A | Spinner on confirm | Modal closes, UI updates | Error toast, modal stays open | Cannot block self |

### Component Tree

```
FriendsDemoPage
├── DemoHeader ("Friends System Demo")
├── TabNav (Find | Requests | Friends | Chat)
└── TabContent
    ├── [FindTab] ──────────────────────────────────────
    │   └── FriendSearch
    │       ├── SearchInput (debounced 300ms)
    │       ├── FilterBar (optional institute filter)
    │       ├── SearchResultsList
    │       │   └── UserCard[] (with FriendRequestButton)
    │       └── EmptyState (when no results)
    │
    ├── [RequestsTab] ──────────────────────────────────
    │   ├── IncomingRequestsSection
    │   │   └── RequestCard[] (Accept/Decline buttons)
    │   └── OutgoingRequestsSection
    │       └── RequestCard[] (Cancel button)
    │
    ├── [FriendsTab] ──────────────────────────────────
    │   └── FriendsList
    │       └── FriendCard[] (Chat, Block actions)
    │
    └── [ChatTab] ─────────────────────────────────────
        └── ChatWindow
            ├── ChatHeader (friend name, status, block action)
            ├── MessageList (virtualized scroll)
            │   └── MessageBubble[] (sent/received variants)
            └── MessageInput (auto-resize, send button)
            └── BlockFriendModal (portal, conditionally rendered)
```

### Navigation Patterns

- Main hub: `/friends` (tabs: Find, Requests, Friends, Chat)
- Direct chat: `/messages/[conversationId]` (existing, reuse ChatWindow)

---

## Phase 2: UI Designer

### Design Token System

```typescript
// Design tokens for Friends System (extends existing CSS vars)
export const friendsTokens = {
  // Spacing scale (4px base)
  space: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
  },
  
  // Border radius
  radius: {
    sm: '0.25rem',   // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    '2xl': '1rem',   // 16px
    full: '9999px',
  },
  
  // Shadows
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
  
  // Typography
  font: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
  },
  
  // Animation
  transition: {
    fast: '150ms ease',
    normal: '300ms ease',
    slow: '500ms ease',
  },
  
  // Z-index scale
  z: {
    dropdown: '50',
    modal: '100',
    toast: '150',
  },
}
```

### Component Specifications

#### FriendSearch
- Max width: 640px centered
- Search input: Full width, 44px height, 16px horizontal padding
- Results list: Stack with 12px gap
- Card padding: 16px
- Avatar: 48x48px rounded-full

#### FriendRequestButton (State Machine)
```
States:
  idle → [user clicks "Add Friend"]
    → pending (spinner, disabled) → [API success]
    → accepted (shows "Friends", disabled) OR [API failure]
    → error (shows "Failed, tap to retry")
  
  idle → [user clicks "Cancel" on pending]
    → canceling (spinner) → [API success]
    → idle (back to "Add Friend") OR [API failure]
    → error

  accepted → [already friends, no action available]
```

#### ChatWindow
- Container: Full width, max-height 600px
- Header: 64px height, sticky top
- Message list: Flex-1, overflow-y auto, padding 16px
- Message bubbles: 
  - Max width: 70%
  - Sent: Primary color background, right-aligned
  - Received: Secondary background, left-aligned
  - Padding: 8px 12px
  - Border radius: 16px (with tail for chat bubble effect)
- Input bar: 56px height, sticky bottom, full width

#### BlockFriendModal
- Width: 400px max, centered
- Padding: 24px
- Backdrop: rgba(0,0,0,0.5) with blur
- Enter animation: fade + scale from 95%
- Exit animation: fade + scale to 95%

### Interactive States

| Element | Default | Hover | Active | Disabled | Loading |
|---------|---------|-------|--------|---------|---------|
| Button (Primary) | bg-primary, text-white | bg-primary-hover, translateY(-1px) | scale(0.98) | opacity-50, cursor-not-allowed | Spinner |
| Button (Secondary) | border-border, bg-card | border-primary/40 | scale(0.98) | opacity-50 | Spinner |
| SearchInput | border-border | border-primary/40 | ring-2 ring-primary | bg-muted | Spinner in right |
| UserCard | shadow-sm | shadow-md, translateY(-2px) | - | - | Skeleton overlay |
| MessageBubble | fade-in 200ms | - | - | - | Opacity reduced |

---

## Phase 3: Frontend Developer

### File Structure

```
frontend/
├── app/
│   └── friends/
│       └── demo/
│           └── page.tsx              # Unified demo page
└── components/
    └── friends/
        ├── friend-search.tsx         # <FriendSearch />
        ├── friend-request-button.tsx  # <FriendRequestButton />
        ├── chat-window.tsx           # <ChatWindow />
        ├── block-friend-modal.tsx    # <BlockFriendModal />
        ├── user-card.tsx            # Search result card
        ├── request-card.tsx         # Request display card
        ├── friend-card.tsx          # Friend list card
        ├── message-bubble.tsx       # Chat message bubble
        ├── message-input.tsx         # Chat input bar
        └── skeletons.tsx            # Loading skeleton components
```

### Component APIs

```typescript
// ============================================
// FriendSearch
// ============================================
interface FriendSearchProps {
  onUserSelect?: (user: UserSearchResult) => void;
  excludeUserIds?: string[];
  className?: string;
}

// ============================================
// FriendRequestButton (State Machine)
// ============================================
type RequestState = 'idle' | 'sending' | 'pending' | 'canceling' | 'accepted' | 'error';

interface FriendRequestButtonProps {
  userId: string;
  initialState?: RequestState;
  currentStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked';
  onStateChange?: (state: RequestState) => void;
  onAddFriend?: (userId: string) => Promise<void>;
  onCancelRequest?: (userId: string) => Promise<void>;
}

// ============================================
// ChatWindow
// ============================================
interface ChatWindowProps {
  friendId: string;
  friendName: string;
  friendImage?: string | null;
  isOnline?: boolean;
  messages: Message[];
  onSendMessage: (content: string) => Promise<void>;
  onLoadMore?: (before: string) => Promise<void>;
  onBlockFriend?: (friendId: string) => void;
  isLoading?: boolean;
  isSending?: boolean;
}

// ============================================
// BlockFriendModal
// ============================================
interface BlockFriendModalProps {
  isOpen: boolean;
  user: {
    id: string;
    name: string;
    image?: string | null;
  };
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}
```

### Implementation Requirements

1. **FriendSearch**
   - Debounce search input (300ms)
   - Show skeleton loading during API call
   - Handle empty results with illustration
   - Include institute filter dropdown

2. **FriendRequestButton**
   - State machine with proper transitions
   - Optimistic UI updates
   - Error recovery with retry
   - Accessible (aria-busy, aria-live)

3. **ChatWindow**
   - Virtualized message list (for performance)
   - Auto-scroll to bottom on new messages
   - Optimistic message sending
   - Message status indicators (sent/delivered/read)
   - Timestamps grouped by day

4. **BlockFriendModal**
   - Portal-based (rendered outside page flow)
   - Focus trap when open
   - Escape key to close
   - Backdrop click to close (with confirmation if loading)
   - Post-block callback for UI updates

### Accessibility Requirements

- All buttons: `aria-label` describing action
- Loading states: `aria-busy="true"`
- Live regions: `aria-live="polite"` for status changes
- Focus management: Return focus to trigger on modal close
- Keyboard navigation: Tab through all interactive elements
- Screen reader: Announce message sent/received

### Testing Approach

Each component should have:
- Unit tests for state transitions
- Integration tests for API calls
- Accessibility tests (axe-core)
- Snapshot tests for UI consistency

---

## Deliverables

| Phase | Deliverable | Location |
|-------|-------------|----------|
| 1 | Flow diagram + component tree | This document |
| 2 | Design tokens + specs | `docs/plans/friends-system-design.md` |
| 3 | FriendSearch component | `components/friends/friend-search.tsx` |
| 3 | FriendRequestButton component | `components/friends/friend-request-button.tsx` |
| 3 | ChatWindow component | `components/friends/chat-window.tsx` |
| 3 | BlockFriendModal component | `components/friends/block-friend-modal.tsx` |
| 3 | Demo page | `app/friends/demo/page.tsx` |

---

## Implementation Order

1. Design tokens + shared types
2. FriendRequestButton (self-contained state machine)
3. ChatWindow (most complex UI)
4. BlockFriendModal (portal-based)
5. FriendSearch (integration point)
6. Demo page (wiring everything together)
