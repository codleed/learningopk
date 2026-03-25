# Friends System - UX Architecture

## Document Info
- **Architect**: UX Architect
- **Date**: 2026-03-25
- **Project**: LearningoPK Friends System Redesign
- **Scope**: Find Friends, Friend Requests, Chat, Block features

---

## 1. Verified Flows

### 1.1 Find Friends Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FIND FRIENDS FLOW                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

User enters Find Tab
        │
        ▼
┌─────────────────┐
│ SearchInput     │◄────────── Focus state (outline ring)
│ (debounced)     │
└─────────────────┘
        │ 300ms debounce
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SEARCH STATES                                                                │
│                                                                              │
│  [Loading]          [Empty Results]       [Results]         [Error]        │
│  ─────────          ─────────────         ────────          ────────        │
│  3-5 Skeletons      "No users found"      UserCard list     "Search failed"  │
│  with shimmer       + illustration        + pagination      + Retry button  │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ USER CARD ACTIONS                                                            │
│                                                                              │
│  friendStatus: none         → [Add Friend] button                           │
│  friendStatus: pending_sent → [Cancel] button (undo)                        │
│  friendStatus: pending_rcvd → [Respond] button (navigates to Requests tab)   │
│  friendStatus: friends      → [Friends] badge (disabled)                    │
│  friendStatus: blocked      → [Blocked] badge (disabled)                     │
│  self (if returned)         → Card not shown (filtered at API level)        │
└─────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRIEND REQUEST STATE MACHINE                                                 │
│                                                                              │
│  ┌──────┐  click  ┌──────────┐  success  ┌─────────┐                        │
│  │ idle │────────►│ sending  │──────────►│ pending │                        │
│  └──────┘         └──────────┘           └─────────┘                        │
│     ▲                 │                        │                            │
│     │                 │ error                  │ cancel click              │
│     │                 ▼                        ▼                            │
│     │           ┌──────────┐            ┌───────────┐                       │
│     │           │  error   │            │ canceling │                       │
│     │           └──────────┘            └───────────┘                       │
│     │                                         │                              │
│     │            ┌───────────────────────────┘                              │
│     │            │ (back to idle on success)                                 │
│     └────────────┘                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Edge Cases Addressed:**
- Rate limiting: Show "Too many searches, try again later" with cooldown timer
- Self-search: API filters out current user, no UI handling needed
- Empty query: Disable search, show hint text "Enter a name to search"

---

### 1.2 Friend Request Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRIEND REQUEST FLOW                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

INCOMING REQUESTS
─────────────────
Request received (via polling/websocket)
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ REQUEST CARD (incoming type)                                                 │
│                                                                              │
│  Sender avatar, name, institute, time ago                                    │
│                                                                              │
│  [Accept] ──────────────────────────────────────────► Request moves to       │
│    │                                                          Friends list    │
│    │ error ──────────────────────────────────────────► Error toast          │
│    │                                                          + retry option  │
│    │                                                                          
│  [Decline] ─────────────────────────────────────────► Confirmation dialog    │
│    │                                                           (optional)     │
│    │                                                           │              │
│    │                                                           ▼              │
│    │                                                    Request removed       │
│    │                                                    from list             │
└─────────────────────────────────────────────────────────────────────────────┘

OUTGOING REQUESTS
─────────────────
Request sent (optimistic update)
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ REQUEST CARD (outgoing type)                                                 │
│                                                                              │
│  Recipient avatar, name, institute, "Request sent" + time ago              │
│                                                                              │
│  [Cancel] ──────────────────────────────────────────► Request removed       │
│    │                                                          from sent list   │
│    │ error ──────────────────────────────────────────► Error toast          │
│    │                                                          + Request stays │
└─────────────────────────────────────────────────────────────────────────────┘

ACCEPTANCE FROM SEARCH
──────────────────────
When user accepts a pending_received request from search context:
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. API: acceptFriendRequest(requestId)                                      │
│ 2. Success: Update friendStatus to 'friends' in search results              │
│ 3. Success: Show toast "You are now friends with {name}"                    │
│ 4. Success: Button changes to [Friends] disabled                            │
│ 5. Navigate to Friends tab (optional)                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**State Machine States:**
| State | Button Text | Button State | Actions Available |
|-------|-------------|--------------|-------------------|
| idle | Add Friend | enabled | click to send |
| sending | Sending... | disabled + spinner | none |
| pending | Cancel | enabled | click to cancel |
| canceling | Canceling... | disabled + spinner | none |
| accepted | Friends | disabled | none (after acceptance) |
| error | Failed, tap to retry | enabled | click to retry |

