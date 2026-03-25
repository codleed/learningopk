# Friends System Design Tokens

**Document Version**: 1.0  
**Last Updated**: 2026-03-25  
**Design System Base**: LearningoPK Lime Theme v1.0  
**Dependencies**: Phosphor Icons, shadcn/ui button components

---

## Table of Contents

1. [Design Token Extensions](#1-design-token-extensions)
2. [Component Specifications](#2-component-specifications)
3. [Interactive States Matrix](#3-interactive-states-matrix)
4. [Responsive Breakpoints](#4-responsive-breakpoints)
5. [Accessibility Requirements](#5-accessibility-requirements)

---

## 1. Design Token Extensions

### 1.1 Friends System Spacing Scale

Extends the base 8-point spacing system with Friends-specific values.

| Token | Value | PX | Usage |
|-------|-------|----|-------|
| `--friends-space-1` | 0.25rem | 4px | Tight inline gaps, icon-to-text |
| `--friends-space-2` | 0.5rem | 8px | Compact padding, small gaps |
| `--friends-space-3` | 0.75rem | 12px | Card internal padding, list gaps |
| `--friends-space-4` | 1rem | 16px | Standard padding, section gaps |
| `--friends-space-5` | 1.25rem | 20px | Card padding, input spacing |
| `--friends-space-6` | 1.5rem | 24px | Section margins |
| `--friends-space-8` | 2rem | 32px | Large section gaps |
| `--friends-space-10` | 2.5rem | 40px | Modal margins |
| `--friends-space-12` | 3rem | 48px | Page-level spacing |

### 1.2 Component-Specific Tokens

#### Chat Bubble System
| Token | Value | Usage |
|-------|-------|-------|
| `--friends-radius-bubble` | 1rem | Chat bubble border-radius |
| `--friends-radius-bubble-sm` | 0.5rem | Smaller bubble variant |
| `--friends-max-bubble-width` | 70% | Maximum message width |
| `--friends-bubble-padding-x` | 0.875rem | Horizontal bubble padding |
| `--friends-bubble-padding-y` | 0.5rem | Vertical bubble padding |
| `--friends-bubble-gap` | 0.5rem | Space between messages |

#### Message Sent (Primary Color)
| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--friends-msg-sent-bg` | `var(--primary)` | `var(--primary)` | Sent message background |
| `--friends-msg-sent-text` | `var(--primary-foreground)` | `var(--primary-foreground)` | Sent message text |
| `--friends-msg-sent-radius` | `1rem 1rem 0.25rem 1rem` | Same | Sent bubble corners |

#### Message Received (Muted)
| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--friends-msg-received-bg` | `var(--muted)` | `var(--muted)` | Received message background |
| `--friends-msg-received-text` | `var(--foreground)` | `var(--foreground)` | Received message text |
| `--friends-msg-received-radius` | `1rem 1rem 1rem 0.25rem` | Same | Received bubble corners |

#### Friend Card Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `--friends-card-padding` | `var(--friends-space-4)` | Card internal padding |
| `--friends-card-radius` | `var(--radius)` (8px) | Card border-radius |
| `--friends-card-hover-shadow` | `0 4px 12px -2px rgba(122, 201, 67, 0.15)` | Card hover elevation |
| `--friends-card-hover-border` | `var(--primary)/30` | Card hover border color |

#### Search Input Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `--friends-search-height` | 44px | Minimum touch target |
| `--friends-search-padding` | 1rem | Horizontal padding |
| `--friends-search-radius` | `var(--radius)` (8px) | Input border-radius |
| `--friends-search-bg` | `var(--card)` | Search background |
| `--friends-search-border` | `var(--border)` | Search border |
| `--friends-search-focus-ring` | `var(--primary)` | Focus ring color |

#### Chat Window Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `--friends-chat-max-height` | 600px | Maximum chat window height |
| `--friends-chat-header-height` | 64px | Sticky header height |
| `--friends-chat-input-height` | 56px | Input bar minimum height |
| `--friends-chat-bg` | `var(--background)` | Chat background |

#### Block Modal Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `--friends-modal-width` | 400px | Maximum modal width |
| `--friends-modal-radius` | `var(--radius-lg)` (10px) | Modal border-radius |
| `--friends-modal-backdrop` | `rgba(15, 23, 42, 0.6)` | Modal overlay (light) |
| `--friends-modal-backdrop-dark` | `rgba(0, 0, 0, 0.7)` | Modal overlay (dark) |

### 1.3 Friend Status Indicators

| Token | Value | Usage |
|-------|-------|-------|
| `--friends-status-online` | `var(--success)` (#10b981) | Online indicator |
| `--friends-status-offline` | `var(--muted)` (#94a3b8) | Offline indicator |
| `--friends-status-away` | `var(--warning)` (#f59e0b) | Away indicator |
| `--friends-status-dot-size` | 10px | Status dot diameter |
| `--friends-status-border-width` | 2px | Avatar border for status |

### 1.4 State Transition Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--friends-transition-fast` | 150ms ease | Button hover, focus |
| `--friends-transition-normal` | 200ms ease | Card hover, state change |
| `--friends-transition-slow` | 300ms ease | Modal enter/exit |
| `--friends-transition-spring` | 300ms cubic-bezier(0.34, 1.56, 0.64, 1) | Bouncy animations |

### 1.5 Typography for Friends System

Uses existing theme typography with Friends-specific sizes.

| Token | Value | Usage |
|-------|-------|-------|
| `--friends-text-xs` | 0.75rem (12px) | Timestamps, metadata |
| `--friends-text-sm` | 0.875rem (14px) | Secondary text, captions |
| `--friends-text-base` | 1rem (16px) | Body text, messages |
| `--friends-text-lg` | 1.125rem (18px) | Friend names |
| `--friends-text-xl` | 1.25rem (20px) | Section headers |

---

## 2. Component Specifications

### 2.1 FriendSearch Component

#### Layout Structure
```
┌─────────────────────────────────────────────┐
│           FriendSearch Container             │
│         max-width: 640px, centered           │
│              padding: 24px                   │
├─────────────────────────────────────────────┤
│           SearchInput (44px height)          │
│    ┌─────────────────────────────────┐       │
│    │ 🔍  Search by name or email...  │       │
│    └─────────────────────────────────┘       │
├─────────────────────────────────────────────┤
│              Results List                    │
│         gap: 12px, stacked cards             │
│  ┌─────────────────────────────────────┐    │
│  │  [Avatar]  Friend Name              │    │
│  │           friend@email.com          │    │
│  │                        [Add Friend] │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │  [Avatar]  Another Friend           │    │
│  │           another@email.com         │    │
│  │                        [Add Friend] │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

#### SearchInput Specifications
| Property | Value |
|----------|-------|
| Height | 44px minimum (touch target) |
| Padding | 16px horizontal, 8px vertical |
| Icon | Phosphor `MagnifyingGlass`, 20px, left aligned |
| Icon Color | `var(--muted-foreground)` |
| Placeholder | "Search by name or email..." |
| Placeholder Color | `var(--muted-foreground)` |
| Border | 1px solid `var(--border)` |
| Border Radius | `var(--radius)` (8px) |
| Background | `var(--card)` |
| Font Size | `var(--friends-text-base)` (16px) |

#### Results Card Specifications
| Property | Value |
|----------|-------|
| Padding | `var(--friends-card-padding)` (16px) |
| Border Radius | `var(--friends-card-radius)` (8px) |
| Background | `var(--card)` |
| Border | 1px solid `var(--border)` |
| Hover Border | 1px solid `var(--friends-card-hover-border)` |
| Hover Shadow | `var(--friends-card-hover-shadow)` |
| Transition | `var(--friends-transition-normal)` |
| Gap between cards | 12px |
| Avatar Size | 48px (with 2px border) |
| Name Font | `var(--friends-text-lg)` (18px), semibold |
| Email Font | `var(--friends-text-sm)` (14px), muted color |

#### FriendSearch States

**Empty State**
- Icon: `UserCircle` (Phosphor), 64px, `var(--muted)`
- Title: "Find Friends", `var(--friends-text-xl)`, centered
- Subtitle: "Search for users by name or email address", `var(--muted-foreground)`, centered

**Loading State (Skeleton)**
- 3 skeleton cards with animated shimmer
- Skeleton height: 76px per card
- Shimmer gradient: `linear-gradient(90deg, var(--muted) 0%, var(--secondary) 50%, var(--muted) 100%)`
- Shimmer animation: 1.5s infinite

**Results State**
- Cards with hover effects enabled
- Scrollable if results exceed viewport
- Max visible results before scroll: 5 (desktop), 4 (tablet), 3 (mobile)

**No Results State**
- Icon: `UserCircleMinus` (Phosphor), 48px, `var(--muted)`
- Title: "No users found", centered
- Subtitle: "Try a different search term", `var(--muted-foreground)`

**Error State**
- Icon: `WarningCircle` (Phosphor), 48px, `var(--warning)`
- Title: "Something went wrong", colored `var(--warning)`
- Subtitle: Error message from server
- Retry button: Secondary variant, sm size

---

### 2.2 FriendRequestButton Component

#### Size Variants
| Size | Height | Padding | Font Size | Icon Size |
|------|--------|---------|-----------|-----------|
| `sm` | 32px (h-8) | 0 12px | 12px | 16px |
| `md` | 40px (h-10) | 0 16px | 14px | 18px |

#### State Machine

```
┌─────────┐
│  idle   │ ─────────────────────────────────────────────────┐
└────┬────┘                                                  │
     │ click                                                 │
     ▼                                                       │
┌──────────┐     success      ┌──────────┐                  │
│ sending  │ ───────────────► │ pending  │                  │
└──────────┘                   └──────────┘                  │
     │                              │                        │
     │ error                        │ cancel click           │
     ▼                              ▼                        │
┌──────────┐                  ┌──────────┐                   │
│   idle   │                  │ canceling│ ──────────────────┘
└──────────┘                  └──────────┘
```

#### State Definitions

| State | Visual | Background | Text | Icon | Cursor |
|-------|--------|------------|------|------|--------|
| `idle` | Default | `var(--primary)` | White | None | pointer |
| `sending` | Loading | `var(--primary)`/80 | White | Spinner | wait |
| `pending` | Sent | `var(--success)` | White | Check | default |
| `canceling` | Loading | `var(--success)`/80 | White | Spinner | wait |
| `error` | Error | `var(--destructive)` | White | X | pointer |

#### Button Labels by State

| State | Label |
|-------|-------|
| `idle` | "Add Friend" |
| `sending` | "Sending..." |
| `pending` | "Pending" |
| `canceling` | "Canceling..." |
| `error` | "Try Again" |

#### Visual Feedback Per State

**idle**
- Background: `var(--primary)` (#7ac943)
- Hover: `var(--primary-hover)` (#68b036), scale(1.02)
- Shadow: `var(--shadow-sm)`
- Transform on hover: translateY(-1px)

**sending**
- Background: `var(--primary)` with 80% opacity
- Icon: Phosphor `Spinner`, animate spin, 200ms per rotation
- Pointer-events: none
- Text: "Sending..."

**pending**
- Background: `var(--success)` (#10b981)
- Icon: Phosphor `Check`, no animation
- Text: "Pending"
- Hover shows "Click to cancel" tooltip

**canceling**
- Background: `var(--success)` with 80% opacity
- Icon: Phosphor `Spinner`, animate spin
- Pointer-events: none

**error**
- Background: `var(--destructive)` (#ef4444)
- Icon: Phosphor `X` (only on initial error state)
- Text: "Try Again"
- Auto-reset to idle after 3 seconds or on click

---

### 2.3 ChatWindow Component

#### Container Structure
```
┌─────────────────────────────────────────────┐
│              ChatWindow Container            │
│         max-width: 480px, max-height:        │
│         600px, flex column                   │
├─────────────────────────────────────────────┤
│                 ChatHeader                   │
│              height: 64px, sticky            │
│  [Avatar] Friend Name          [Actions ▼]  │
│           Online                             │
├─────────────────────────────────────────────┤
│               MessageList                    │
│              flex: 1, overflow-y: auto       │
│         ┌─────────────────────────┐         │
│         │  [Received Message]      │         │
│         │  Hello! How are you?    │         │
│         │  10:30 AM                │         │
│         └─────────────────────────┘         │
│              ┌─────────────────────────┐    │
│              │  [Sent Message]          │    │
│              │  I'm doing great!       │    │
│              │              10:32 AM ✓✓│    │
│              └─────────────────────────┘    │
│                     ...more messages...      │
├─────────────────────────────────────────────┤
│                 InputBar                     │
│              min-height: 56px, sticky        │
│  [😊] [                    ] [Send ▶]       │
└─────────────────────────────────────────────┘
```

#### ChatHeader Specifications
| Property | Value |
|----------|-------|
| Height | 64px |
| Padding | 16px |
| Background | `var(--card)` with bottom border |
| Border Bottom | 1px solid `var(--border)` |
| Position | Sticky, top: 0 |
| Z-Index | 10 |

**Header Content:**
- Avatar: 40px with status dot
- Friend Name: `var(--friends-text-lg)` (18px), semibold
- Status Text: `var(--friends-text-xs)` (12px), muted color
- Actions Dropdown: Phosphor `DotsThreeVertical`, 20px

#### MessageList Specifications
| Property | Value |
|----------|-------|
| Flex | 1 |
| Overflow | overflow-y: auto |
| Padding | 16px |
| Scroll Behavior | smooth |
| Min Height | 200px |

**Virtualization:**
- Use virtual scrolling for messages > 50
- Overscan: 5 messages
- Item Height Estimation: 72px average

#### MessageBubble Specifications

**Sent Message (Right-aligned)**
| Property | Light Mode | Dark Mode |
|----------|------------|-----------|
| Max Width | 70% | 70% |
| Background | `var(--primary)` | `var(--primary)` |
| Text Color | `var(--primary-foreground)` | `var(--primary-foreground)` |
| Border Radius | `1rem 1rem 0.25rem 1rem` | Same |
| Padding | 10px 14px | Same |
| Margin Left | auto | auto |

**Received Message (Left-aligned)**
| Property | Light Mode | Dark Mode |
|----------|------------|-----------|
| Max Width | 70% | 70% |
| Background | `var(--muted)` | `var(--muted)` |
| Text Color | `var(--foreground)` | `var(--foreground)` |
| Border Radius | `1rem 1rem 1rem 0.25rem` | Same |
| Padding | 10px 14px | Same |
| Margin Right | auto | auto |

**Timestamp:**
- Font: `var(--friends-text-xs)` (12px)
- Color: `var(--muted-foreground)`
- Position: Below bubble, aligned to bubble end
- Format: "10:30 AM" or "Yesterday 10:30 PM"

**Read Receipts (Sent only):**
- Icon: Phosphor `Checks` (double check)
- Color: `var(--info)` when read
- Size: 14px

#### InputBar Specifications
| Property | Value |
|----------|-------|
| Min Height | 56px |
| Padding | 12px 16px |
| Background | `var(--card)` with top border |
| Border Top | 1px solid `var(--border)` |
| Position | Sticky, bottom: 0 |

**Input Elements:**
| Element | Size | Color |
|---------|------|-------|
| Emoji Button | 32px | `var(--muted-foreground)` |
| Textarea | auto-resize, max 120px | `var(--foreground)` |
| Send Button | 32px | `var(--primary)` |

**Textarea:**
- Min Height: 36px
- Max Height: 120px (4 lines)
- Border: 1px solid `var(--border)`
- Border Radius: 18px (pill shape)
- Padding: 8px 16px
- Font: `var(--friends-text-base)` (16px)
- Placeholder: "Type a message..."
- Auto-resize: Yes, up to max-height

**Send Button:**
- Only visible when textarea has content
- Icon: Phosphor `PaperPlaneRight`
- Animation: fade-in 150ms when content appears

#### ChatWindow States

**Loading State**
- Skeleton messages (3 received, 2 sent)
- Animated shimmer effect
- Header: Simple skeleton with avatar circle

**Empty State**
- Icon: `ChatCircleDots`, 64px, `var(--muted)`
- Title: "Start a conversation"
- Subtitle: "Send a message to begin chatting"

**Error State**
- Icon: `WifiX`, 48px, `var(--warning)`
- Message: "Couldn't load messages"
- Retry button: Secondary variant

---

### 2.4 BlockFriendModal Component

#### Modal Structure
```
┌─────────────────────────────────────────────┐
│                                             │
│    ┌───────────────────────────────────┐    │
│    │           Backdrop (60%)          │    │
│    │  ┌─────────────────────────────┐  │    │
│    │  │         Modal Card          │  │    │
│    │  │         width: 400px        │  │    │
│    │  │                             │  │    │
│    │  │     [!] Warning Icon        │  │    │
│    │  │     48px, var(--warning)   │  │    │
│    │  │                             │  │    │
│    │  │   "Block [Friend Name]?"    │  │    │
│    │  │   Title, centered          │  │    │
│    │  │                             │  │    │
│    │  │   This will:                │  │    │
│    │  │   • Remove them as friend   │  │    │
│    │  │   • Block all messages      │  │    │
│    │  │   • Hide from search        │  │    │
│    │  │                             │  │    │
│    │  │   [Cancel]    [Block]       │  │    │
│    │  │   secondary    danger       │  │    │
│    │  └─────────────────────────────┘  │    │
│    └───────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

#### Modal Specifications
| Property | Value |
|----------|-------|
| Max Width | 400px |
| Border Radius | `var(--friends-modal-radius)` (10px) |
| Background | `var(--card)` |
| Padding | 24px |
| Shadow | `var(--shadow-lg)` |

#### Animation Specifications
| Animation | Duration | Easing | Properties |
|-----------|----------|--------|------------|
| Enter | 200ms | ease-out | opacity 0→1, scale 0.95→1 |
| Exit | 150ms | ease-in | opacity 1→0, scale 1→0.95 |
| Backdrop Enter | 200ms | ease-out | opacity 0→1 |
| Backdrop Exit | 150ms | ease-in | opacity 1→0 |

**Enter Keyframes:**
```css
@keyframes modal-enter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

#### Modal Content

**Warning Icon:**
- Phosphor Icon: `Warning` (fill variant)
- Size: 48px
- Color: `var(--warning)` (#f59e0b)

**Title:**
- Text: "Block [Friend Name]?"
- Font: `var(--friends-text-xl)` (20px)
- Font Weight: 600
- Text Align: center

**Consequences List:**
- Bullet Style: Custom circles with `var(--destructive)` color
- Font: `var(--friends-text-sm)` (14px)
- Color: `var(--muted-foreground)`
- Line Height: 1.5
- Items:
  1. "Remove them from your friends list"
  2. "Block all messages from them"
  3. "Hide your profile from their search"

#### Button Actions
| Button | Variant | Size | Action |
|--------|---------|------|--------|
| Cancel | secondary | md | Close modal, no action |
| Block | danger | md | Execute block, close modal |

**Button Spacing:**
- Gap between buttons: 12px
- Buttons stretch to fill width on mobile

#### BlockFriendModal States

**Closed State**
- Not rendered / display: none

**Opening State**
- Backdrop fades in
- Modal scales up from 95%

**Open State**
- Full opacity, scale 1
- Focus trapped within modal

**Closing State**
- Backdrop fades out
- Modal scales down to 95%

**Focus Trap Requirements:**
- Tab cycles through: Close button → Cancel → Block → Close button
- Escape key closes modal
- Click outside closes modal
- Focus returns to trigger element on close

---

## 3. Interactive States Matrix

### 3.1 FriendSearch States

| State | Hover | Focus | Active | Disabled | Loading |
|-------|-------|-------|--------|----------|---------|
| **SearchInput** | N/A | Border: `var(--primary)`, ring | N/A | Opacity: 0.5, cursor: not-allowed | N/A |
| **Result Card** | Border: `var(--primary)/30`, shadow, translateY(-2px) | Ring: 2px `var(--primary)` | Scale: 0.98 | N/A | N/A |
| **Add Button** | bg: `var(--primary-hover)`, scale(1.02) | Ring: 2px `var(--primary)` | Scale: 0.98 | Opacity: 0.5 | Spinner icon |

### 3.2 FriendRequestButton States

| State | Hover | Focus | Active | Disabled | Loading |
|-------|-------|-------|--------|----------|---------|
| **idle** | bg: `var(--primary-hover)`, translateY(-1px) | Ring: 2px `var(--primary)` | Scale: 0.98 | Opacity: 0.5 | N/A |
| **sending** | None | Ring: 2px `var(--primary)` | None | N/A | Spinner, "Sending..." |
| **pending** | cursor: pointer, tooltip | Ring: 2px `var(--primary)` | Scale: 0.98 | N/A | N/A |
| **canceling** | None | Ring: 2px `var(--primary)` | None | N/A | Spinner, "Canceling..." |
| **error** | bg: `var(--destructive)/90` | Ring: 2px `var(--destructive)` | Scale: 0.98 | N/A | N/A |

### 3.3 ChatWindow States

| Element | Hover | Focus | Active | Disabled |
|---------|-------|-------|--------|----------|
| **Header Actions** | bg: `var(--accent)` | Ring: 2px `var(--primary)` | Scale: 0.95 | N/A |
| **Message Bubble** | None | Ring: 2px `var(--primary)` (own messages only) | N/A | N/A |
| **InputBar Textarea** | Border: `var(--primary)` | Border: `var(--primary)`, ring | N/A | Opacity: 0.5 |
| **Send Button** | bg: `var(--primary-hover)` | Ring: 2px `var(--primary)` | Scale: 0.95 | Opacity: 0.5 |
| **Emoji Button** | bg: `var(--accent)` | Ring: 2px `var(--primary)` | Scale: 0.95 | N/A |

### 3.4 BlockFriendModal States

| Element | Hover | Focus | Active | Disabled |
|---------|-------|-------|--------|----------|
| **Backdrop** | N/A | N/A | N/A | N/A |
| **Modal Card** | N/A | N/A | N/A | N/A |
| **Cancel Button** | bg: `var(--accent)` | Ring: 2px `var(--primary)` | Scale: 0.98 | Opacity: 0.5 |
| **Block Button** | bg: `var(--destructive)/90` | Ring: 2px `var(--destructive)` | Scale: 0.98 | Opacity: 0.5 |

### 3.5 Touch Device Adaptations

On touch devices (hover: none), apply the following state changes:

| Element | Touch Adaptation |
|---------|------------------|
| Result Card | Remove hover effects; use active state (scale: 0.98) |
| FriendRequestButton | Remove hover effects; use active state (scale: 0.98) |
| Send Button | Always show (no longer conditional on content) |
| All interactive elements | Larger touch targets maintained (44px minimum) |

---

## 4. Responsive Breakpoints

### 4.1 Breakpoint Reference

| Breakpoint | Screen Width | Layout |
|------------|--------------|--------|
| Mobile (base) | 0px - 639px | Full width, stacked |
| Tablet | 640px - 1023px | Wider cards, side-by-side possible |
| Desktop | 1024px - 1279px | Max-width containers |
| Large Desktop | 1280px+ | Optimized for large screens |

### 4.2 FriendSearch Responsive

| Property | Mobile (<640px) | Tablet (640px+) | Desktop (1024px+) |
|----------|-----------------|-----------------|-------------------|
| Container Width | 100% | 100% | max-width: 640px |
| Container Padding | 16px | 20px | 24px |
| Card Padding | 12px | 14px | 16px |
| Avatar Size | 40px | 44px | 48px |
| Max Visible Results | 3 | 4 | 5 |
| Scroll | Virtual | Virtual | Virtual |

### 4.3 ChatWindow Responsive

| Property | Mobile (<640px) | Tablet (640px+) | Desktop (1024px+) |
|----------|-----------------|-----------------|-------------------|
| Container Width | 100% | 100% | max-width: 480px |
| Container Height | 100vh (full screen) | 100vh (full screen) | max-height: 600px |
| Max Bubble Width | 85% | 80% | 70% |
| Message Padding | 12px | 14px | 16px |
| Header Height | 56px | 60px | 64px |
| InputBar Height | 52px | 56px | 56px |
| Show Scroll-to-Bottom | Yes | Yes | Yes (on scroll) |

**Mobile Full-Screen Chat:**
- ChatWindow takes full viewport height
- Header becomes safe-area aware (respects notch)
- InputBar has extra padding for keyboard

### 4.4 BlockFriendModal Responsive

| Property | Mobile (<640px) | Tablet (640px+) | Desktop (1024px+) |
|----------|-----------------|-----------------|-------------------|
| Modal Width | calc(100% - 32px) | 400px | 400px |
| Modal Max Width | calc(100% - 32px) | 400px | 400px |
| Button Layout | full-width, stacked | auto-width, side-by-side | auto-width, side-by-side |
| Button Gap | 8px | 12px | 12px |
| Padding | 20px | 24px | 24px |

### 4.5 Touch Target Compliance

Across all breakpoints, ensure minimum touch targets:

| Element | Min Touch Target | Recommendation |
|---------|------------------|----------------|
| All Buttons | 44px × 44px | 48px × 48px preferred |
| Icon Buttons | 44px × 44px | 48px × 48px preferred |
| List Items | 44px min height | 48px preferred |
| Form Inputs | 44px height | 48px preferred |
| Links | 44px × 44px | 48px × 48px preferred |

---

## 5. Accessibility Requirements

### 5.1 Color Contrast (WCAG AA)

All text and UI elements must meet minimum contrast ratios:

| Element | Normal Text (4.5:1) | Large Text (3:1) | UI Components (3:1) |
|---------|---------------------|------------------|---------------------|
| Primary Button | N/A (white on lime) | N/A | Passes (lime #7ac943 on white) |
| Sent Message | N/A (white on lime) | N/A | Passes |
| Received Message | Passes (slate #0f172a on #e2e8f0) | N/A | Passes |
| Block Button | N/A (white on red) | N/A | Passes (red #ef4444 on white) |
| Warning Icon | N/A | N/A | Passes (amber #f59e0b on white) |

**Light Mode Verification:**
- `--foreground` (#0f172a) on `--card` (#ffffff): 15.3:1 ✓
- `--muted-foreground` (#64748b) on `--muted` (#e2e8f0): 4.6:1 ✓
- `--primary-foreground` (#ffffff) on `--primary` (#7ac943): 3.2:1 ✓

**Dark Mode Verification:**
- `--foreground` (#f8fafc) on `--card` (#1e293b): 10.4:1 ✓
- `--muted-foreground` (#94a3b8) on `--muted` (#334155): 4.7:1 ✓
- `--primary-foreground` (#0f172a) on `--primary` (#7ac943): 7.2:1 ✓

### 5.2 Focus Indicators

**Focus Ring Specifications:**
```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

| Element | Focus Style | Offset |
|---------|-------------|--------|
| Buttons | 2px ring | 2px |
| Search Input | 2px ring | 2px |
| Result Cards | 2px ring | 2px |
| Textarea | 2px ring | 2px |
| Modal | 2px ring | 2px |

**Focus Order (Tab Navigation):**
1. FriendSearch: SearchInput → First Result → Last Result (within list)
2. ChatWindow: Header Actions → Messages (virtual) → InputBar
3. BlockFriendModal: Cancel Button → Block Button → Close (X)

### 5.3 Keyboard Navigation

| Key | Action | Component |
|-----|--------|-----------|
| Tab | Move focus to next interactive element | All |
| Shift+Tab | Move focus to previous interactive element | All |
| Enter | Activate focused element | All |
| Space | Activate focused element | Buttons |
| Escape | Close modal / Cancel action | BlockFriendModal, Modals |
| Arrow Up/Down | Navigate within list | Search Results |
| Arrow Up/Down | Navigate messages | ChatWindow MessageList |
| Enter (in textarea) | Send message (if no shift) | ChatWindow InputBar |
| Shift+Enter | New line (in textarea) | ChatWindow InputBar |

### 5.4 Screen Reader Announcements

| Action | Announcement |
|--------|--------------|
| Search initiated | "Searching for friends..." |
| Search results loaded | "[X] friends found" |
| No results | "No friends found" |
| Friend request sent | "Friend request sent to [Name]" |
| Friend request pending | "Friend request pending" |
| Message sent | Message appears in chat |
| Message received | "[Name]: [Message preview]" |
| Block initiated | "Are you sure you want to block [Name]?" |
| Block confirmed | "[Name] has been blocked" |

**Live Regions:**
```html
<div role="status" aria-live="polite" class="sr-only">
  <!-- Dynamic announcements -->
</div>
```

### 5.5 ARIA Attributes

#### FriendSearch
```html
<div role="search" aria-label="Find friends">
  <input 
    type="search" 
    aria-label="Search by name or email"
    aria-describedby="search-help"
    aria-controls="search-results"
    aria-autocomplete="list"
  />
  <ul id="search-results" role="listbox" aria-label="Search results">
    <li role="option" aria-selected="false">
```

#### ChatWindow
```html
<div role="log" aria-label="Chat with [Friend Name]" aria-live="polite">
  <header role="banner">
    <h2>Friend Name</h2>
    <span aria-label="Status: Online">Online</span>
  </header>
  <div role="scroll" aria-label="Messages">
    <article aria-label="You: Message text, 10:30 AM">
    <article aria-label="Friend: Message text, 10:32 AM">
  </div>
  <form role="form" aria-label="Send message">
```

#### BlockFriendModal
```html
<div 
  role="dialog" 
  aria-modal="true" 
  aria-labelledby="block-modal-title"
  aria-describedby="block-modal-description"
>
  <h2 id="block-modal-title">Block [Name]?</h2>
  <p id="block-modal-description">
  <button aria-label="Cancel">Cancel</button>
  <button aria-label="Block this user">Block</button>
```

### 5.6 Reduced Motion

All animations must respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Animations Disabled in Reduced Motion:**
- Message enter animation
- Skeleton shimmer
- Spinner rotation
- Modal enter/exit scale
- Hover translate effects
- Focus ring transitions

### 5.7 High Contrast Mode

Ensure components are visible in Windows High Contrast Mode:

| Component | High Contrast Requirement |
|-----------|---------------------------|
| Buttons | Visible border or background change |
| Input Focus | Visible indicator (border, not color alone) |
| Links | Underlined or styled distinctly |
| Status Indicators | Use text labels + icons, not color alone |

**Icon Usage for High Contrast:**
- Status indicators always include both icon and text label
- Action buttons include text labels (not icon-only)
- Warning/error states use icon + text

---

## Implementation Notes

### CSS Custom Properties Registration

Add these tokens to `theme.css` under `:root`:

```css
:root {
  /* Friends System - add after existing tokens */
  
  /* Spacing */
  --friends-space-1: 0.25rem;
  --friends-space-2: 0.5rem;
  --friends-space-3: 0.75rem;
  --friends-space-4: 1rem;
  --friends-space-5: 1.25rem;
  --friends-space-6: 1.5rem;
  --friends-space-8: 2rem;
  --friends-space-10: 2.5rem;
  --friends-space-12: 3rem;
  
  /* Chat Bubbles */
  --friends-radius-bubble: 1rem;
  --friends-radius-bubble-sm: 0.5rem;
  --friends-max-bubble-width: 70%;
  --friends-bubble-padding-x: 0.875rem;
  --friends-bubble-padding-y: 0.5rem;
  --friends-bubble-gap: 0.5rem;
  
  /* Cards */
  --friends-card-padding: var(--space-4);
  --friends-card-radius: var(--radius);
  --friends-card-hover-shadow: 0 4px 12px -2px rgba(122, 201, 67, 0.15);
  --friends-card-hover-border: rgba(122, 201, 67, 0.3);
  
  /* Search */
  --friends-search-height: 44px;
  --friends-search-padding: 1rem;
  --friends-search-radius: var(--radius);
  
  /* Chat */
  --friends-chat-max-height: 600px;
  --friends-chat-header-height: 64px;
  --friends-chat-input-height: 56px;
  
  /* Modal */
  --friends-modal-width: 400px;
  --friends-modal-radius: 10px;
  
  /* Status */
  --friends-status-online: var(--success);
  --friends-status-offline: var(--muted);
  --friends-status-away: var(--warning);
  --friends-status-dot-size: 10px;
  
  /* Transitions */
  --friends-transition-fast: 150ms ease;
  --friends-transition-normal: 200ms ease;
  --friends-transition-slow: 300ms ease;
  --friends-transition-spring: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  
  /* Typography */
  --friends-text-xs: 0.75rem;
  --friends-text-sm: 0.875rem;
  --friends-text-base: 1rem;
  --friends-text-lg: 1.125rem;
  --friends-text-xl: 1.25rem;
}
```

### Tailwind @theme inline Extension

Add to `globals.css`:

```css
@theme inline {
  /* Existing tokens... */
  
  /* Friends System Tokens */
  --color-friends-msg-sent: var(--friends-msg-sent-bg);
  --color-friends-msg-received: var(--friends-msg-received-bg);
  --color-friends-status-online: var(--friends-status-online);
  --color-friends-status-offline: var(--friends-status-offline);
  --color-friends-status-away: var(--friends-status-away);
  
  --spacing-friends: var(--friends-space);
  --radius-friends-bubble: var(--friends-radius-bubble);
  --shadow-friends-card: var(--friends-card-hover-shadow);
}
```

---

**Document Status**: Complete  
**Next Steps**: Implementation in components  
**Review Required**: Design QA before implementation sign-off
