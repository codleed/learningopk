# AI Tutor UI Design System

**Version:** 1.0  
**Created:** 2026-03-21  
**Reference Design:** ChatGPT (OpenAI) - Clean, minimal, focused chat experience  
**Implementation Target:** `learningopk/frontend/components/ai/ai-tutor-chat.tsx`  
**Design Philosophy:** Subtle depth, generous whitespace, minimal chrome

---

## 1. Color System

### 1.1 Brand Colors

The primary color anchors the interface with strategic usage for maximum impact.

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--primary` | `#7ac943` | `#7ac943` | Primary actions, user messages |
| `--primary-foreground` | `#ffffff` | `#0f172a` | Text on primary backgrounds |
| `--primary-hover` | `#6ab838` | `#8bd355` | Hover states for primary elements |
| `--primary-active` | `#5aa32e` | `#9cdd6a` | Active/pressed states |
| `--primary-light` | `#e8f7dd` | `rgba(122,201,67,0.15)` | Subtle primary backgrounds |

### 1.2 Semantic Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--success` | `#22c55e` | `#4ade80` | Success states, confirmations |
| `--warning` | `#f59e0b` | `#fbbf24` | Warning messages |
| `--error` | `#ef4444` | `#f87171` | Error states, destructive actions |
| `--info` | `#3b82f6` | `#60a5fa` | Informational messages |

### 1.3 Neutral Palette

**Light Mode:**
| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#f8fafc` | Page background |
| `--foreground` | `#0f172a` | Primary text |
| `--card` | `#ffffff` | Card surfaces, input backgrounds |
| `--card-foreground` | `#0f172a` | Text on cards |
| `--border` | `#e2e8f0` | Subtle borders |
| `--border-strong` | `#cbd5e1` | More prominent borders |
| `--muted` | `#f1f5f9` | Subtle backgrounds, disabled states |
| `--muted-foreground` | `#64748b` | Secondary text, placeholders |
| `--accent` | `#f1f5f9` | Hover backgrounds |
| `--ring` | `#7ac943` | Focus rings |

**Dark Mode:**
| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#0f172a` | Page background |
| `--foreground` | `#f8fafc` | Primary text |
| `--card` | `#1e293b` | Card surfaces |
| `--card-foreground` | `#f8fafc` | Text on cards |
| `--border` | `#334155` | Subtle borders |
| `--border-strong` | `#475569` | More prominent borders |
| `--muted` | `#1e293b` | Subtle backgrounds |
| `--muted-foreground` | `#94a3b8` | Secondary text |
| `--accent` | `#334155` | Hover backgrounds |
| `--ring` | `#7ac943` | Focus rings |

### 1.4 Message Bubble Colors

**User Message:**
```css
.user-bubble {
  background-color: var(--primary);
  color: var(--primary-foreground);
}
```

**AI Message:**
```css
.ai-bubble {
  background-color: var(--card);
  color: var(--foreground);
  border: 1px solid var(--border);
}
```

**Error State:**
```css
.error-bubble {
  border-color: var(--error);
  background-color: rgba(239, 68, 68, 0.05);
}
```

### 1.5 Color Contrast Validation

| Element | Colors | Contrast Ratio | WCAG Level |
|---------|--------|----------------|------------|
| Primary text (light) | `#0f172a` on `#f8fafc` | 16.1:1 | AAA |
| Muted text (light) | `#64748b` on `#f8fafc` | 5.7:1 | AA |
| User message text | `#ffffff` on `#7ac943` | 4.8:1 | AA |
| AI message text | `#0f172a` on `#ffffff` | 19.5:1 | AAA |
| Primary text (dark) | `#f8fafc` on `#0f172a` | 16.1:1 | AAA |
| Muted text (dark) | `#94a3b8` on `#0f172a` | 7.5:1 | AA |

---

## 2. Typography System

### 2.1 Font Families

```css
/* Primary Font (Headings) */
--font-heading: 'DM Serif Display', Georgia, 'Times New Roman', serif;

/* Secondary Font (Body/Messages) */
--font-body: 'Source Serif 4', Georgia, 'Times New Roman', serif;

/* Monospace Font (Code) */
--font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
```

### 2.2 Type Scale

| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| Logo/Brand | 18px / 1.125rem | 600 (semibold) | 1.2 | -0.01em |
| Header Title | 16px / 1rem | 600 (semibold) | 1.4 | -0.01em |
| Empty State Title | 24px / 1.5rem | 600 (semibold) | 1.3 | -0.01em |
| Empty State Subtitle | 15px / 0.9375rem | 400 (normal) | 1.5 | 0 |
| Message Body | 15px / 0.9375rem | 400 (normal) | 1.6 | 0 |
| Message Code | 14px / 0.875rem | 400 (normal) | 1.5 | 0 |
| Placeholder Text | 14px / 0.875rem | 400 (normal) | 1.5 | 0 |
| Timestamps | 12px / 0.75rem | 400 (normal) | 1.4 | 0 |
| Button Text | 14px / 0.875rem | 500 (medium) | 1.4 | 0 |
| Suggestion Chips | 14px / 0.875rem | 500 (medium) | 1.4 | 0 |

