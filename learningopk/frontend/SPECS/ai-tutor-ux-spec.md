# AI Tutor Chat Interface UX Specification

**Version:** 1.0  
**Created:** 2026-03-21  
**Reference Design:** ChatGPT (OpenAI) - Clean, minimal, focused chat experience  
**Target Implementation:** `learningopk/frontend/components/ai/ai-tutor-chat.tsx`

---

## Executive Summary

This specification defines the UX architecture for modernizing the AI Tutor chat interface to match ChatGPT's clean, minimal design pattern. The goal is to reduce visual chrome, prioritize content, and create a focused learning environment.

### Key Changes from Current Implementation

| Current | Redesigned |
|---------|------------|
| Heavy `DashboardChromeHeader` with eyebrow, title, subtitle | Minimal header with logo + toggle only |
| Sidebar visible by default (grid layout) | Sidebar hidden by default, slide-in on demand |
| Bordered card message bubbles | Clean bubble design with subtle backgrounds |
| Fixed 3-row textarea | Auto-expanding textarea |
| No streaming animation | Animated typing indicator |
| Dense header (56px + 24px gaps) | Streamlined single-line header |

---

## 1. Layout Structure

### 1.1 Page Architecture

```
┌─────────────────────────────────────────────────────────┐
│  [Logo] AI Tutor                              [≡] [◯]  │  ← Header (56px, sticky)
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│              ┌─────────────────────────┐               │
│              │                         │               │
│              │     Message Area         │               │  ← Flex-grow, scrollable
│              │     (Centered 768px)     │               │
│              │                         │               │
│              └─────────────────────────┘               │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│         ┌───────────────────────────────┐               │
│         │  Message input...              │               │  ← Fixed/sticky input bar
│         └───────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Container Specifications

**Chat Container (Centered)**
- **Max-width:** 768px
- **Horizontal padding:** 16px (mobile < 640px), 24px (tablet+ ≥ 640px)
- **Vertical centering:** Content vertically centered when no messages

**Layout Pattern:**
```css
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh; /* Dynamic viewport height for mobile */
  max-width: 768px;
  margin: 0 auto;
  padding: 0 16px; /* 0 24px on tablet+ */
}
```

### 1.3 Responsive Strategy

| Breakpoint | Width Behavior | Chat Container |
|------------|----------------|----------------|
| < 640px (mobile) | 100% width | Full width with 16px padding |
| 640px - 1024px (tablet) | 90% width | 90% max-width |
| > 1024px (desktop) | 1280px max page | 768px centered chat |

**Vertical Height Handling:**
- Use `100dvh` (dynamic viewport height) to handle mobile browser chrome
- Input area remains visible above virtual keyboards

---

## 2. Visual Hierarchy

### 2.1 Header (Minimal Chrome)

**Specifications:**
- **Height:** 56px (64px on desktop for balance)
- **Position:** Sticky, top-0
- **Background:** `var(--background)` with subtle bottom border `var(--border)`
- **Blur effect:** `backdrop-filter: blur(8px)` for glass effect on scroll

**Header Contents:**
```
┌──────────────────────────────────────────────────────────┐
│ [🎓] AI Tutor                        [≡ History] [◯ ☾]  │
└──────────────────────────────────────────────────────────┘
```

| Element | Specification |
|---------|--------------|
| Logo/Icon | 24px Sparkles icon, `var(--primary)` color |
| Title | "AI Tutor" - 16px/1rem, font-semibold, `var(--foreground)` |
| Spacing | 12px between elements |
| History Toggle | Ghost button, "History" label + menu icon |
| Theme Toggle | Circular button, 32px, sun/moon icon |

**Tailwind Classes:**
```tsx
<header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm md:h-16">
  {/* Logo and title */}
  <div className="flex items-center gap-3">
    <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
    <span className="text-base font-semibold text-foreground">AI Tutor</span>
  </div>
  
  {/* Actions */}
  <div className="flex items-center gap-2">
    <HistoryToggle />
    <ThemeToggle />
  </div>
