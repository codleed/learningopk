# AI Chat Unified Redesign

**Date**: 2026-03-26
**Status**: Approved
**Goal**: Improve AI Chat discoverability and unify the user experience across the learning platform

---

## Executive Summary

This document outlines the complete redesign of the AI Chat component in the chapter screen. The redesign consolidates two separate implementations (`AIChatPanel` and `AITutorChat`) into a single unified component with enhanced discoverability, persistent visibility, and context-awareness.

### Key Decisions

| Decision | Choice |
|----------|--------|
| **Approach** | Unified Persistent Sidebar |
| **Primary Goal** | Improve discoverability |
| **Architecture** | Single component with context injection |
| **Responsive Strategy** | Drawer (mobile) → Overlay (tablet) → Sidebar (desktop) |

---

## Problem Statement

### Current Issues

1. **Two Separate Implementations**
   - `AIChatPanel` for chapter context (sidebar/overlay modes)
   - `AITutorChat` for full-page tutor experience
   - Duplicated code, inconsistent behavior, no shared history

2. **Poor Discoverability**
   - AI Chat hidden in exercise accordion
   - No persistent indication AI is available
   - Users don't know AI assistance exists

3. **Disconnected Experience**
   - Conversations don't persist across navigation
   - No way to continue discussion from chapter to chapter
   - Context lost when switching tabs

4. **Inconsistent UX**
   - Different visual treatments between implementations
   - Different interaction patterns
   - Different empty states and suggestions

---

## Design Goals

### Primary: Discoverability

- AI assistance forever one click away
- Clear visual indication of availability
- Context-aware suggestions that invite interaction

### Secondary Goals

- Unified session management across contexts
- Seamless responsive experience
- Accessible for all users
- Maintainable single codebase

---

## Architecture

### Component Hierarchy

```
src/components/ai/ai-unified-chat/
├── index.ts                      # Barrel export
├── ai-unified-chat.tsx           # Main orchestration component
├── ai-chat-context.tsx           # React Context for state
├── ai-chat-sidebar.tsx           # Desktop sidebar variant
├── ai-chat-drawer.tsx            # Mobile/tablet drawer variant
├── ai-chat-toggle-button.tsx     # Floating action button
└── components/
    ├── ai-chat-header.tsx         # Header with context chip
    ├── ai-chat-messages.tsx       # Message list with bubbles
    ├── ai-chat-input.tsx           # Textarea + send + suggestions
    ├── ai-chat-empty-state.tsx    # Initial state with prompts
    ├── ai-context-chip.tsx         # Context display badge
    ├── ai-session-history.tsx      # Session list drawer
    └── ai-session-item.tsx         # Individual session row
├── hooks/
│   ├── use-ai-chat.ts            # Core chat logic (send, stream)
│   ├── use-ai-sessions.ts         # Session CRUD operations
│   ├── use-ai-context.ts         # Context injection hook
│   └── use-ai-persistence.ts      # LocalStorage persistence
└── types.ts
```

### State Management