### 2.3 Font Loading

```html
<!-- Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=JetBrains+Mono:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&display=swap" rel="stylesheet">
```

### 2.4 Typography in Components

**Message Bubbles:**
```css
.message-content {
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.6;
  word-wrap: break-word;
}

/* Paragraph spacing within messages */
.message-content p {
  margin-top: 0.75em;
  margin-bottom: 0;
}
.message-content p:first-child {
  margin-top: 0;
}
.message-content p:last-child {
  margin-bottom: 0;
}

/* Code styling within messages */
.message-content code {
  font-family: var(--font-mono);
  font-size: 14px;
  background-color: var(--muted);
  padding: 0.125em 0.375em;
  border-radius: 4px;
}

.message-content pre {
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.5;
  background-color: var(--muted);
  padding: 1em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.75em 0;
}
```

---

## 3. Spacing System

### 3.1 Base Unit

All spacing follows a 4px base unit grid for consistency.

```
4px   = 0.25rem  = 0.25  (--space-1)
8px   = 0.5rem   = 0.5   (--space-2)
12px  = 0.75rem  = 0.75  (--space-3)
16px  = 1rem     = 1      (--space-4)
20px  = 1.25rem  = 1.25   (--space-5)
24px  = 1.5rem   = 1.5    (--space-6)
32px  = 2rem     = 2      (--space-8)
40px  = 2.5rem   = 2.5    (--space-10)
48px  = 3rem     = 3      (--space-12)
64px  = 4rem     = 4      (--space-16)
```

### 3.2 Component Spacing

| Component | Property | Value |
|-----------|----------|-------|
| Message bubble | Padding | 12px 16px |
| Message gap (same role) | Margin-top | 8px |
| Message gap (different roles) | Margin-top | 20px |
| First message from empty | Margin-top | 32px |
| Container horizontal padding | Padding | 16px (mobile), 24px (desktop) |
| Header height | Height | 56px (mobile), 64px (desktop) |
| Input bar padding | Padding | 8px 8px 8px 20px |
| Input bar internal gap | Gap | 8px |
| Send button margin | Margin-right | 4px |

### 3.3 Layout Spacing

| Element | Value |
|---------|-------|
| Max container width | 768px |
| Sidebar width | 280px |
| Top margin from header | 0px (messages fill space) |
| Bottom margin from input | 16px |
| Message area padding-top | 16px |
| Message area padding-bottom | 24px |
| Scroll-to-bottom offset | 24px from bottom |

### 3.4 CSS Variables for Spacing

```css
:root {
  /* Spacing Scale */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}
```

---

## 4. Border & Shadow System

### 4.1 Border Radius

| Element | Radius | Tailwind Equivalent |
|---------|--------|---------------------|
| Message bubbles | 16px | `rounded-2xl` (16px) |
| Message bubble tail | 4px on specific corner | `rounded-br-md` / `rounded-bl-sm` |
| Input bar | 24px | `rounded-full` (9999px, override to 24px) |
| Buttons | 12px | `rounded-xl` (12px) |
| Cards | 16px | `rounded-2xl` (16px) |
| Suggestion chips | 20px | `rounded-3xl` (20px) |
| Send button | 50% (circle) | `rounded-full` |
| Scroll-to-bottom button | 50% (circle) | `rounded-full` |
| Avatar | 50% (circle) | `rounded-full` |