</header>
```

### 2.2 Message Area

**Specifications:**
- **Flex-grow:** 1 (fills available space)
- **Overflow:** `overflow-y-auto` with momentum scrolling
- **Padding:** 16px vertical, 0 horizontal (messages handle their own padding)
- **Scroll behavior:** Smooth scrolling, snap to bottom on new messages

**Empty State Zone:**
- Vertically centered when no messages
- Max-width constrained to 768px

### 2.3 Input Area

**Specifications:**
- **Position:** Sticky, bottom-0
- **Padding:** 16px top/bottom, 0 left/right
- **Background:** Transparent with gradient fade from background
- **Container:** Floating bar design with border and shadow

**Floating Input Bar:**
```
┌──────────────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────────────┐  │
│ │ Message input...                              [➤]  │  │  ← Rounded-full, shadow-md
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Container padding | 16px |
| Input background | `var(--card)` |
| Input border | 1px solid `var(--border)` |
| Input border-radius | 24px (pill shape) |
| Input shadow | `var(--shadow-md)` |
| Input padding | 12px 48px 12px 16px |
| Max height | 200px (auto-expand below this) |

---

## 3. Conversation Flow

### 3.1 Message Types

**User Messages:**
- Right-aligned
- Background: `var(--primary)`
- Text: `var(--primary-foreground)`
- Border-radius: 16px top-right, 4px bottom-right, 16px bottom-left, 16px top-left (asymmetrical)

**AI Messages:**
- Left-aligned
- Background: `var(--card)`
- Border: 1px solid `var(--border)`
- Text: `var(--foreground)`
- Border-radius: 16px top-left, 16px bottom-left, 4px bottom-right, 16px top-right

### 3.2 Message Bubble Design

**Dimensions:**
| Property | User | AI |
|----------|------|-----|
| Max-width | 80% of container (≈ 600px at 768px) | 85% of container |
| Min-width | 60px | 60px |
| Padding | 10px 14px | 12px 16px |
| Font-size | 14px (0.875rem) | 14px (0.875rem) |
| Line-height | 1.5 | 1.6 |

**Tailwind Classes:**
```tsx
// User message
<div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">

// AI message  
<div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 text-sm text-foreground">
```

**Typography in AI Messages:**
```tsx
<MarkdownMathRenderer
  content={message.content}
  forceWrap
  className="text-sm leading-relaxed text-foreground 
             [&_p:first-child]:mt-0 
             [&_p:last-child]:mb-0
             [&_pre]:my-3
             [&_code]:text-[13px]"
/>
```

### 3.3 Message Spacing

**Vertical Rhythm:**
| Scenario | Spacing (margin-top) |
|----------|----------------------|
| First message (AI, after empty state) | 32px |
| First message (user, after empty state) | 32px |
| Consecutive same-role messages | 8px |
| User followed by AI | 20px |
| AI followed by user | 24px |

**Tailwind Pattern:**
```tsx
{/* Consecutive user messages */}
{prevMessage?.role === 'user' && (
  <div className="mt-2" />
)}

/* First message from any role after empty state */
{messages.length === 1 && (
  <div className="mt-8" />
)}
```

### 3.4 Avatar/Role Indicators

**AI Avatar:**
- Position: Left side, above message bubble
- Size: 28px circle
- Icon: Sparkles or bot icon
- Background: `var(--primary-light)` or `var(--muted)`
- Only shown for AI messages, not for each message (show once per AI response block)

**User Indicator:**
- No avatar needed (right-aligned position indicates user)
- Optional: Small "You" label or checkmark for sent confirmation

---

## 4. Empty States

### 4.1 Initial Empty State (Primary)

**Layout:** Vertically and horizontally centered