---

### 1.3 Chat Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CHAT FLOW                                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

OPEN CHAT
─────────
User clicks [Message] on FriendCard
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ CHAT WINDOW                                                                  │
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────────────┐  │
│ │ HEADER                                                                  │  │
│ │ ┌──────┐  Friend Name                          [Block] [Close]       │  │
│ │ │avatar│  Online/Last seen                                              │  │
│ │ └──────┘                                                               │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────────────┐  │
│ │ MESSAGE LIST (scrollable, virtualized)                                 │  │
│ │                                                                         │  │
│ │  ┌─────────────────────────────┐  ┌─────────────────────────────┐      │  │
│ │  │ [Avatar] Message text       │  │           Message text [V] │      │  │
│ │  │            12:34 PM          │  │           12:35 PM         │      │  │
│ │  └─────────────────────────────┘  └─────────────────────────────┘      │  │
│ │                                                                         │  │
│ │  [Load More] button if hasMore (loads older messages)                  │  │
│ │                                                                         │  │
│ │  ┌─────────────────────────────┐  ┌─────────────────────────────┐      │  │
│ │  │ [Avatar] Message with media  │  │           Message text [V] │      │  │
│ │  │ [📷 Image]                   │  │           ✓✓ (read)        │      │  │
│ │  └─────────────────────────────┘  └─────────────────────────────┘      │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────────────┐  │
│ │ INPUT BAR (sticky bottom)                                             │  │
│ │                                                                         │  │
│ │  [📎] [                    Message input                    ] [Send]   │  │
│ └────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

MESSAGE SENDING (Optimistic)
────────────────────────────
User types message + Enter/click Send
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Generate temp message ID                                                 │
│ 2. Append message to UI immediately (sent:sent status)                      │
│ 3. Clear input                                                              │
│ 4. API: sendMessage(conversationId, body)                                   │
│ 5. Success: Update temp ID → real ID, status: sent                          │
│ 6. Background: Poll/websocket updates status → delivered → read            │
│ 7. Error: Show retry indicator on message                                    │
│          User clicks retry → resend or delete                               │
└─────────────────────────────────────────────────────────────────────────────┘

MESSAGE STATUS INDICATORS
─────────────────────────
┌─────────────────────────────────────────────────────────────────────────────┐
│ Single check (✓)  = Message sent to server                                  │
│ Double check (✓✓) = Message delivered to recipient                          │
│ Double check (✓✓) with "Read" text = Message read by recipient              │
└─────────────────────────────────────────────────────────────────────────────┘

PAGINATION (Load Older Messages)
─────────────────────────────────
User scrolls to top of message list
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Show [Load earlier messages] button or auto-load on scroll               │
│ 2. Show skeleton messages while loading                                     │
│ 3. API: getMessages(conversationId, 50, before=oldestMessageId)             │
│ 4. Prepend older messages to list                                            │
│ 5. Maintain scroll position                                                  │
│ 6. Hide [Load earlier] button if hasMore=false                              │
└─────────────────────────────────────────────────────────────────────────────┘