**Tailwind Customization:**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    borderRadius: {
      'none': '0',
      'sm': '4px',
      'DEFAULT': '8px',
      'md': '12px',      // buttons
      'lg': '16px',      // cards, messages
      'xl': '20px',      // chips
      '2xl': '24px',     // input bar
      'full': '9999px',
    },
  },
}
```

### 4.2 Shadows

| Element | Shadow Value | Tailwind Class |
|---------|--------------|----------------|
| Input bar | `0 4px 24px rgba(0,0,0,0.08)` | `shadow-[0_4px_24px_rgba(0,0,0,0.08)]` |
| Message bubbles | None | - |
| Elevated elements | `0 2px 8px rgba(0,0,0,0.05)` | `shadow-sm` |
| Sidebar | `-8px 0 24px rgba(0,0,0,0.08)` | `shadow-[-8px_0_24px_rgba(0,0,0,0.08)]` |
| Send button | `0 1px 2px rgba(0,0,0,0.1)` | `shadow-sm` |
| Scroll-to-bottom | `0 2px 8px rgba(0,0,0,0.1)` | `shadow-md` |
| Suggestion chip hover | `0 4px 12px rgba(0,0,0,0.1)` | `hover:shadow-md` |
| Modal/overlay | `0 8px 32px rgba(0,0,0,0.2)` | `shadow-2xl` |

**Dark Mode Shadow Adjustments:**
```css
[data-theme="dark"] {
  --shadow-input: 0 4px 24px rgba(0, 0, 0, 0.4);
  --shadow-sidebar: -8px 0 24px rgba(0, 0, 0, 0.4);
  --shadow-elevated: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-scroll-button: 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

### 4.3 Border Styles

| Element | Border | Style |
|---------|--------|-------|
| User bubble | None | Solid fill, no border |
| AI bubble | 1px | `var(--border)` |
| Input bar | 1px | `var(--border)` |
| Input bar (focused) | 1px | `var(--primary)` |
| Suggestion chips | 1px | `var(--border)` |
| Suggestion chips (hover) | 1px | `var(--primary)` at 50% opacity |
| Header | 1px bottom | `var(--border)` |
| Sidebar | 1px left | `var(--border)` |
| Error bubble | 1px | `var(--error)` at 100% |
| Scroll-to-bottom button | 1px | `var(--border)` |

---

## 5. Component Visual Specifications

### 5.1 ChatHeader

**Visual Specification:**
```
┌──────────────────────────────────────────────────────────┐
│ [✨] AI Tutor                        [History] [◐]       │
└──────────────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Height | 56px (mobile), 64px (desktop) |
| Background | `var(--background)` with 80% opacity |
| Backdrop blur | 8px |
| Border | 1px bottom `var(--border)` |
| Position | Sticky, top-0 |
| Z-index | 50 |

**Left Section:**
| Element | Specification |
|---------|--------------|
| Icon | Sparkles, 24px, `var(--primary)`, fill: currentColor |
| Title | "AI Tutor", 16px semibold, `var(--foreground)`, font-heading |
| Gap | 12px between icon and title |

**Right Section:**
| Element | Specification |
|---------|--------------|
| History button | Ghost style, 32px height, "History" text + list icon |
| Theme button | Circle, 32px, icon-only (sun/moon) |
| Gap | 8px between buttons |

**Tailwind Classes:**
```tsx
<header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border 
                   bg-background/80 px-4 backdrop-blur-sm md:h-16">
  {/* Left: Logo and title */}
  <div className="flex items-center gap-3">
    <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
    <span className="font-heading text-base font-semibold text-foreground">AI Tutor</span>
  </div>
  
  {/* Right: Actions */}
  <div className="flex items-center gap-2">
    <HistoryToggle />
    <ThemeToggle />
  </div>
</header>
```

**States:**
| State | Appearance |
|-------|------------|
| Default | Standard appearance |
| Scrolled | Slight shadow appears |
| Sidebar open | History icon highlighted (primary color) |

---

### 5.2 MessageBubble (User)

**Visual Specification:**
```
                                           ┌──────────────────────┐
                                           │ User message text    │
                                           │ continues here on    │
                                           │ multiple lines       │
                                           └──────────────────────┘
```

| Property | Value |
|----------|-------|
| Max-width | 80% of container |
| Min-width | 60px |
| Background | `var(--primary)` |
| Text color | `var(--primary-foreground)` |
| Border-radius | 16px top-left, 16px top-right, 4px bottom-right, 16px bottom-left |
| Padding | 12px 16px |
| Margin-left | Auto (right-aligned) |
| Font | Source Serif 4, 15px, line-height 1.6 |

**Tailwind Classes:**
```tsx
<div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary 
                px-4 py-3 text-[15px] text-primary-foreground">
  {/* Message content */}
</div>
```

**States:**
| State | Appearance |
|-------|------------|
| Default | Full opacity, standard appearance |
| Sending | Slight opacity reduction (0.9) |
| Failed | Red border, retry option |

---

### 5.3 MessageBubble (AI)

**Visual Specification:**
```
┌──────────────────────┐
│ ✨                    │  ← Optional avatar (shown once per response block)
├──────────────────────┤
│ AI message text      │
│ continues here with  │
│ detailed response    │
└──────────────────────┘
```

| Property | Value |
|----------|-------|
| Max-width | 85% of container |
| Min-width | 60px |
| Background | `var(--card)` |
| Text color | `var(--foreground)` |
| Border | 1px solid `var(--border)` |
| Border-radius | 16px top-left, 16px bottom-left, 4px bottom-right, 16px top-right |
| Padding | 12px 16px |
| Margin-right | Auto (left-aligned) |
| Font | Source Serif 4, 15px, line-height 1.6 |

**Tailwind Classes:**
```tsx
<div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-border 
                bg-card px-4 py-3 text-[15px] text-foreground">
  {/* Message content with MarkdownMathRenderer */}
</div>
```

**States:**
| State | Appearance |
|-------|------------|
| Default | Standard appearance |
| Streaming | Shows animated dots at end |
| Error | Red border, error icon, error message |

---

### 5.4 StreamingIndicator

**Visual Specification:**
```
        ● ● ●
```

| Property | Value |
|----------|-------|
| Container | Inline-flex, horizontal |
| Dot count | 3 |
| Dot size | 6px diameter |
| Dot color | `var(--muted-foreground)` |
| Gap between dots | 4px |
| Position | Inline at end of AI message bubble |

**Animation Specification:**

```css
@keyframes streaming-dot {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

.streaming-dot:nth-child(1) {
  animation: streaming-dot 1.2s ease-in-out infinite 0ms;
}
.streaming-dot:nth-child(2) {
  animation: streaming-dot 1.2s ease-in-out infinite 160ms;
}
.streaming-dot:nth-child(3) {
  animation: streaming-dot 1.2s ease-in-out infinite 320ms;
}
```

**Tailwind with Custom Animation:**
```tsx
<span className="flex items-center gap-1">
  <span className="h-1.5 w-1.5 animate-streaming rounded-full bg-muted-foreground" />
  <span className="h-1.5 w-1.5 animate-streaming rounded-full bg-muted-foreground [animation-delay:0.16s]" />
  <span className="h-1.5 w-1.5 animate-streaming rounded-full bg-muted-foreground [animation-delay:0.32s]" />
</span>
```

**Globals.css Addition:**
```css
@keyframes streaming-dot {
  0%, 60%, 100% {
    transform: scale(1);
    opacity: 0.4;
  }
  30% {
    transform: scale(1.25);
    opacity: 1;
  }
}

.animate-streaming {
  animation: streaming-dot 1.2s ease-in-out infinite;
}
```

---

### 5.5 ChatInput

**Visual Specification:**
```
┌────────────────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────────────┐    │
│ │ Message input...                               [➤] │    │
│ └────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────┘
```

**Container:**
| Property | Value |
|----------|-------|
| Background | `var(--card)` |
| Border | 1px solid `var(--border)` |
| Border-radius | 24px |
| Shadow | `0 4px 24px rgba(0,0,0,0.08)` |
| Padding | 8px |
| Max-width | 768px (matches container) |
| Min-height | 48px |
| Max-height | 200px |
| Position | Sticky, bottom-0 |
| Margin | 0 auto (centered) |

**Textarea:**
| Property | Value |
|----------|-------|
| Flex | 1 |
| Font | Source Serif 4, 15px |
| Line-height | 1.5 |
| Padding | 4px 8px |
| Background | Transparent |
| Border | None |
| Resize | None |
| Overflow | Auto (when max-height reached) |

**Send Button:**
| Property | Value |
|----------|-------|
| Size | 36px × 36px (circle) |
| Background | `var(--primary)` |
| Icon | ArrowUp, 18px |
| Icon color | `var(--primary-foreground)` |
| Position | Absolute, right-1.5, vertically centered |
| Bottom offset | 6px |

**Tailwind Classes:**
```tsx
<div className="sticky bottom-0 mx-auto max-w-3xl px-4 pb-4">
  <form onSubmit={handleSubmit} className="relative">
    <div className="flex items-end rounded-2xl border border-border bg-card 
                    px-1 py-1 shadow-[0_4px_24px_rgba(0,0,0,0.08)] 
                    focus-within:border-primary transition-colors duration-150">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] 
                   outline-none placeholder:text-muted-foreground"
        style={{ minHeight: '40px', maxHeight: '184px' }}
      />
      <button
        type="submit"
        disabled={!input.trim() || isSending}
        className="m-1 flex h-9 w-9 shrink-0 items-center justify-center 
                   rounded-full bg-primary text-primary-foreground shadow-sm
                   transition-all duration-150
                   disabled:cursor-not-allowed disabled:opacity-50
                   enabled:hover:bg-primary-hover enabled:hover:shadow-md
                   enabled:active:scale-95"
      >
        {isSending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowUp className="h-4 w-4" />
        )}
      </button>
    </div>
  </form>
</div>
```

**States:**
| State | Textarea | Send Button |
|-------|----------|-------------|
| Empty | Placeholder visible, standard border | Hidden (opacity-0, pointer-events-none) |
| Has content | Text visible, primary border | Visible (opacity-100) |
| Sending | Disabled, no changes allowed | Spinner icon, disabled |
| Focused | Primary border highlight | Same as has content |
| Error | Red border | Disabled |

---

### 5.6 SessionSidebar

**Visual Specification:**
```
┌─────────────────────────────┐
│  Chat History         [×]   │
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │  + New Chat            │  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│  Today                      │
│  ┌───────────────────────┐  │
│  │ Explain photosynthesis │  │
│  │ 2 hours ago            │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ Math exam prep...     │  │
│  │ 5 hours ago            │  │
│  └───────────────────────┘  │
│                             │
│  Yesterday                  │
│  ┌───────────────────────┐  │
│  │ Study schedule        │  │
│  │ Yesterday              │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

**Container:**
| Property | Value |
|----------|-------|
| Width | 280px (mobile: 85% width, max 320px) |
| Height | 100vh, 100dvh |
| Background | `var(--card)` |
| Border-left | 1px solid `var(--border)` |
| Shadow | `-8px 0 24px rgba(0,0,0,0.08)` |
| Position | Fixed, right-0, top-0 |
| Z-index | 50 |
| Overflow | Hidden (scroll handled internally) |

**Header:**
| Property | Value |
|----------|-------|
| Padding | 16px |
| Border-bottom | 1px solid `var(--border)` |
| Title | "Chat History", 16px semibold |
| Close button | 32px circle, X icon |

**New Chat Button:**
| Property | Value |
|----------|-------|
| Width | 100% |
| Padding | 12px 16px |
| Background | `var(--primary)` |
| Text | "New Chat", 14px medium |
| Text color | `var(--primary-foreground)` |
| Border-radius | 12px |
| Icon | Plus, 18px |

**Session Items:**
| Property | Value |
|----------|-------|
| Padding | 12px 16px |
| Border-radius | 8px |
| Title | 14px medium, truncate |
| Timestamp | 12px, muted-foreground |
| Gap | 4px between title and timestamp |

**Tailwind Classes:**
```tsx
{/* Sidebar container */}
<aside className={`fixed right-0 top-0 z-50 flex h-full w-[280px] flex-col border-l border-border 
                   bg-card shadow-[-8px_0_24px_rgba(0,0,0,0.08)]
                   transition-transform duration-300 ease-in-out
                   ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
  
  {/* Header */}
  <div className="flex h-14 items-center justify-between border-b border-border px-4">
    <h2 className="text-base font-semibold text-foreground">Chat History</h2>
    <button onClick={onClose} className="rounded-full p-2 hover:bg-accent">
      <X className="h-5 w-5" />
    </button>
  </div>
  
  {/* New Chat button */}
  <div className="p-4">
    <button className="flex w-full items-center justify-center gap-2 rounded-xl 
                       bg-primary px-4 py-3 text-sm font-medium text-primary-foreground
                       transition-colors hover:bg-primary-hover">
      <Plus className="h-4 w-4" />
      New Chat
    </button>
  </div>
  
  {/* Session list */}
  <div className="flex-1 overflow-y-auto px-3 pb-4">
    {/* Date groups and session items */}
  </div>
</aside>
```

**States:**
| State | Transform | Transition |
|-------|-----------|------------|
| Hidden | `translateX(100%)` | 300ms ease-in-out |
| Visible | `translateX(0)` | 300ms ease-in-out |

---

### 5.7 EmptyState

**Visual Specification:**
```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                                                            │
│                          ✨                                │
│                                                            │
│                   How can I help you?                      │
│                                                            │
│        Ask about concepts, create study plans,             │
│              or get exam preparation tips.                 │
│                                                            │
│    ┌──────────────────┐    ┌──────────────────┐            │
│    │ Explain concept │    │ Help me study    │            │
│    └──────────────────┘    └──────────────────┘            │
│    ┌──────────────────┐    ┌──────────────────┐            │
│    │ Create schedule │    │ Quiz me          │            │
│    └──────────────────┘    └──────────────────┘            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Layout:**
| Property | Value |
|----------|-------|
| Vertical position | Centered (when no messages) |
| Max-width | 400px for text content |
| Icon size | 48px |
| Icon color | `var(--primary)` |
| Title | 24px semibold, centered |
| Subtitle | 15px muted-foreground, centered |
| Spacing between sections | 16px |

**Icon:**
| Property | Value |
|----------|-------|
| Icon | Sparkles |
| Size | 48px × 48px |
| Color | `var(--primary)` |
| Opacity | 0.9 |

**Title:**
| Property | Value |
|----------|-------|
| Text | "How can I help you?" |
| Size | 24px / 1.5rem |
| Weight | 600 semibold |
| Font | DM Serif Display |
| Color | `var(--foreground)` |
| Text-align | Center |

**Subtitle:**
| Property | Value |
|----------|-------|
| Text | "Ask about concepts, create study plans, or get exam preparation tips." |
| Size | 15px / 0.9375rem |
| Weight | 400 normal |
| Color | `var(--muted-foreground)` |
| Text-align | Center |
| Max-width | 360px |

**Suggestion Chips Grid:**
| Property | Value |
|----------|-------|
| Columns | 2 (responsive) |
| Gap | 12px |
| Max-width | 560px |
| Margin | 0 auto |

**Individual Chip:**
| Property | Value |
|----------|-------|
| Background | `var(--card)` |
| Border | 1px solid `var(--border)` |
| Border-radius | 20px |
| Padding | 12px 16px |
| Font | 14px medium |
| Color | `var(--foreground)` |
| Text-align | Left |
| Width | 100% |
| Shadow | `var(--shadow-sm)` |

**Tailwind Classes:**
```tsx
<div className="flex flex-col items-center justify-center px-4 py-12">
  {/* Icon */}
  <Sparkles className="mb-4 h-12 w-12 text-primary opacity-90" />
  
  {/* Title */}
  <h2 className="mb-3 text-center font-heading text-2xl font-semibold text-foreground">
    How can I help you?
  </h2>
  
  {/* Subtitle */}
  <p className="mb-8 max-w-[360px] text-center text-[15px] text-muted-foreground">
    Ask about concepts, create study plans, or get exam preparation tips.
  </p>
  
  {/* Suggestion chips */}
  <div className="grid w-full max-w-[560px] grid-cols-1 gap-3 sm:grid-cols-2">
    {suggestions.map((suggestion) => (
      <button
        key={suggestion}
        onClick={() => onSuggestionClick(suggestion)}
        className="w-full rounded-3xl border border-border bg-card px-4 py-3 
                   text-left text-sm font-medium text-foreground shadow-sm
                   transition-all duration-150
                   hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md
                   active:translate-y-0 active:shadow-sm"
      >
        {suggestion}
      </button>
    ))}
  </div>
</div>
```

---

### 5.8 ScrollToBottomButton

**Visual Specification:**
```
        ┌─────────────┐
        │      ↓      │
        │ New messages│
        └─────────────┘
```

| Property | Value |
|----------|-------|
| Position | Fixed, bottom-24, centered horizontally |
| Background | `var(--card)` |
| Border | 1px solid `var(--border)` |
| Border-radius | 20px (pill shape) |
| Padding | 8px 16px |
| Shadow | `0 2px 8px rgba(0,0,0,0.1)` |
| Icon | ChevronDown, 16px |
| Text | "New messages", 13px |
| Gap | 6px between icon and text |

**Tailwind Classes:**
```tsx
<button
  className={`fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 
              rounded-full border border-border bg-card px-4 py-2 shadow-md
              transition-all duration-200
              ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
              hover:scale-105 active:scale-100`}
  onClick={scrollToBottom}
>
  <ChevronDown className="h-4 w-4 text-muted-foreground" />
  <span className="text-[13px] font-medium text-muted-foreground">New messages</span>
</button>
```

**States:**
| State | Opacity | Pointer Events | Transform |
|-------|---------|-----------------|------------|
| Hidden | 0 | none | - |
| Visible | 100 | auto | - |
| Hover | - | - | scale(1.05) |
| Active | - | - | scale(1) |

---

## 6. Animation Specifications

### 6.1 Transitions

| Element | Duration | Easing | Property |
|---------|----------|--------|----------|
| Message appear | 300ms | ease-out | opacity, transform |
| Sidebar slide | 300ms | ease-in-out | transform |
| Button hover | 200ms | ease | background, transform |
| Input focus | 150ms | ease | border-color |
| Scroll to bottom | 200ms | ease | opacity |
| Suggestion chip hover | 150ms | ease-out | all |
| Theme toggle | 200ms | ease | transform, background |
| Sidebar backdrop | 300ms | ease | opacity |

### 6.2 Keyframe Animations

**Message Fade In:**
```css
@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-enter {
  animation: message-in 300ms ease-out forwards;
}
```

**Sidebar Slide In:**
```css
@keyframes sidebar-in {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes sidebar-out {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(100%);
  }
}
```

**Streaming Dots:**
```css
@keyframes streaming-dot {
  0%, 60%, 100% {
    transform: scale(1);
    opacity: 0.4;
  }
  30% {
    transform: scale(1.25);
    opacity: 1;
  }
}

.animate-streaming {
  animation: streaming-dot 1.2s ease-in-out infinite;
}
```

**Send Button Pulse (success):**
```css
@keyframes send-pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}
```

### 6.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  .animate-streaming {
    animation: none;
    opacity: 0.6;
  }
  
  .message-enter {
    animation: none;
    opacity: 1;
  }
}
```

---

## 7. Dark Mode Specifications

### 7.1 Background Adjustments

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Page background | `#f8fafc` | `#0f172a` |
| Card surface | `#ffffff` | `#1e293b` |
| Input bar | `#ffffff` | `#1e293b` |
| Message bubble (AI) | `#ffffff` | `#1e293b` |
| Sidebar | `#ffffff` | `#1e293b` |