**Structure:**
```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                                                          │
│                        ✨                                │
│                                                          │
│                   How can I help you?                    │
│                                                          │
│     Ask about concepts, create study plans, or get       │
│              exam preparation tips.                      │
│                                                          │
│   ┌─────────────────┐  ┌─────────────────┐               │
│   │ Explain photosynthesis simply                        │  ← Suggestion chips
│   └─────────────────┘  ┌─────────────────┐               │
│   │ Help me study for my math exam                       │  ← Clickable
│   └─────────────────┘  ┌─────────────────┐               │
│   │ Create a weekly study schedule                       │  │
│   └─────────────────┘                                     │
│                                                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Specifications:**

| Element | Specification |
|---------|--------------|
| Icon | Sparkles, 48px, `var(--primary)`, opacity 0.9 |
| Title | "How can I help you?", 24px/1.5rem, font-semibold, `var(--foreground)` |
| Subtitle | 15px/0.9375rem, `var(--muted-foreground)`, max-width 400px |
| Suggestion chips container | 16px gap, flex-wrap, justify-center |
| Suggestion chips | See 4.1.1 below |

#### 4.1.1 Suggestion Chips

**Dimensions:**
- Padding: 12px 16px
- Border-radius: 12px
- Background: `var(--card)`
- Border: 1px solid `var(--border)`
- Font: 14px/0.875rem, `var(--foreground)`
- Shadow: `var(--shadow-sm)`

**Hover State:**
- Border: `var(--primary)` at 50% opacity
- Background: `var(--primary-light)`
- Transform: translateY(-1px)
- Transition: 150ms ease-out

**Active/Pressed State:**
- Transform: translateY(0)
- Shadow: none

**Tailwind Classes:**
```tsx
<button
  type="button"
  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-sm 
             text-foreground shadow-sm transition-all duration-150
             hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md
             active:translate-y-0 active:shadow-sm"
>
  {suggestion}