```typescript
// ai-chat-context.tsx
interface AIChatContextValue {
  // Chat state
  messages: ChatMessage[];
  sessionId: string | null;
  isStreaming: boolean;
  isSending: boolean;
  error: string | null;
  
  // Context injection
  context: AIContext | null;
  updateContext: (context: Partial<AIContext>) => void;
  
  // UI state
  isVisible: boolean;
  isExpanded: boolean;
  isHistoryOpen: boolean;
  
  // Session management
  sessions: ChatSession[];
  activeSessionId: string | null;
  isLoadingSessions: boolean;
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  startNewSession: () => void;
  toggleVisibility: () => void;
  toggleExpanded: () => void;
  toggleHistory: () => void;
  clearError: () => void;
}

interface AIContext {
  // Chapter context (from route)
  chapterId: number;
  chapterTitle: string;
  chapterNumber: number;
  subjectName: string;
  boardName: string;
  className: string;
  
  // Dynamic context (from user interaction)
  currentTab: 'summary' | 'exercises' | 'flashcards' | 'quiz';
  currentExerciseId?: number;
  currentFlashcardIndex?: number;
  quizQuestionId?: number;
}
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Chapter Study Workspace                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Main Content Area                      │   │
│  │                                                          │   │
│  │   [Content: Summary / Exercises / Flashcards / Quiz]    │   │
│  │                                                          │   │
│  │   [AI Assistance Triggers]                               │   │
│  │   - Exercise: "Ask AI for hint" button                   │   │
│  │   - Quiz result: "Explain this answer" button            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐│
│  │   AI Chat Toggle    │───▶│        AI Chat Sidebar           ││
│  │   (FAB Button)      │    │  ┌───────────────────────────┐  ││
│  └─────────────────────┘    │  │ Context Chip: Chapter 3   │  ││
│                              │  └───────────────────────────┘  ││
│                              │  ┌───────────────────────────┐  ││
│                              │  │ Messages                 │  ││
│                              │  │ - User bubble            │  ││
│                              │  │ - Assistant bubble       │  ││
│                              │  └───────────────────────────┘  ││
│                              │  ┌───────────────────────────┐  ││
│                              │  │ Input + Suggestions      │  ││
│                              │  └───────────────────────────┘  ││
│                              └─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Responsive Design

### Breakpoint Strategy

| Breakpoint | Variant | Position | Width | Behavior |
|------------|---------|----------|-------|----------|
| **Mobile** (<768px) | Bottom Drawer | Fixed bottom | 100% | Slide-up, 85vh height, swipe-to-close |
| **Tablet** (768-1023px) | Right Overlay | Fixed right | max 400px | Slide-left, backdrop overlay |
| **Desktop** (≥1024px) | Grid Sidebar | Sticky in layout | 400-480px | Integrated in two-column grid |

### Mobile Drawer Behavior

```css
/* Mobile: Bottom Drawer */
@media (max-width: 767px) {
  .ai-chat-drawer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 85dvh;
    max-height: 85dvh;
    border-radius: 24px 24px 0 0;
    z-index: 50;
    transform: translateY(100%);
    transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .ai-chat-drawer[data-state="open"] {
    transform: translateY(0);
  }
  
  /* Drag handle for swipe gesture */
  .ai-chat-drawer-handle {
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: var(--border);
    margin: 12px auto;
  }
}
```

### Desktop Sidebar Integration

```tsx
// chapter-study-workspace.tsx
const ChapterStudyWorkspace = () => {
  const { isVisible, toggleVisibility } = useAIChat();
  
  return (
    <StaggerContainer
      className={cn(
        "grid gap-4 xl:gap-6",
        isVisible 
          ? "xl:grid-cols-[minmax(0,1fr)_minmax(24rem,28rem)]"
          : "xl:grid-cols-1"
      )}
    >
      {/* Main Content */}
      <MotionSection>
        <DashboardSurface tone="shell">
          {/* ... content ... */}
        </DashboardSurface>
      </MotionSection>

      {/* AI Sidebar - Desktop only */}
      {isVisible && (
        <MotionSection className="hidden xl:block">
          <div className="xl:sticky xl:top-4 xl:self-start">
            <AIChatSidebar context={chapterContext} />
          </div>
        </MotionSection>
      )}

      {/* AI Drawer - Mobile/Tablet */}
      {isVisible && (
        <AIChatDrawer context={chapterContext} onClose={toggleVisibility} />
      )}
    </StaggerContainer>
  );
};
```

---

## Visual Design

### Color Tokens

```css
:root {
  /* AI Chat Primary */
  --ai-primary: var(--primary, #7ac943);
  --ai-primary-hover: var(--primary-hover, #68b036);
  --ai-primary-light: rgba(122, 201, 67, 0.15);
  --ai-primary-glow: rgba(122, 201, 67, 0.30);
  
  /* Surfaces */
  --ai-surface: var(--card, #ffffff);
  --ai-surface-elevated: var(--card, #ffffff);
  --ai-border: var(--border, #e2e8f0);
  
  /* Text */
  --ai-text: var(--foreground, #0f172a);
  --ai-text-muted: var(--muted-foreground, #64748b);
  
  /* Shadows */
  --ai-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
  --ai-shadow-md: 0 4px 24px rgba(0, 0, 0, 0.08);
  --ai-shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12);
  --ai-shadow-glow: 0 4px 16px rgba(122, 201, 67, 0.25);
}
```

### Toggle Button

The FAB (Floating Action Button) is the primary discoverability mechanism:

```css
.ai-chat-toggle {
  /* Position */
  position: fixed;
  right: 24px;
  bottom: 28px;
  z-index: 40;
  
  /* Size - Enhanced for visibility */
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  
  /* Visual */
  background: linear-gradient(135deg, var(--ai-primary) 0%, var(--ai-primary-hover) 100%);
  color: white;
  box-shadow: 
    0 4px 16px var(--ai-primary-glow),
    0 8px 24px rgba(0, 0, 0, 0.12);
  
  /* Animation */
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* First-visit attention animation */
.ai-chat-toggle--first-visit {
  animation: toggle-bounce 2s ease-out;
}

@keyframes toggle-bounce {
  0%, 100% { transform: scale(1); }
  25% { transform: scale(1.1); }
  50% { transform: scale(1); }
  75% { transform: scale(1.05); }
}

/* Hover state */
.ai-chat-toggle:hover {
  transform: scale(1.08);
  box-shadow: 
    0 6px 24px var(--ai-primary-glow),
    0 12px 32px rgba(0, 0, 0, 0.16);
}

/* Active state */
.ai-chat-toggle:active {
  transform: scale(0.95);
}

/* Focus state */
.ai-chat-toggle:focus-visible {
  outline: 3px solid var(--primary);
  outline-offset: 4px;
}

/* Badge for notifications */
.ai-chat-toggle-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--destructive, #ef4444);
  color: white;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--ai-surface);
  animation: badge-pulse 2s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
```

### Context Chip

Displays current AI context in the header:

```css
.ai-context-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 9999px;
  background: var(--ai-primary-light);
  border: 1px solid rgba(122, 201, 67, 0.25);
  font-size: 12px;
  font-weight: 500;
  color: var(--ai-primary);
}

.ai-context-chip-icon {
  width: 14px;
  height: 14px;
}

.ai-context-chip-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}
```

### Suggestion Cards

Enhanced empty state with categorized suggestions:

```css
.ai-suggestions-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  width: 100%;
  max-width: 100%;
}

@media (min-width: 480px) {
  .ai-suggestions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.ai-suggestion-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--ai-border);
  background: var(--ai-surface);
  cursor: pointer;
  transition: all 200ms ease;
  text-align: left;
}

.ai-suggestion-card:hover {
  border-color: var(--ai-primary);
  background: var(--ai-primary-light);
  transform: translateY(-2px);
  box-shadow: var(--ai-shadow-md);
}

.ai-suggestion-card-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--ai-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-suggestion-card-icon svg {
  width: 18px;
  height: 18px;
  color: var(--ai-primary);
}

.ai-suggestion-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ai-text);
  margin-bottom: 2px;
}