EDGE CASES
──────────
- Blocked user: Show "You cannot message this user" + unblock option
- Offline friend: Messages queue, deliver when friend comes online
- Connection lost: Banner "Connection lost, retrying..." with auto-retry
- Empty chat: "No messages yet. Say hello!" centered illustration
- Media messages: Show image/file preview, click to view full size
```

---

### 1.4 Block Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ BLOCK FLOW                                                                   │
└─────────────────────────────────────────────────────────────────────────────┘

TRIGGER POINTS
──────────────
- Chat header [Block] button
- FriendCard [Remove] dropdown → "Block User" option
- UserSearchCard (future: not currently in component)

INITIATE BLOCK
──────────────
User clicks [Block]
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ BLOCK FRIEND MODAL (portal, centered, backdrop blur)                         │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                                                                      │    │
│  │   [Avatar]                                    [X close]              │    │
│  │                                                                      │    │
│  │   Block {UserName}?                                                  │    │
│  │                                                                      │    │
│  │   They will not be able to:                                          │    │
│  │   • See your profile                                                 │    │
│  │   • Find you in search                                               │    │
│  │   • Send you messages                                                │    │
│  │                                                                      │    │
│  │   Your conversation will be deleted.                                │    │
│  │                                                                      │    │
│  │   ┌─────────────────────────────────────┐                            │    │
│  │   │           Cancel                    │                            │    │
│  │   └─────────────────────────────────────┘                            │    │
│  │   ┌─────────────────────────────────────┐                            │    │
│  │   │        Block User (red)            │                            │    │
│  │   └─────────────────────────────────────┘                            │    │
│  │                                                                      │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

CONFIRM BLOCK
─────────────
User clicks [Block User]
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Show loading spinner on confirm button                                    │
│ 2. API: blockUser(userId)                                                    │
│ 3. Success:                                                                  │
│    a. Close modal                                                            │
│    b. Remove user from friends list (if was friend)                          │
│    c. Close chat window if open                                              │
│    d. Delete conversation: deleteConversation(conversationId)              │
│    e. Show toast "User blocked"                                              │
│    f. Navigate away if in chat context                                       │
│ 4. Failure:                                                                   │
│    a. Show error toast "Failed to block user"                                 │
│    b. Keep modal open                                                        │
│    c. Re-enable confirm button                                               │
└─────────────────────────────────────────────────────────────────────────────┘

UNBLOCK FLOW
────────────
User navigates to Settings → Privacy → Blocked Users
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ BLOCKED USERS LIST                                                           │
│                                                                              │
│  BlockedUserCard                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ [Avatar] Name                           [Unblock] button            │    │
│  │          Blocked on: Jan 15, 2026                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Unblock: API unblockUser(userId)                                           │
│           Success: Remove from list, show toast "User unblocked"           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Screen States Matrix

### 2.1 Find Friends / Search Tab

| State | Trigger | UI Display | Actions Available |
|-------|---------|------------|-------------------|
| **Initial** | Tab opened, no input | Empty search hint | Type in search |
| **Typing** | User entering text | Clear button appears | Continue typing, clear |
| **Loading** | 300ms after typing stops | 3-5 skeleton cards | Wait, cancel (clear) |
| **Results** | API returns users | UserCard list | Click Add/Cancel, scroll |
| **Empty Results** | Query returned 0 users | "No users found" + illustration | Modify query, clear |
| **Error** | API failure | "Search failed" + retry | Retry, modify query |
| **Rate Limited** | 429 response | "Too many requests" + cooldown | Wait, retry after timer |

### 2.2 Friend Requests Tab

| State | Trigger | UI Display | Actions Available |
|-------|---------|------------|-------------------|
| **Initial** | Tab opened | Load requests | Wait for data |
| **Loading** | Fetching requests | Skeleton cards (2-3) | Wait |
| **Has Incoming** | Incoming requests exist | Incoming section expanded | Accept, Decline |
| **Has Outgoing** | Outgoing requests exist | Outgoing section | Cancel |
| **Empty** | No requests of either type | "No friend requests" | Send friend requests (nav to Find) |
| **Incoming Empty, Outgoing Exists** | Only sent requests | Show outgoing only | Cancel sent |
| **Error** | API failure | "Failed to load" + retry | Retry |

### 2.3 Friends Tab

| State | Trigger | UI Display | Actions Available |
|-------|---------|------------|-------------------|
| **Initial** | Tab opened | Load friends | Wait for data |
| **Loading** | Fetching friends | Skeleton cards (3-5) | Wait |
| **Has Friends** | Friends exist | FriendCard list | Message, Remove/Block |
| **Empty** | No friends | "No friends yet" + illustration | Find friends (nav link) |
| **Error** | API failure | "Failed to load" + retry | Retry |

### 2.4 Chat View

| State | Trigger | UI Display | Actions Available |
|-------|---------|------------|-------------------|
| **Initial** | Chat opened | Load messages | Wait |
| **Loading** | Fetching messages | Message skeletons | Wait |
| **Has Messages** | Messages exist | MessageBubble list | Scroll, send message |
| **Empty** | 0 messages | "Say hello!" + illustration | Send first message |
| **Loading More** | User scrolls up | Skeleton bubbles at top | Wait |
| **Sending** | Message submitted | Optimistic message | None (wait) |
| **Error (send)** | Send API fails | Retry indicator on message | Retry, delete |
| **Connection Lost** | Network failure | Red banner "Reconnecting..." | Auto-retry, wait |
| **Blocked** | Other user blocked you | "Cannot message" message | None, unblock flow |
| **Offline** | Friend is offline | "Friend offline" indicator | Send (queued) |

### 2.5 Block Modal

| State | Trigger | UI Display | Actions Available |
|-------|---------|------------|-------------------|
| **Closed** | Default | Not rendered | None |
| **Open** | User clicks Block | Modal with user info | Cancel, Confirm |
| **Loading** | Confirm clicked | Spinner on button | Cancel only |
| **Error** | Block API fails | Error toast | Retry, Cancel |

---

## 3. Component Interaction Map

### 3.1 Component Hierarchy

```
FriendsDemoPage (page.tsx)
├── DemoHeader
├── TabNav (Find | Requests | Friends | Chat)
└── TabContent
    │
    ├── FindTab
    │   └── FriendSearch
    │       ├── SearchInput (debounced)
    │       ├── FilterBar (institute dropdown) [NOT IN EXISTING COMPONENTS]
    │       └── SearchResultsList
    │           └── UserSearchCard[]
    │               └── FriendRequestButton (inline state machine)
    │
    ├── RequestsTab
    │   ├── IncomingRequestsSection
    │   │   └── FriendRequestCard[] (incoming)
    │   │       └── AcceptButton, DeclineButton
    │   └── OutgoingRequestsSection
    │       └── FriendRequestCard[] (outgoing)
    │           └── CancelButton
    │
    ├── FriendsTab
    │   └── FriendsList
    │       └── FriendCard[]
    │           └── MessageButton, RemoveButton
    │
    └── ChatTab
        └── ChatWindow
            ├── ChatHeader
            │   ├── FriendInfo
            │   ├── BlockButton → BlockFriendModal
            │   └── CloseButton
            ├── MessageList (virtualized)
            │   └── MessageBubble[]
            │       ├── SentBubble (right-aligned)
            │       └── ReceivedBubble (left-aligned)
            ├── LoadMoreButton (if hasMore)
            └── MessageInput
                ├── TextInput
                └── SendButton