</button>
```

**Suggested Prompts (Default Set):**
1. "Explain [concept] in simple terms"
2. "Help me study for my [subject] exam"
3. "Create a weekly study schedule"
4. "Quiz me on [topic]"

### 4.2 Empty History State (Sidebar)

**When:** Session list is empty

**Structure:**
```
┌────────────────────────────┐
│  Chat History         [×]  │
├────────────────────────────┤
│                            │
│    No conversations yet    │
│                            │
│   Start a new chat to      │
│   see it here.             │
│                            │
│  ┌──────────────────────┐  │
│  │  + New Chat          │  │
│  └──────────────────────┘  │
│                            │
└────────────────────────────┘
```

---

## 5. Loading States

### 5.1 Streaming Indicator (Typing Animation)

**Design:** Three dots with staggered pulse animation

**Specifications:**
| Property | Value |
|----------|-------|
| Container | 20px × 8px area |
| Dot size | 8px circle |
| Dot color | `var(--muted-foreground)` or `var(--primary)` |
| Dot spacing | 4px gap |
| Animation | Staggered scale + opacity pulse |

**Animation Keyframes:**
```css
@keyframes typing-dot {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

.typing-dot:nth-child(1) { animation: typing-dot 1.2s infinite 0ms; }
.typing-dot:nth-child(2) { animation: typing-dot 1.2s infinite 200ms; }
.typing-dot:nth-child(3) { animation: typing-dot 1.2s infinite 400ms; }
```

**Tailwind with custom animation:**
```tsx
<div className="flex items-center gap-1 px-1">
  <span className="h-2 w-2 animate-typing-dot rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
  <span className="h-2 w-2 animate-typing-dot rounded-full bg-muted-foreground/60 [animation-delay:200ms]" />
  <span className="h-2 w-2 animate-typing-dot rounded-full bg-muted-foreground/60 [animation-delay:400ms]" />
</div>
```

**Add to globals.css:**
```css
@keyframes typing-dot {
  0%, 60%, 100% {
    transform: scale(1);
    opacity: 0.4;
  }
  30% {
    transform: scale(1.2);
    opacity: 1;
  }
}

.animate-typing-dot {
  animation: typing-dot 1.2s ease-in-out infinite;
}
```

### 5.2 Message Loading (Skeleton)

**When:** Loading a previous session's messages

**Skeleton Design:**
```tsx
<div className="flex gap-3">
  {/* Avatar skeleton */}
  <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-muted" />
  
  {/* Message skeleton */}
  <div className="max-w-[85%] space-y-2">
    <div className="h-4 w-48 animate-pulse rounded bg-muted" />
    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
  </div>
</div>
```

### 5.3 Initial Page Load

**When:** First fetching session history

**Design:** Centered spinner with logo

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                                                          │
│                        ◯                                │
│                     Loading...                           │
│                                                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Alternative (ChatGPT style):** Skip loader, show empty state immediately, load history in background.

---

## 6. Interaction Patterns

### 6.1 Input Behavior

**Auto-Expanding Textarea:**
```tsx
const adjustHeight = () => {
  const textarea = textareaRef.current;
  if (textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }
};

<textarea
  ref={textareaRef}
  onChange={(e) => {
    setValue(e.target.value);
    adjustHeight();
  }}
  className="min-h-[48px] max-h-[200px] resize-none overflow-y-auto"
/>
```

**Specifications:**
| Property | Value |
|----------|-------|
| Min height | 48px (2 rows visually) |
| Max height | 200px (approximately 8-10 rows) |
| Auto-grow | Yes, smooth transition |
| Scroll | Appears when content exceeds max-height |

**Placeholder Text:**
| Context | Placeholder |
|---------|-------------|
| No messages yet | "Ask anything about your studies..." |
| Has messages | "Ask a follow-up..." |

### 6.2 Send Button

**Position:** Inside textarea wrapper, absolute right-12px, vertically centered

**Specifications:**
| State | Appearance |
|-------|------------|
| Hidden (empty input) | `opacity-0`, `pointer-events-none` |
| Visible (has content) | `opacity-100`, lime green circle |
| Sending | Shows spinner, disabled |
| Disabled | `opacity-50`, `cursor-not-allowed` |

**Button Design:**
- Size: 36px circle
- Background: `var(--primary)` (lime green)
- Icon: ArrowUp or Send, 18px, white
- Shadow: `var(--shadow-sm)`

**Tailwind Classes:**
```tsx
<button
  type="submit"
  disabled={isSending || !inputValue.trim()}
  className={cn(
    "absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full",
    "bg-primary text-primary-foreground shadow-sm",
    "transition-all duration-150",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "hover:bg-primary-hover hover:shadow-md",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  )}
>
  {isSending ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <ArrowUp className="h-4 w-4" />
  )}
</button>
```

### 6.3 Session History Sidebar

**Trigger:** Toggle button in header

**Behavior:**
- Slide in from right edge
- 280px width (mobile: 85% width, max 320px)
- Overlay with backdrop (semi-transparent)
- Close on backdrop click or Escape key

**Animation:**
```css
/* Slide in */
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

/* Slide out */
@keyframes slideOutRight {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}

.sidebar-enter { animation: slideInRight 250ms ease-out; }
.sidebar-exit { animation: slideOutRight 200ms ease-in; }
```

**Sidebar Structure:**
```
┌────────────────────────────┐
│  Chat History         [×]  │  ← Header with close button
├────────────────────────────┤
│  ┌──────────────────────┐  │
│  │  + New Chat          │  │  ← Primary button, full width
│  └──────────────────────┘  │
├────────────────────────────┤
│  Today                     │  ← Date grouping header
│  ┌──────────────────────┐  │
│  │  Explain photosynthesis...  │  ← Session item
│  │  2 hours ago         │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │  Study schedule for...│  │
│  │  5 hours ago         │  │
│  └──────────────────────┘  │
│                            │
│  Yesterday                 │
│  ┌──────────────────────┐  │
│  │  Math exam prep...   │  │
│  │  Yesterday           │  │
│  └──────────────────────┘  │
└────────────────────────────┘
```

**Session Item Design:**
- Padding: 12px 16px
- Border-radius: 8px
- Hover: Background `var(--accent)`
- Active: Background `var(--primary-light)`, left border 2px `var(--primary)`

**Tailwind Classes:**
```tsx
<button
  className={cn(
    "w-full rounded-lg px-4 py-3 text-left transition-colors",
    "hover:bg-accent",
    isActive && "bg-primary/10 border-l-2 border-primary"
  )}