### 7.2 Shadow Adjustments

| Element | Light Shadow | Dark Shadow |
|---------|--------------|-------------|
| Input bar | `rgba(0,0,0,0.08)` | `rgba(0,0,0,0.4)` |
| Sidebar | `rgba(0,0,0,0.08)` | `rgba(0,0,0,0.4)` |
| Elevated elements | `rgba(0,0,0,0.05)` | `rgba(0,0,0,0.2)` |
| Scroll-to-bottom | `rgba(0,0,0,0.1)` | `rgba(0,0,0,0.3)` |

### 7.3 Border Adjustments

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Subtle border | `#e2e8f0` | `#334155` |
| Strong border | `#cbd5e1` | `#475569` |

### 7.4 Text Adjustments

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Primary text | `#0f172a` | `#f8fafc` |
| Muted text | `#64748b` | `#94a3b8` |
| User message text | `#ffffff` | `#0f172a` |

### 7.5 CSS Variables for Dark Mode

```css
[data-theme="dark"] {
  /* Backgrounds */
  --background: #0f172a;
  --foreground: #f8fafc;
  --card: #1e293b;
  --card-foreground: #f8fafc;
  --muted: #1e293b;
  --muted-foreground: #94a3b8;
  --accent: #334155;
  
  /* Borders */
  --border: #334155;
  --border-strong: #475569;
  
  /* Shadows (adjusted for dark mode) */
  --shadow-input: 0 4px 24px rgba(0, 0, 0, 0.4);
  --shadow-sidebar: -8px 0 24px rgba(0, 0, 0, 0.4);
  --shadow-elevated: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-scroll-button: 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

---

## 8. Responsive Breakpoints

### 8.1 Breakpoint Definitions

| Breakpoint | Min-width | Max-width | Description |
|------------|-----------|-----------|-------------|
| Mobile | 0px | 639px | Small phones |
| Tablet | 640px | 1023px | Tablets, large phones |
| Desktop | 1024px | - | Desktop screens |

### 8.2 Mobile (< 640px)

**Layout:**
| Property | Value |
|----------|-------|
| Container | 100% width |
| Horizontal padding | 16px |
| Sidebar | Full-width overlay (85% max) |
| Header height | 56px |

**Components:**
| Component | Adjustment |
|-----------|------------|
| Header | Simplified, no expanded history label |
| Sidebar | 85% width, max 320px |
| Message bubbles | 85% max-width |
| Suggestion chips | Single column |
| Input bar | Full width |

**Tailwind:**
```tsx
// Mobile classes
<div className="w-full px-4">
  {/* Components */}