BlockFriendModal (portal)
├── Backdrop
└── ModalContent
    ├── UserInfo
    ├── WarningText
    ├── CancelButton
    └── ConfirmButton
```

### 3.2 Component Communication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PARENT → CHILD (props)                                                       │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  FriendSearch → UserSearchCard                                              │
│    props: { user, excludeUserIds?, onAddFriend, onCancelRequest }           │
│                                                                              │
│  FriendRequestCard → Button                                                  │
│    props: { onClick, disabled, variant, children, isLoading? }              │
│                                                                              │
│  ChatWindow → MessageBubble                                                  │
│    props: { message, isOwnMessage, showAvatar }                             │
│                                                                              │
│  BlockFriendModal → Button                                                   │
│    props: { onConfirm, onCancel, isLoading }                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ CHILD → PARENT (callbacks)                                                   │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  UserSearchCard → FriendSearch                                               │
│    onAddFriend(userId), onCancelRequest(userId), onBlock(userId)           │
│                                                                              │
│  FriendRequestCard → RequestsTab                                             │
│    onAccept(requestId), onDecline(requestId), onCancel(requestId)           │
│                                                                              │
│  FriendCard → FriendsTab                                                     │
│    onMessage(friendId), onRemove(friendId)                                   │
│                                                                              │
│  ChatWindow → ChatTab                                                        │
│    onSendMessage(content), onLoadMore(beforeMessageId),                     │
│    onBlock(friendId), onClose()                                              │
│                                                                              │
│  BlockFriendModal → ChatWindow/FriendsTab                                    │
│    onConfirm(), onCancel()                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ SHARED STATE (React Context / State Lifting)                                 │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  FriendsContext (proposed)                                                   │
│    ├── friends: Friend[]                                                     │
│    ├── incomingRequests: FriendRequest[]                                    │
│    ├── outgoingRequests: FriendRequest[]                                    │
│    ├── blockedUsers: BlockedUser[]                                          │
│    ├── isLoading: boolean                                                   │
│    ├── error: Error | null                                                  │
│    └── actions: { refresh, addFriend, cancelRequest, accept, decline,      │
│                   remove, block, unblock }                                   │
│                                                                              │
│  ChatContext (proposed)                                                       │
│    ├── activeConversation: Conversation | null                              │
│    ├── messages: Message[]                                                   │
│    ├── isLoading: boolean                                                    │
│    ├── isSending: boolean                                                    │
│    ├── hasMore: boolean                                                      │
│    └── actions: { loadMessages, loadMore, sendMessage, markRead }          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ API INTEGRATION (friends-api.ts)                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  FriendSearch uses:                                                          │
│    - searchUsers({ query, instituteId?, limit, offset })                   │
│    - getInstitutes() → for filter dropdown                                  │
│                                                                              │
│  FriendRequestButton uses:                                                   │
│    - addFriend(userId)                                                       │
│    - cancelFriendRequest(userId)                                             │
│                                                                              │
│  FriendRequestCard uses:                                                     │
│    - acceptFriendRequest(requestId)                                          │
│    - declineFriendRequest(requestId)                                         │
│                                                                              │
│  FriendCard uses:                                                            │
│    - removeFriend(userId)                                                    │
│                                                                              │
│  ChatWindow uses:                                                            │
│    - getMessages(conversationId, limit, before?)                            │
│    - sendMessage(conversationId, body?, media?)                             │
│    - deleteMessage(messageId)                                               │
│    - markMessageAsRead(conversationId)                                       │
│                                                                              │
│  BlockFriendModal uses:                                                       │
│    - blockUser(userId)                                                       │
│    - unblockUser(userId)                                                     │
│                                                                              │
│  Page/Context uses:                                                          │
│    - getFriends()                                                            │
│    - getFriendRequests()                                                     │
│    - getConversations()                                                      │
│    - getBlockedUsers()                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Key Gaps Identified

| Component | Missing | Impact | Priority |
|-----------|---------|--------|----------|
| FriendSearch | Institute filter dropdown | Cannot filter by institute | High |
| FriendSearch | Rate limit handling UI | Poor UX when rate limited | High |
| FriendRequestCard | Decline confirmation dialog | Too quick to decline | Medium |
| FriendRequestCard | pending_received → Respond action | Should navigate to Requests tab | High |
| ChatWindow | Real-time status updates (WebSocket/polling) | Status always shows "sent" | High |
| ChatWindow | Message pagination UI | Cannot load older messages | High |
| ChatWindow | Block from chat context | BlockFriendModal not integrated | High |
| UserSearchCard | Block action | Should show block option | Medium |
| BlockFriendModal | Not implemented | Block feature incomplete | High |
| Page | Context providers | State scattered, prop drilling | High |
| Page | Notification bell integration | Requests not surfaced | Medium |
| Page | Privacy settings link | Cannot manage privacy | Low |

---

## 4. Navigation Architecture

### 4.1 Page Routes

```
/friends                 → FriendsDemoPage (main hub)
  ├── Find tab (default) → FriendSearch with search/filter
  ├── Requests tab       → Incoming + Outgoing requests
  ├── Friends tab        → Friends list
  └── Chat tab           → Chat window (requires selected friend)