>
  <p className="truncate text-sm font-medium text-foreground">{session.title}</p>
  <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTimestamp(session.lastMessageAt)}</p>
</button>
```

### 6.4 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Enter | Send message (when textarea focused, not empty) |
| Shift + Enter | New line in textarea |
| Escape | Close sidebar (if open) |
| Cmd/Ctrl + K | Open search (future) |

**Implementation:**
```tsx
<textarea
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit();
    }
    if (e.key === 'Escape' && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }}
/>
```

### 6.5 Scroll Behavior

**Auto-scroll Rules:**
1. When new message received → scroll to bottom (smooth)
2. When user has scrolled up → don't auto-scroll
3. Show "scroll to bottom" button when scrolled > 200px from bottom

**Scroll-to-Bottom Button:**
```
┌─────────────────────┐
│       ↓             │  ← Floating button
│    New messages     │
└─────────────────────┘
```

**Specifications:**
- Position: Fixed, bottom-24, centered horizontally
- Background: `var(--card)` with shadow
- Border: 1px solid `var(--border)`
- Border-radius: 20px
- Padding: 8px 16px
- Appears when: User scrolled > 200px from bottom AND new message arrives
- Animation: Fade in, slight scale up

---

## 7. Error Handling

### 7.1 Inline Error Display

**Location:** Above input area, below last message

**Design:**
```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   ┌────────────────────────────────────────────────────┐ │
│   │ ⚠ Rate limit exceeded. Please wait 30 seconds.   │ │  ← Error banner
│   └────────────────────────────────────────────────────┘ │
│                                                          │
│   ┌────────────────────────────────────────────────────┐ │
│   │ Message input...                              [➤]  │ │
│   └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Specifications:**
| Property | Value |
|----------|-------|
| Background | `var(--destructive)` at 10% opacity |
| Border | 1px solid `var(--destructive)` at 30% opacity |
| Border-radius | 12px |
| Padding | 12px 16px |
| Text | 14px, `var(--destructive)` |
| Icon | AlertCircle, 16px |
| Action | Optional "Retry" link |

**Tailwind Classes:**
```tsx
<div className="mx-4 mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
  <div className="flex items-center gap-2">
    <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
    <p className="text-sm text-destructive">{errorMessage}</p>
    <button
      type="button"
      onClick={retry}
      className="ml-auto text-sm font-medium text-destructive underline-offset-4 hover:underline"
    >
      Retry
    </button>
  </div>
</div>
```

### 7.2 Network Error Toast

**When:** Network failure during message send

**Design:**
```
┌──────────────────────────────────────────────────────────┐
│ [Toast - bottom right]                                   │
│                                                          │
│   ┌────────────────────────────────────────────────────┐ │
│   │ ✕ Connection lost. Check your internet.    [Retry] │ │
│   └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Specifications:**
- Position: Bottom-right, 24px from edges
- Duration: 5 seconds (dismissible)
- Background: `var(--card)` with shadow-lg
- Auto-dismiss: Yes, after 5s
- Action: "Retry" button

---

## 8. Accessibility

### 8.1 Keyboard Navigation

**Focus Order:**
1. Header history toggle
2. Header theme toggle
3. Message area (if messages)
4. Message bubbles (tab through)
5. Suggestion chips (if empty state)
6. Input textarea
7. Send button

**Focus Management:**
- Focus textarea on page load
- Focus input after sending message
- Focus first session item when sidebar opens
- Return focus to trigger when sidebar closes

**Focus Ring:**
```css
*:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

