# Study Quest - Chapter Screens Redesign

## Overview

A gamified learning experience that transforms chapter studying into an engaging quest. Each chapter becomes an adventure with XP rewards, achievement badges, and visual progress tracking designed specifically for high school students (ages 14-18).

## Design Philosophy

1. **Quest Metaphor**: Chapters are "quests", activities are "missions"
2. **Immediate Gratification**: XP earned instantly, celebrations on completion
3. **Visual Progress**: Clear quest maps and progress bars
4. **Social Ready**: Leaderboard-ready data structures
5. **Dark/Light Themes**: Students can choose their preferred mode

---

## Gamification System

### XP Rewards

| Action | XP | Description |
|--------|-----|-------------|
| Read Summary | 10 XP | First-time read bonus |
| Complete Exercise | 15 XP | Per exercise solved |
| All Exercises Done | 50 XP | Bonus for completing all |
| Review Flashcard | 5 XP | Per card marked |
| Know Flashcard | 10 XP | Bonus for marking "known" |
| Complete Flashcards | 30 XP | Bonus for reviewing all |
| Complete Quiz | 40 XP | Base quiz completion |
| Perfect Quiz (100%) | 100 XP | Bonus for perfect score |
| Quiz >80% | 50 XP | Bonus for high score |

### Streak System

- Daily study streak counter in header
- Fire icon with streak count
- Streak maintained when any activity completed per day
- Streak milestones: 3, 7, 14, 30, 60, 100 days

### Achievement Badges

| Badge | Criteria | Icon |
|-------|----------|------|
| First Steps | Complete first quest | 🚀 |
| Scholar | Read all summaries in a subject | 📚 |
| Problem Solver | Complete 50 exercises | 🧩 |
| Memory Master | Know 100 flashcards | 🧠 |
| Quiz Champion | Score 100% on 5 quizzes | 🏆 |
| Streak Starter | Maintain 7-day streak | 🔥 |
| Streak Warrior | Maintain 30-day streak | 💪 |
| Subject Master | Complete all chapters in a subject | ⭐ |

---

## Component Specifications

### 1. Chapter Header (Quest Banner)

**Location**: Top of `chapter-study-workspace.tsx`

**Elements**:
- Breadcrumb navigation (Subject > Chapter)
- Chapter number badge (e.g., "Quest 3")
- Chapter title (large, heading font)
- Progress ring showing overall chapter completion
- XP display with animated coin icon
- Streak counter with fire icon

**Visual Design**:
```
┌─────────────────────────────────────────────────────────────┐
│ ← Physics / Chapter 3                         🔥 7 🔥      │
│                                                             │
│  ┌──────┐                                                   │
│  │  65% │  Chapter 3: Laws of Motion        ⭐ 245 XP      │
│  │  ▓▓▓ │  Quest Progress: ████████░░░░░                 │
│  └──────┘                                                   │
└─────────────────────────────────────────────────────────────┘
```

**Animations**:
- Progress ring animates on load (0 to current %)
- XP coin bounces when awarded
- Streak fire pulses gently

---

### 2. Tab Navigation (Quest Menu)

**Location**: Tab bar in `chapter-study-workspace.tsx`

**Design**:
- Horizontal tabs with icons and labels
- Each tab shows completion status (checkmark badge)
- Active tab has elevated style with glow effect
- Tab icons: Summary (📖), Exercises (⚔️), Flashcards (🃏), Quiz (🎯)