/messages                → Messages page (conversation list)
/messages/[id]           → Direct chat conversation
```

### 4.2 Tab Navigation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TAB NAVIGATION                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   Find   │  │ Requests │  │ Friends  │  │   Chat   │
│  (tab)   │  │  (tab)   │  │  (tab)   │  │  (tab)   │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │              │              │              │
     │              │              │              │
     ▼              ▼              ▼              ▼
┌─────────┐   ┌──────────┐  ┌─────────┐   ┌──────────┐
│ Search  │   │ Incoming  │  │ Friends │   │ Select   │
│ Results │   │ Requests  │  │  List   │   │ Conversation │
│         │   ├──────────┤  │         │   │    or    │
│         │   │ Outgoing │  │         │   │ Empty    │
│         │   │ Requests │  │         │   │ State    │
└─────────┘   └──────────┘  └─────────┘   └──────────┘

CROSS-TAB NAVIGATION:
─────────────────────
Find → "pending_received" status → Click "Respond" → Navigate to Requests tab
Find → Add Friend success → Optional toast → Stay on Find
Requests → Accept incoming → Request moves to Friends list
Friends → Click Message → Navigate to Chat tab with friend selected
Chat → Click Block → Open BlockFriendModal
Chat → Block confirmed → Navigate to Friends tab
```