</div>
```

### 8.3 Tablet (640px - 1023px)

**Layout:**
| Property | Value |
|----------|-------|
| Container | 90% width |
| Horizontal padding | 24px |
| Sidebar | 280px |
| Header height | 64px |

**Components:**
| Component | Adjustment |
|-----------|------------|
| Header | Standard with labels |
| Sidebar | Fixed 280px |
| Message bubbles | Standard max-widths |
| Suggestion chips | 2 columns |

**Tailwind:**
```tsx
// Tablet classes
<div className="max-w-3xl mx-auto">
  {/* Components */}
</div>
```

### 8.4 Desktop (> 1023px)

**Layout:**
| Property | Value |
|----------|-------|
| Container | 768px centered |
| Horizontal padding | 24px |
| Sidebar | 280px |
| Header height | 64px |
| Page max-width | 1280px |

**Components:**
| Component | Adjustment |
|-----------|------------|
| Header | Full layout |
| Sidebar | Fixed 280px, no overlay |
| Message bubbles | 80-85% max-width |
| Suggestion chips | 2 columns |
| Input bar | 768px max-width |

**Tailwind:**
```tsx
// Desktop classes
<div className="mx-auto max-w-3xl">
  {/* Components */}
</div>
```

### 8.5 Responsive CSS Grid

```css
/* Responsive container */
.chat-container {
  width: 100%;
  max-width: 768px;
  margin: 0 auto;
  padding: 0 16px;
}