### 8.2 Screen Reader Support

**ARIA Attributes:**
```tsx
{/* Main chat container */}
<div role="log" aria-label="Conversation" aria-live="polite">

{/* Message */}
<article aria-label={`${message.role === 'user' ? 'You' : 'AI Tutor'}: ${message.content}`}>

{/* Sidebar */}
<aside aria-label="Chat history" aria-hidden={!isSidebarOpen}>

{/* Theme toggle */}
<button aria-label="Change theme" aria-haspopup="menu">

{/* Send button */}
<button aria-label="Send message" disabled={...}>
```

**Live Regions:**
- New AI messages: `aria-live="polite"` on message container
- Errors: `aria-live="assertive"` on error display

### 8.3 Color Contrast

**Minimum Ratios (WCAG AA):**
| Element | Color | Contrast Ratio |
|---------|-------|-----------------|
| Primary text | `var(--foreground)` on `var(--background)` | 15.9:1 ✓ |
| Muted text | `var(--muted-foreground)` on `var(--background)` | 5.7:1 ✓ |
| User message | `var(--primary-foreground)` on `var(--primary)` | 4.8:1 ✓ (AA for large text) |
| Link/Interactive | `var(--primary)` on `var(--background)` | 4.5:1 ✓ |

---

## 9. Component Inventory

### 9.1 ChatContainer

**Purpose:** Root wrapper, manages layout and theming

**Props:**
```tsx
interface ChatContainerProps {
  children: React.ReactNode;
  className?: string;
}
```

**States:**
| State | Behavior |
|-------|----------|
| Default | Full-height layout with centered content |
| Loading | Shows initial loading spinner |
| Error | Shows error boundary |

**Tailwind:**
```tsx
<div className="flex h-screen h-dvh flex-col bg-background">
  {children}
</div>
```

### 9.2 ChatHeader

**Purpose:** Minimal header with logo, title, and controls

**Props:**
```tsx
interface ChatHeaderProps {
  onHistoryToggle: () => void;
  isHistoryOpen: boolean;
}
```

**Visual States:**
| State | Appearance |
|-------|------------|
| Default | Logo + title + history toggle + theme toggle |
| History open | History toggle shows "active" state |

### 9.3 MessageList

**Purpose:** Scrollable container for all messages

**Props:**
```tsx
interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSuggestionClick?: (text: string) => void;
}
```

**Visual States:**
| State | Content |
|-------|---------|
| Empty | Empty state with suggestions |
| Loading | Skeleton messages |
| Has messages | Message bubbles |
| Error | Error banner + messages |

### 9.4 MessageBubble

**Purpose:** Individual message display

**Props:**
```tsx
interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}
```

**Visual States:**
| State | Appearance |
|-------|------------|
| User - Default | Right-aligned, primary background |
| User - Sending | Slight opacity reduction (0.9) |
| AI - Default | Left-aligned, card background |
| AI - Streaming | Shows typing indicator dots |
| AI - Error | Red border, error icon |

### 9.5 StreamingIndicator

**Purpose:** Animated dots while AI is typing

**Props:** None (stateless)

**Animation:** See Section 5.1

### 9.6 ChatInput

**Purpose:** Auto-expanding input with send button

**Props:**
```tsx
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSending: boolean;
  disabled?: boolean;
  placeholder?: string;
}
```

**Visual States:**
| State | Appearance |
|-------|------------|
| Empty | Placeholder visible, send button hidden |
| Has content | Send button visible |
| Sending | Send button shows spinner, input disabled |
| Disabled | Full input disabled, reduced opacity |

### 9.7 SessionSidebar

**Purpose:** Slide-in panel for chat history