### 4.3 Inter-Feature Navigation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FEATURE TRANSITIONS                                                         │
└─────────────────────────────────────────────────────────────────────────────┘

FIND FRIENDS → FRIEND REQUESTS
────────────────────────────
Trigger: User clicks "Respond" on pending_received user
Action: Navigate to Requests tab, scroll to incoming section
Toast: "You have a friend request from {name}"

FIND FRIENDS → FRIENDS LIST
──────────────────────────
Trigger: Outgoing request accepted by other user
Action: (Passive) Request removed from outgoing, appears in requestor's incoming
Toast: "{name} accepted your friend request" (notification)

FRIEND REQUESTS → FRIENDS LIST
─────────────────────────────
Trigger: Accept incoming request
Action: Move friend to Friends list, remove from Requests
Toast: "You are now friends with {name}"

FRIENDS → CHAT
──────────────
Trigger: Click "Message" on FriendCard
Action: Navigate to Chat tab, load conversation with friend
Data: Fetch messages for conversation

CHAT → FRIENDS
──────────────
Trigger: Click [X] close or navigate away
Action: Return to Friends tab or previous page
Cleanup: Clear active conversation state

BLOCK → FRIENDS
──────────────
Trigger: Confirm block from chat
Action: Remove from Friends list, close chat
Toast: "{name} has been blocked"
```

---

## 5. Missing Flows - Recommended Additions

### 5.1 Remove Friend Flow (Not Documented)

The plan mentions "Remove" action on FriendCard but no dedicated flow exists.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ REMOVE FRIEND FLOW                                                           │
└─────────────────────────────────────────────────────────────────────────────┘

TRIGGER: User clicks remove icon on FriendCard
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ CONFIRMATION (optional but recommended)                                      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Remove {FriendName}?                                                  │  │
│  │                                                                       │  │
│  │  You will no longer be friends. You can find and add them again.      │  │
│  │                                                                       │  │
│  │  [Cancel]                              [Remove]                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  If confirmed:                                                               │
│    1. API: removeFriend(userId)                                              │
│    2. Remove from friends list                                               │
│    3. Toast: "Removed {name} from friends"                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Privacy Settings Flow

The API supports privacy settings but no UI flow is documented.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY SETTINGS FLOW                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

TRIGGER: User navigates to Settings → Friends & Privacy
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PRIVACY SETTINGS FORM                                                        │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Who can find me?                                                     │   │
│  │  ┌──────────────────────────────────────────────────────────────┐     │   │
│  │  │  ○ Everyone  ○ Friends of friends  ● Nobody                 │     │   │
│  │  └──────────────────────────────────────────────────────────────┘     │   │
│  │                                                                       │   │
│  │  Who can send me friend requests?                                     │   │
│  │  ┌──────────────────────────────────────────────────────────────┐     │   │
│  │  │  ● Everyone  ○ Friends of friends                            │     │   │
│  │  └──────────────────────────────────────────────────────────────┘     │   │
│  │                                                                       │   │
│  │  Show online status                                                   │   │
│  │  ┌──────────────────────────────────────────────────────────────┐     │   │
│  │  │  [Toggle: On/Off]                                            │     │   │
│  │  └──────────────────────────────────────────────────────────────┘     │   │
│  │                                                                       │   │
│  │  Show last seen                                                       │   │
│  │  ┌──────────────────────────────────────────────────────────────┐     │   │
│  │  │  [Toggle: On/Off]                                            │     │   │
│  │  └──────────────────────────────────────────────────────────────┘     │   │
│  │                                                                       │   │
│  │  [Save Changes]                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Notifications Integration

The API supports notifications but no integration is documented.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ NOTIFICATIONS FLOW                                                           │
└─────────────────────────────────────────────────────────────────────────────┘

NOTIFICATION TYPES FOR FRIENDS:
───────────────────────────────
- friend_request_received: "{name} sent you a friend request"
- friend_request_accepted: "{name} accepted your friend request"
- new_message: "{name} sent you a message" (when app in background)

BELL ICON IN HEADER:
────────────────────
- Shows unread count badge
- Click opens NotificationPanel
- Panel shows recent notifications with timestamps
- Click notification → navigate to relevant feature
```