.ai-suggestion-card-description {
  font-size: 12px;
  color: var(--ai-text-muted);
  line-height: 1.4;
}
```

---

## Enhanced Discoverability

### 1. Prominent Toggle Button

- **Size**: 64px diameter (increased from 56px)
- **Position**: 24px right, 28px bottom
- **Visual**: Primary gradient with glowing shadow
- **Animation**: Bounce on first visit (3 seconds)
- **Badge**: Notification dot for new suggestions

### 2. Inline Content Triggers

Add AI assistance buttons within content areas:

**Exercise Cards**:
```tsx
// In exercise-accordion.tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => openAIChat(`Help me with exercise ${exerciseId}`)}
  className="text-primary"
>
  <Sparkles className="h-4 w-4 mr-2" />
  Ask AI for hint
</Button>
```

**Quiz Results**:
```tsx
// In quiz-results.tsx
{isWrong && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => openAIChat(`Explain why "${selectedAnswer}" is incorrect`)}
  >
    <Sparkles className="h-4 w-4 mr-2" />
    Explain this answer
  </Button>
)}
```

### 3. Onboarding Hints

First-time user experience:

```typescript
// use-ai-first-visit.ts
const STORAGE_KEY = 'learningopk:ai-chat:first-visit';

export function useAIFirstVisit() {
  const [isFirstVisit, setIsFirstVisit] = useLocalStorage(STORAGE_KEY, true);
  
  useEffect(() => {
    if (isFirstVisit) {
      // Auto-dismiss after 10 seconds
      const timer = setTimeout(() => {
        setIsFirstVisit(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isFirstVisit]);
  
  return { isFirstVisit, dismissFirstVisit: () => setIsFirstVisit(false) };
}
```

**Tooltip Component**:
```tsx
function AIFirstVisitTooltip() {
  const { isFirstVisit, dismissFirstVisit } = useAIFirstVisit();
  
  if (!isFirstVisit) return null;
  
  return (
    <div className="animate-tooltip-appear">
      <div className="absolute -top-12 right-0">
        <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap">
          Ask AI anything about your studies!
          <div className="absolute bottom-0 right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-primary transform translate-y-full" />
        </div>
      </div>
      <button onClick={dismissFirstVisit}>×</button>
    </div>
  );
}
```

### 4. Contextual Tooltips

Stuck detection and contextual suggestions:

```typescript
// use-stuck-detection.ts
export function useStuckDetection(
  exerciseId: number,
  onStuck: () => void,
  timeout: number = 30000 // 30 seconds
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isStuck, setIsStuck] = useState(false);
  
  const startTimer = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setIsStuck(true);
      onStuck();
    }, timeout);
  }, [timeout, onStuck]);
  
  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      setIsStuck(false);
    }
    startTimer();
  }, [startTimer]);
  
  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [startTimer]);
  
  return { isStuck, resetTimer };
}
```

**Toast Notification**:
```tsx
function StuckToast({ onAskAI }: { onAskAI: () => void }) {
  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30">
      <div className="bg-card border border-border rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
        <Lightbulb className="h-5 w-5 text-primary" />
        <span className="text-sm">Need help? Ask AI for guidance.</span>
        <Button size="sm" onClick={onAskAI}>Ask AI</Button>
      </div>
    </div>
  );
}
```

---

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Navigate between interactive elements |
| `Shift+Tab` | Reverse navigation |
| `Enter` | Send message (when input focused) |
| `Shift+Enter` | New line in input |
| `Escape` | Close sidebar/drawer |
| `ArrowUp/Down` | Navigate messages (when focused) |

### Screen Reader Support

```tsx
// ARIA attributes
<nav aria-label="AI Chat" role="complementary">
  <button 
    aria-label="Open AI Chat" 
    aria-expanded={isVisible}
    aria-haspopup="dialog"
  >
    <Sparkles aria-hidden="true" />
  </button>