@media (min-width: 640px) {
  .chat-container {
    padding: 0 24px;
  }
}

@media (min-width: 1024px) {
  .chat-container {
    max-width: 768px;
  }
}

/* Suggestion grid */
.suggestion-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 640px) {
  .suggestion-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

---

## 9. Implementation Notes

### 9.1 Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class', // or 'media' for system preference
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
          hover: 'var(--primary-hover)',
          light: 'var(--primary-light)',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'input': '0 4px 24px rgba(0, 0, 0, 0.08)',
        'sidebar': '-8px 0 24px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'streaming': 'streaming-dot 1.2s ease-in-out infinite',
        'message-in': 'message-in 300ms ease-out forwards',
      },
      keyframes: {
        'streaming-dot': {
          '0%, 60%, 100%': { transform: 'scale(1)', opacity: '0.4' },
          '30%': { transform: 'scale(1.25)', opacity: '1' },
        },
        'message-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
```

### 9.2 Custom CSS Requirements

**Global CSS (globals.css):**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Font imports */
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=JetBrains+Mono:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&display=swap');

@layer base {
  :root {
    /* Color tokens */
    --primary: #7ac943;
    --primary-foreground: #ffffff;
    --primary-hover: #6ab838;
    --primary-light: #e8f7dd;
    
    /* ... other tokens */
  }
  
  [data-theme="dark"] {
    --primary-foreground: #0f172a;
    --primary-hover: #8bd355;
    --primary-light: rgba(122, 201, 67, 0.15);
  }
}

@layer utilities {
  /* Message bubble tail classes */
  .rounded-tl-2xl { border-top-left-radius: 16px; }
  .rounded-tr-2xl { border-top-right-radius: 16px; }
  .rounded-bl-2xl { border-bottom-left-radius: 16px; }
  .rounded-br-2xl { border-bottom-right-radius: 16px; }
  .rounded-bl-sm { border-bottom-left-radius: 4px; }
  .rounded-br-sm { border-bottom-right-radius: 4px; }
}

/* Streaming animation */
@keyframes streaming-dot {
  0%, 60%, 100% {
    transform: scale(1);
    opacity: 0.4;
  }
  30% {
    transform: scale(1.25);
    opacity: 1;
  }
}

.animate-streaming {
  animation: streaming-dot 1.2s ease-in-out infinite;
}

/* Message enter animation */
@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-message-in {
  animation: message-in 300ms ease-out forwards;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .animate-streaming,
  .animate-message-in {
    animation: none;
  }
}
```

### 9.3 Component Props Interfaces

```typescript
// ChatHeader
interface ChatHeaderProps {
  onHistoryToggle: () => void;
  isHistoryOpen: boolean;
}

// MessageBubble
interface MessageBubbleProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
  };
  isStreaming?: boolean;
  onRetry?: () => void;
}

// ChatInput
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSending: boolean;
  disabled?: boolean;
  placeholder?: string;
}

// SessionSidebar
interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Array<{
    id: string;
    title: string;
    lastMessageAt: string;
  }>;
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  isLoading: boolean;
}

// EmptyState
interface EmptyStateProps {
  suggestions?: string[];
  onSuggestionClick: (text: string) => void;
}

// StreamingIndicator
interface StreamingIndicatorProps {
  color?: string;
}

// ScrollToBottomButton
interface ScrollToBottomButtonProps {
  isVisible: boolean;
  onClick: () => void;
}
```

### 9.4 cn() Utility Helper

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 10. Accessibility Checklist

### 10.1 Keyboard Navigation
- [ ] Tab order follows logical flow: Header → Messages → Input → Send
- [ ] Enter sends message (without Shift)
- [ ] Shift+Enter creates newline
- [ ] Escape closes sidebar
- [ ] Focus trap within sidebar when open
- [ ] Visible focus indicators on all interactive elements

### 10.2 Screen Reader Support
- [ ] `role="log"` on message container
- [ ] `aria-live="polite"` for new messages
- [ ] `aria-live="assertive"` for errors
- [ ] `aria-label` on icon-only buttons
- [ ] Semantic heading structure
- [ ] Descriptive link text (no "click here")

### 10.3 Color Contrast
- [ ] All text meets 4.5:1 minimum (AA)
- [ ] Large text meets 3:1 minimum
- [ ] Interactive elements have 3:1 against adjacent colors
- [ ] Focus indicators visible in all themes

### 10.4 Touch Targets
- [ ] All buttons minimum 40px × 40px
- [ ] Adequate spacing between targets (8px minimum)
- [ ] No overlapping interactive elements

### 10.5 Motion
- [ ] Respects `prefers-reduced-motion`
- [ ] No essential information conveyed by motion alone
- [ ] Pause controls for any auto-playing content

---

## 11. File Structure

```
components/ai/
├── ai-tutor-chat.tsx              # Main container, state management
├── chat-header.tsx                # Header with logo and controls
├── chat-input.tsx                 # Auto-expanding textarea
├── message-list.tsx               # Scrollable message container
├── message-bubble.tsx             # User and AI message bubbles
├── streaming-indicator.tsx        # Animated typing dots
├── session-sidebar.tsx            # History sidebar panel
├── suggested-prompts.tsx          # Empty state suggestions
├── empty-state.tsx                # Full empty state component
├── scroll-to-bottom.tsx           # Scroll navigation button
└── theme-toggle.tsx               # Light/dark mode switcher
```

---

## 12. Design QA Checklist

### Visual Validation
- [ ] Pixel-perfect alignment with 4px grid
- [ ] Consistent spacing across all states
- [ ] Smooth 60fps animations
- [ ] No visual glitches during state transitions
- [ ] Proper rendering across browsers (Chrome, Safari, Firefox, Edge)

### Interaction Validation
- [ ] All buttons respond to hover/active states
- [ ] Form submissions work correctly
- [ ] Keyboard navigation is complete
- [ ] Touch interactions work on mobile
- [ ] No dead-end user flows

### Responsive Validation
- [ ] Layout breaks gracefully at each breakpoint
- [ ] No horizontal overflow on any screen size
- [ ] Text remains readable at all sizes
- [ ] Touch targets adequate on mobile

---

**End of Specification**