---

## 6. API-Component Gap Analysis

### 6.1 Type Misalignments

| Component | Component Props | API Types | Gap |
|-----------|-----------------|-----------|-----|
| ChatWindow | `friendId: string` | `getMessages` takes `conversationId` | Need conversation ID lookup or pass conversationId |
| ChatWindow | `isOnline?: boolean` | `Friend.isOnline` | OK |
| ChatWindow | `messages: Message[]` | `Message` type has `mediaType`, `mediaUrl` | Not displayed in current component |
| UserSearchCard | `onBlock?: (userId) => void` | `blockUser(userId)` exists | Button not implemented in current component |
| FriendCard | `onRemove?: (friendId) => void` | `removeFriend(userId)` exists | OK |

### 6.2 Missing API Calls in Components

| Component | Needed API | Status |
|-----------|-----------|--------|
| FriendSearch | `getInstitutes()` | Not used |
| FriendRequestCard | None missing | OK |
| ChatWindow | `deleteMessage()` | Not exposed |
| ChatWindow | `markMessageAsRead()` | Not called on scroll |
| BlockFriendModal | `unblockUser()` | Not used (for unblock flow) |

---

## 7. Recommended Implementation Priorities

### Phase 1: Foundation (Must Have)
1. **FriendRequestButton state machine** - Already partially defined
2. **ChatWindow** - Core chat experience
3. **BlockFriendModal** - Block functionality

### Phase 2: Completeness (Should Have)
4. **FriendSearch institute filter** - Missing filter dropdown
5. **ChatWindow pagination** - Load older messages
6. **ChatWindow message status** - sent/delivered/read indicators
7. **Decline confirmation** - Better UX for decline
8. **Pending_received Respond action** - Navigate to requests

### Phase 3: Polish (Nice to Have)
9. **Real-time updates** - WebSocket integration
10. **Typing indicators** - Show when friend is typing
11. **Privacy settings UI** - Full settings form
12. **Notifications panel** - Bell icon integration

---

## 8. Accessibility Requirements

| Element | ARIA Attribute | Purpose |
|---------|----------------|---------|
| Search input | `role="searchbox"`, `aria-label` | Identify search functionality |
| Loading skeletons | `aria-busy="true"` | Announce loading state |
| Buttons with spinners | `aria-busy="true"` | Announce button loading |
| Status changes | `aria-live="polite"` | Announce status updates |
| Modal | `role="dialog"`, `aria-modal="true"` | Modal identification |
| Modal close | `aria-label="Close"` | Close button purpose |
| Tab list | `role="tablist"`, `role="tab"` | Tab navigation |
| Message list | `aria-label="Messages"` | Message container purpose |
| Toast notifications | `role="status"` | Non-intrusive announcements |

---

## 9. Document Summary

This UX architecture document provides:

1. **Verified Flows**: Complete user journeys for Find Friends, Friend Requests, Chat, and Block
2. **Screen States Matrix**: All possible states for each feature with triggers and actions
3. **Component Interaction Map**: How components communicate via props, callbacks, and context
4. **Navigation Architecture**: How users move between features and tabs
5. **Missing Flows**: Addendum for Remove Friend, Privacy Settings, and Notifications
6. **Gap Analysis**: Identified disconnects between API types and component implementations

**Next Steps**: Developer should use this document to:
- Implement missing components (BlockFriendModal, institute filter)
- Add missing interactions (pending_received respond, decline confirmation)
- Fix type misalignments (ChatWindow needs conversationId)
- Build context providers to avoid prop drilling
- Implement real-time features in later phase

---

*Document Version: 1.0*
*Last Updated: 2026-03-25*
*Architect: UX Architect Agent*