**Visual Design**:
```
┌─────────────────────────────────────────────────────────────┐
│  📖 Summary     ⚔️ Exercises (4/6)    🃏 Flashcards (8)    │
│     ✓ ✓              🎯 Quiz                                │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Summary Screen (Study Zone)

**Location**: `markdown-math-renderer.tsx`

**Enhancements**:
- Card-based sections for each topic
- "Mark as Read" button awards 10 XP
- Read progress saved to localStorage
- Estimated reading time displayed
- Key concepts highlighted with colored left border

**Visual Design**:
```
┌─────────────────────────────────────────────────────────────┐
│  📖 Study Zone                              ⏱️ ~8 min read  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Key Concept ─────────────────────────────────────────┐  │
│  │ First Law of Motion: An object at rest stays at rest  │  │
│  │ unless acted upon by an external force.                │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Key Concept ─────────────────────────────────────────┐  │
│  │ Second Law: F = ma (Force = mass × acceleration)     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Key Concept ─────────────────────────────────────────┐  │
│  │ Third Law: For every action, there is an equal and    │  │
│  │ opposite reaction.                                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│              [ ✓ I've Read This ] +10 XP                   │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Exercises Screen (Training Ground)

**Location**: `chapter-exercises-with-ai.tsx`

**Enhancements**:
- Difficulty badges: Easy (green), Medium (yellow), Hard (orange)
- XP reward shown per exercise (15-25 based on difficulty)
- "Solved" badge with checkmark on completion
- Practice streak counter (consecutive exercises solved)
- Hints available (reduces XP by 50%)

**Visual Design**:
```
┌─────────────────────────────────────────────────────────────┐
│  ⚔️ Training Ground                         🔥 3 solved    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Q1. Calculate the force...          [Easy] +15 XP   │   │
│  │                                                      │   │
│  │ Answer: 50N                                          │   │
│  │                                      [✓ Solved!]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Q2. A 5kg object...                 [Medium] +20 XP  │   │
│  │                                                      │   │
│  │ [Show Solution] [Ask AI Tutor]                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Q3. Calculate momentum...            [Hard] +25 XP    │   │
│  │                                                      │   │
│  │ [Show Solution] [Ask AI Tutor]                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│        Complete all to unlock: +50 XP Bonus!               │
└─────────────────────────────────────────────────────────────┘
```

---

### 5. Flashcards Screen (Memory Arena)

**Location**: `flashcard-deck.tsx`

**Enhancements**:
- Card deck with flip animation (3D transform)
- Progress tracker: Known vs Review cards
- "Know It" (green) and "Review Again" (orange) buttons
- Spaced repetition indicators (new, learning, mastered)
- XP per card: 5 (review) / 10 (known)
- Completion celebration animation

**Visual Design**:
```
┌─────────────────────────────────────────────────────────────┐
│  🃏 Memory Arena                    12/20 cards              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    ┌─────────────────┐               │   │
│  │                    │                 │               │   │
│  │                    │   FRONT SIDE    │               │   │
│  │                    │                 │               │   │
│  │                    │ What is Newton's │               │   │
│  │                    │ First Law?      │               │   │
│  │                    │                 │               │   │
│  │                    └─────────────────┘               │   │
│  │                    [ Tap to flip ]                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Progress: ████████████░░░░ 60%    Known: 8  Review: 4     │
│                                                             │
│   ┌──────────────┐      ┌──────────────┐                    │
│   │  🔄 REVIEW    │      │   ✓ KNOW IT  │                    │
│   │   +5 XP       │      │    +10 XP    │                    │
│   └──────────────┘      └──────────────┘                    │
│                                                             │
│           [← Previous]            [Next →]                  │
└─────────────────────────────────────────────────────────────┘
```

**Card States**:
- New (blue badge): Never seen
- Learning (yellow badge): Seen 1-3 times
- Mastered (green badge): Seen 4+ times, marked "known"

---

### 6. Quiz Screen (Challenge Arena)

**Location**: `quiz-runner.tsx`

**Enhancements**:
- Timer with visual urgency (yellow < 5min, red < 1min)
- XP preview showing potential earnings
- Question navigator with answered/unanswered indicators
- Instant feedback option (for practice) vs delayed (for graded)
- Results screen with XP earned breakdown
- Perfect score celebration (confetti animation)

**Visual Design**:
```
┌─────────────────────────────────────────────────────────────┐
│  🎯 Challenge Arena                        ⏱️ 12:45         │
│                                                             │
│  ┌─ Question Navigator ──────────────────────────────────┐  │
│  │  [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]            │  │
│  │   ●    ●    ○    ●    ●    ○    ○    ●    ○    ●     │  │
│  │  answered              unanswered                      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Question 4 ──────────────────────────────────────────┐  │
│  │  A 10kg object accelerates at 2m/s². What force?     │  │
│  │                                                      │   │
│  │  ○ A) 5 N       ○ C) 20 N                           │   │
│  │  ○ B) 10 N      ● D) 50 N  ← selected               │   │
│  │                                                      │   │
│  │  [Previous]                         [Next →]        │   │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Rewards Preview ────────────────────────────────────┐  │
│  │  Complete Quiz: +40 XP                               │  │
│  │  Score >80%: +50 XP                                   │  │
│  │  Perfect Score: +100 XP (if 100%)                     │  │
│  │  ──────────────────────                              │  │
│  │  Potential Total: +190 XP                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│              [ Submit Quiz ]                                │
└─────────────────────────────────────────────────────────────┘
```

**Results Screen**:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    🎉 QUEST COMPLETE! 🎉                    │
│                                                             │
│                    ┌─────────────┐                          │
│                    │    85%      │                          │
│                    │    ████     │                          │
│                    └─────────────┘                          │
│                                                             │
│                   Questions: 17/20 correct                  │
│                   Time: 8 min 32 sec                        │
│                                                             │
│  ┌─ XP Earned ──────────────────────────────────────────┐   │
│  │  Quiz Completion:    +40 XP                          │   │
│  │  Score Bonus (>80%): +50 XP                         │   │
│  │  ─────────────────────────────────                   │   │
│  │  TOTAL: +90 XP                    🪙                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ Achievements Unlocked ─────────────────────────────┐   │
│  │  🏆 Quiz Champion Progress (3/5 perfect)             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [ Review Answers ]              [ Try Again +10 XP ]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### New Components to Create

| Component | File | Purpose |
|-----------|------|---------|
| QuestHeader | `quest-header.tsx` | Chapter header with XP, streak, progress |
| QuestTabBar | `quest-tab-bar.tsx` | Enhanced tab navigation |
| XpToast | `xp-toast.tsx` | Animated XP notification |
| AchievementBadge | `achievement-badge.tsx` | Badge display component |
| StreakCounter | `streak-counter.tsx` | Fire icon with streak count |
| ProgressRing | `progress-ring.tsx` | Circular progress indicator |
| ConfettiCelebration | `confetti-celebration.tsx` | Celebration animation |

### Hooks to Create

| Hook | Purpose |
|------|---------|
| `useGamification` | Central XP, streak, achievements state |
| `useXpNotifications` | Toast queue for XP awards |
| `useStreakTracking` | Daily streak logic |

### Storage Schema (localStorage)

```typescript
interface GamificationState {
  xp: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string; // ISO date
  unlockedBadges: BadgeId[];
  chapterProgress: Record<number, ChapterProgress>;
}

interface ChapterProgress {
  summaryRead: boolean;
  exercisesCompleted: number[];
  flashcardsReviewed: Record<string, CardStatus>;
  quizAttempts: QuizAttempt[];
}
```

---

## File Structure Changes

```
src/
├── components/
│   ├── learn/
│   │   ├── quest-header.tsx          [NEW]
│   │   ├── quest-tab-bar.tsx         [NEW]
│   │   ├── quest-summary-view.tsx    [NEW]
│   │   ├── quest-exercises-view.tsx  [NEW]
│   │   ├── quest-flashcard-view.tsx  [NEW]
│   │   ├── quest-quiz-view.tsx       [NEW]
│   │   ├── xp-toast.tsx              [NEW]
│   │   ├── achievement-badge.tsx     [NEW]
│   │   ├── streak-counter.tsx        [NEW]
│   │   ├── progress-ring.tsx         [NEW]
│   │   ├── confetti-celebration.tsx  [NEW]
│   │   └── chapter-study-workspace.tsx [MODIFY]
│   └── gamification/
│       ├── use-gamification.ts       [NEW]
│       ├── use-xp-notifications.ts   [NEW]
│       ├── use-streak-tracking.ts    [NEW]
│       └── xp-storage.ts             [NEW]
```

---

## Animation Specifications

### XP Toast Animation
- Slide in from top-right
- Coin icon bounces
- Auto-dismiss after 3 seconds
- Stack if multiple XP awards

### Progress Ring Animation
- SVG circle with stroke-dasharray animation
- Duration: 1s ease-out
- Color: primary green, background muted

### Card Flip Animation
- 3D transform rotateY
- Duration: 0.6s
- Backface visibility hidden

### Confetti Celebration
- Triggered on quiz completion
- Canvas-based particle system
- Duration: 3 seconds
- Colors: primary, gold, accent

### Tab Glow Effect
- Active tab has subtle box-shadow glow
- Pulse animation on first visit
- Color: primary with 30% opacity

---

## Color Palette for Gamification

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| XP Gold | #F59E0B | #FBBF24 |
| Streak Fire | #EF4444 | #F87171 |
| Achievement Purple | #8B5CF6 | #A78BFA |
| Progress Ring BG | #E2E8F0 | #334155 |
| Success Green | #10B981 | #34D399 |
| Warning Orange | #F97316 | #FB923C |

---

## Responsive Design

- Mobile-first approach
- Tab bar scrollable on small screens
- Quest header stacks on mobile
- Flashcard flip works on tap
- Quiz navigator becomes collapsible

---

## Success Metrics

1. **Engagement**: Time spent on chapter screens increases
2. **Completion**: More users complete all activities
3. **Retention**: Daily streak users return more often
4. **Satisfaction**: Positive feedback on gamification features