</nav>

<div
  role="dialog"
  aria-label="AI Chat Conversation"
  aria-modal="false"
>
  <div role="log" aria-live="polite" aria-label="Conversation messages">
    {/* Messages */}
  </div>
</div>
```

### Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  .ai-chat-toggle--first-visit {
    animation: none;
  }
  
  .ai-chat-sidebar--entering,
  .ai-chat-sidebar--exiting,
  .ai-chat-drawer--entering,
  .ai-chat-drawer--exiting {
    animation: none;
    transform: none;
  }
  
  .ai-chat-toggle:hover,
  .ai-suggestion-card:hover {
    transform: none;
    transition: none;
  }
}
```

---

## Implementation Phases

### Phase 1: Foundation (Priority: Critical)

**Files to Create**:
- `ai-chat-context.tsx` - State provider
- `use-ai-persistence.ts` - LocalStorage hooks
- `use-ai-chat.ts` - Core chat logic
- `ai-chat-toggle-button.tsx` - FAB component

**Tasks**:
1. Create AIChatContext with full state management
2. Implement localStorage persistence for visibility/expanded state
3. Build toggle button with first-visit animation
4. Add context injection hook (`use-ai-context.ts`)

### Phase 2: Core Components (Priority: High)

**Files to Create**:
- `ai-chat-sidebar.tsx` - Desktop variant
- `ai-chat-drawer.tsx` - Mobile variant
- `ai-chat-header.tsx` - Header with context chip
- `ai-chat-messages.tsx` - Message list
- `ai-chat-input.tsx` - Input area
- `ai-chat-empty-state.tsx` - Suggestions

**Tasks**:
1. Extract shared components from existing implementations
2. Build desktop sidebar with sticky positioning
3. Build mobile drawer with swipe-to-close
4. Create unified header with context display
5. Implement suggestion cards with categories

### Phase 3: Session Management (Priority: High)

**Files to Create**:
- `ai-session-history.tsx` - History drawer
- `ai-session-item.tsx` - Session row
- `use-ai-sessions.ts` - Session CRUD

**Tasks**:
1. Build session history drawer component
2. Implement session listing with date grouping
3. Add session switching functionality
4. Create "New Chat" action