**Props:**
```tsx
interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  isLoading: boolean;
}
```

**Visual States:**
| State | Appearance |
|-------|------------|
| Hidden | Not rendered |
| Visible | Slide-in animation |
| Loading | Loading skeleton for session items |
| Empty | "No conversations yet" message |

### 9.8 SuggestedPrompts

**Purpose:** Quick-start suggestion chips on empty state

**Props:**
```tsx
interface SuggestedPromptsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}
```

**Default Suggestions:**
```tsx
const defaultSuggestions = [
  "Explain a concept in simple terms",
  "Help me study for my exam",
  "Create a study schedule",
  "Quiz me on a topic",
];
```

### 9.9 EmptyState

**Purpose:** Full empty state display when no messages

**Props:**
```tsx
interface EmptyStateProps {
  onSuggestionClick?: (text: string) => void;
}
```

### 9.10 ThemeToggle

**Purpose:** Light/Dark/System theme switcher

**Implementation:** Uses existing theme manager pattern from design system

---

## 10. File Structure

```
components/
└── ai/
    ├── ai-tutor-chat.tsx          # Main container component
    ├── chat-header.tsx            # Header with logo and controls
    ├── chat-input.tsx             # Auto-expanding input
    ├── message-list.tsx           # Scrollable message container
    ├── message-bubble.tsx          # Individual message bubble
    ├── streaming-indicator.tsx     # Animated typing dots
    ├── session-sidebar.tsx         # History sidebar panel
    ├── suggested-prompts.tsx       # Empty state suggestions
    └── empty-state.tsx            # Full empty state component
```

---

## 11. Implementation Priorities

### Phase 1: Core Structure
1. Create `ChatContainer` with centered 768px layout
2. Implement `ChatHeader` with minimal design (remove DashboardChromeHeader)
3. Create `MessageList` with scroll behavior
4. Build `ChatInput` with auto-expanding textarea
5. Add `MessageBubble` with proper styling

### Phase 2: Interactive Features
1. Implement `SessionSidebar` with slide-in animation
2. Add history toggle to header
3. Create `StreamingIndicator` animation
4. Add keyboard shortcuts (Enter to send, Escape to close sidebar)

### Phase 3: Polish
1. Implement `SuggestedPrompts` in empty state
2. Add scroll-to-bottom button
3. Polish animations and transitions
4. Add error states and handling
5. Accessibility audit and fixes

---

## 12. API Contract Reference

**Preserve existing API integration:**

### POST /api/ai/chat
```typescript
// Request
{
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  sessionId?: string;
}

// Response Headers
x-ai-session-id: string

// Error Response
{
  error?: string;
  reason?: string;
  retryAfterSeconds?: number;
  sessionId?: string;
}
```

### GET /api/ai/sessions
```typescript
// Response
{
  sessions: Array<{
    id: string;
    title: string;
    lastMessageAt: string;
  }>;
}
```

### GET /api/ai/sessions/:id/messages
```typescript
// Response
{
  session: {
    id: string;
    title: string;
    lastMessageAt: string;
  };
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }>;
}
```

---

## 13. Migration Notes

### Removed from Current Implementation
- `DashboardChromeHeader` (replaced with minimal `ChatHeader`)
- Grid layout with sidebar column (replaced with single-column + overlay)
- `surface-card` class (replaced with native `bg-card`)
- Fixed 3-row textarea (replaced with auto-expanding)
- Heavy header with eyebrow/title/subtitle (replaced with logo + title only)

### Preserved Functionality
- All API integrations (chat, sessions, messages)
- Session management (create, list, switch)
- Message streaming
- Rate limiting feedback
- Error handling
- Theme system (existing implementation)

### New Functionality
- Sidebar hidden by default
- Slide-in sidebar animation
- Streaming indicator animation
- Auto-expanding textarea
- Suggested prompts on empty state
- Scroll-to-bottom button

---

**End of Specification**