### Phase 4: Context Integration (Priority: Medium)

**Files to Modify**:
- `chapter-study-workspace.tsx` - Add context provider
- `chapter-study-content-with-ai.tsx` - Wire context updates
- `exercise-accordion.tsx` - Add inline triggers

**Tasks**:
1. Wire chapter context to AI chat
2. Add tab context updates
3. Implement exercise context injection
4. Add inline "Ask AI" triggers

### Phase 5: Polish (Priority: Medium)

**Tasks**:
1. Add keyboard shortcuts
2. Implement stuck detection toasts
3. Add first-visit tooltip
4. Optimize animations
5. Mobile swipe-to-close gesture
6. Accessibility audit

---

## File Changes Summary

### New Files

```
src/components/ai/ai-unified-chat/
├── index.ts
├── ai-unified-chat.tsx
├── ai-chat-context.tsx
├── ai-chat-sidebar.tsx
├── ai-chat-drawer.tsx
├── ai-chat-toggle-button.tsx
├── components/
│   ├── ai-chat-header.tsx
│   ├── ai-chat-messages.tsx
│   ├── ai-chat-input.tsx
│   ├── ai-chat-empty-state.tsx
│   ├── ai-context-chip.tsx
│   ├── ai-session-history.tsx
│   └── ai-session-item.tsx
├── hooks/
│   ├── use-ai-chat.ts
│   ├── use-ai-sessions.ts
│   ├── use-ai-context.ts
│   └── use-ai-persistence.ts
└── types.ts
```

### Modified Files

```
src/components/learn/
├── chapter-study-workspace.tsx    # Add grid layout + context provider
├── chapter-study-content-with-ai.tsx # Wire context updates
└── exercise-accordion.tsx         # Add inline AI triggers

src/components/ai/
└── ai-tutor-chat.tsx              # Redirect to unified component (deprecated)
```

### Deleted Files

```
src/components/learn/ai-chat-panel.tsx  # Replaced by unified component
```

---

## Testing Checklist

### Functionality

- [ ] Toggle shows/hides chat correctly
- [ ] Messages send and stream correctly
- [ ] Context chip updates on navigation
- [ ] Session history loads and switches
- [ ] New session creates correctly
- [ ] Inline triggers open chat with correct context
- [ ] Mobile drawer swipe-to-close works
- [ ] Desktop sidebar integrates with grid layout

### Responsive

- [ ] Mobile (<768px): Drawer opens from bottom
- [ ] Tablet (768-1023px): Overlay slides from right
- [ ] Desktop (≥1024px): Sidebar in grid layout

### Accessibility

- [ ] Toggle is keyboard accessible
- [ ] Escape closes sidebar/drawer
- [ ] Tab navigates through chat elements
- [ ] Screen reader announces new messages
- [ ] Color contrast meets WCAG AA

### Performance

- [ ] No layout shift on toggle
- [ ] Smooth animations (60fps)
- [ ] Efficient re-renders
- [ ] Memory cleanup on unmount

---

## Success Metrics

| Metric | Target |
|--------|--------|
| AI Chat engagement rate | +40% from baseline |
| Time to first AI interaction | <30 seconds from landing |
| Session continuity across chapters | >60% |
| Mobile usage | Parity with desktop |
| Accessibility score | WCAG AA (100%) |

---

## Appendix A: CSS Design System

See the full CSS design system in the implementation phase. Key tokens:

```css
/* Dimensions */
--ai-sidebar-width-default: 400px;
--ai-sidebar-width-expanded: 480px;
--ai-toggle-size: 64px;

/* Animation */
--ai-transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--ai-transition-normal: 300ms cubic-bezier(0.4, 0, 0.2, 1);

/* Z-Index */
--ai-toggle-z-index: 40;
--ai-sidebar-z-index: 50;
--ai-overlay-z-index: 45;
```

---

## Appendix B: Backend API Contract

No backend changes required. The unified chat uses existing endpoints:

- `POST /api/ai/chat` - Send message (with optional `chapterId` for context)
- `GET /api/ai/sessions` - List sessions
- `GET /api/ai/sessions/:id/messages` - Get session messages

Context injection is client-side only, passed as `chapterId` in the request body.

---

**Document Version**: 1.0
**Last Updated**: 2026-03-26
**Next Steps**: Proceed to implementation planning