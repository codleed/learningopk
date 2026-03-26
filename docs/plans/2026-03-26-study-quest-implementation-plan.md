# Study Quest - Chapter Screens Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign chapter screens (summary, exercises, flashcards, quiz) with gamification features including XP rewards, streak tracking, and achievement badges for high school students.

**Architecture:** Modern React components using Next.js App Router, integrating with existing design system. Gamification state managed via localStorage with custom hooks. Animations using Framer Motion.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons

---

## Phase 1: Gamification Foundation

### Task 1: Create Gamification Storage & Types

**Files:**
- Create: `frontend/src/lib/gamification-types.ts`
- Create: `frontend/src/lib/gamification-storage.ts`

**Step 1: Create gamification types**

```typescript
// frontend/src/lib/gamification-types.ts
export type BadgeId = 
  | "first_steps"
  | "scholar"
  | "problem_solver"
  | "memory_master"
  | "quiz_champion"
  | "streak_starter"
  | "streak_warrior"
  | "subject_master";

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  icon: string;
  criteria: string;
}

export const BADGE_DEFINITIONS: Record<BadgeId, BadgeDefinition> = {
  first_steps: { id: "first_steps", name: "First Steps", description: "Complete your first quest", icon: "🚀", criteria: "Complete first chapter" },
  scholar: { id: "scholar", name: "Scholar", description: "Read all summaries in a subject", icon: "📚", criteria: "Read all chapter summaries" },
  problem_solver: { id: "problem_solver", name: "Problem Solver", description: "Complete 50 exercises", icon: "🧩", criteria: "Solve 50 exercises" },
  memory_master: { id: "memory_master", name: "Memory Master", description: "Know 100 flashcards", icon: "🧠", criteria: "Mark 100 flashcards as known" },
  quiz_champion: { id: "quiz_champion", name: "Quiz Champion", description: "Score 100% on 5 quizzes", icon: "🏆", criteria: "Perfect score on 5 quizzes" },
  streak_starter: { id: "streak_starter", name: "Streak Starter", description: "Maintain 7-day streak", icon: "🔥", criteria: "7 day study streak" },
  streak_warrior: { id: "streak_warrior", name: "Streak Warrior", description: "Maintain 30-day streak", icon: "💪", criteria: "30 day study streak" },
  subject_master: { id: "subject_master", name: "Subject Master", description: "Complete all chapters", icon: "⭐", criteria: "Complete all chapters in subject" },
};

export type CardStatus = "new" | "learning" | "known" | "review";

export interface XpReward {
  amount: number;
  reason: string;
  timestamp: number;
}

export interface ChapterProgress {
  summaryRead: boolean;
  exercisesCompleted: number[];
  flashcardsReviewed: Record<string, CardStatus>;
  quizAttempts: QuizAttempt[];
}

export interface QuizAttempt {
  score: number;
  percentage: number;
  completedAt: string;
}

export interface GamificationState {
  xp: number;
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  unlockedBadges: BadgeId[];
  chapterProgress: Record<string, ChapterProgress>;
}

export const XP_REWARDS = {
  SUMMARY_READ: 10,
  EXERCISE_COMPLETE: 15,
  EXERCISE_MEDIUM: 20,
  EXERCISE_HARD: 25,
  EXERCISE_BONUS_ALL: 50,
  FLASHCARD_REVIEW: 5,
  FLASHCARD_KNOWN: 10,
  FLASHCARD_BONUS_ALL: 30,
  QUIZ_COMPLETE: 40,
  QUIZ_HIGH_SCORE: 50,
  QUIZ_PERFECT: 100,
} as const;

export function calculateLevel(totalXp: number): number {
  return Math.floor(totalXp / 500) + 1;
}
```

**Step 2: Create gamification storage module**

```typescript
// frontend/src/lib/gamification-storage.ts
import type { GamificationState, BadgeId, ChapterProgress, CardStatus } from "./gamification-types";

const STORAGE_KEY = "learningopk-gamification";

const DEFAULT_STATE: GamificationState = {
  xp: 0,
  totalXp: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  unlockedBadges: [],
  chapterProgress: {},
};

export function getGamificationState(): GamificationState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;
    return JSON.parse(stored) as GamificationState;
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveGamificationState(state: GamificationState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function addXp(amount: number): GamificationState {
  const state = getGamificationState();
  const newTotalXp = state.totalXp + amount;
  const newLevel = Math.floor(newTotalXp / 500) + 1;
  
  const newState: GamificationState = {
    ...state,
    xp: state.xp + amount,
    totalXp: newTotalXp,
    level: newLevel,
    lastActivityDate: new Date().toISOString().split("T")[0],
  };
  
  saveGamificationState(newState);
  return newState;
}

export function updateStreak(): GamificationState {
  const state = getGamificationState();
  const today = new Date().toISOString().split("T")[0];
  const lastDate = state.lastActivityDate;
  
  if (!lastDate) {
    const newState = { ...state, currentStreak: 1, longestStreak: 1, lastActivityDate: today };
    saveGamificationState(newState);
    return newState;
  }
  
  const last = new Date(lastDate);
  const now = new Date(today);
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return state;
  } else if (diffDays === 1) {
    const newStreak = state.currentStreak + 1;
    const newState = {
      ...state,
      currentStreak: newStreak,
      longestStreak: Math.max(state.longestStreak, newStreak),
      lastActivityDate: today,
    };
    saveGamificationState(newState);
    return newState;
  } else {
    const newState = { ...state, currentStreak: 1, lastActivityDate: today };
    saveGamificationState(newState);
    return newState;
  }
}

export function unlockBadge(badgeId: BadgeId): boolean {
  const state = getGamificationState();
  if (state.unlockedBadges.includes(badgeId)) return false;
  
  const newState = { ...state, unlockedBadges: [...state.unlockedBadges, badgeId] };
  saveGamificationState(newState);
  return true;
}

export function getChapterProgress(chapterId: string): ChapterProgress {
  const state = getGamificationState();
  return state.chapterProgress[chapterId] ?? {
    summaryRead: false,
    exercisesCompleted: [],
    flashcardsReviewed: {},
    quizAttempts: [],
  };
}

export function updateChapterProgress(chapterId: string, updates: Partial<ChapterProgress>): void {
  const state = getGamificationState();
  const current = state.chapterProgress[chapterId] ?? {
    summaryRead: false,
    exercisesCompleted: [],
    flashcardsReviewed: {},
    quizAttempts: [],
  };
  
  saveGamificationState({
    ...state,
    chapterProgress: {
      ...state.chapterProgress,
      [chapterId]: { ...current, ...updates },
    },
  });
}
```

**Step 3: Verify files created**

Run: `ls -la frontend/src/lib/gamification*.ts`
Expected: Both files exist

**Step 4: Commit**

```bash
git add frontend/src/lib/gamification-types.ts frontend/src/lib/gamification-storage.ts
git commit -m "feat: add gamification types and storage"
```

---

### Task 2: Create Gamification Hooks

**Files:**
- Create: `frontend/src/components/gamification/use-gamification.ts`
- Create: `frontend/src/components/gamification/use-xp-notifications.ts`
- Create: `frontend/src/components/gamification/use-streak-tracking.ts`

**Step 1: Create use-gamification hook**

```typescript
// frontend/src/components/gamification/use-gamification.ts
"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  getGamificationState,
  addXp as addXpToStorage,
  updateStreak as updateStreakStorage,
  getChapterProgress,
  updateChapterProgress,
} from "@/lib/gamification-storage";
import {
  type GamificationState,
  type ChapterProgress,
  type XpReward,
  type CardStatus,
  XP_REWARDS,
} from "@/lib/gamification-types";

export function useGamification() {
  const [state, setState] = useState<GamificationState>(getGamificationState);
  const [xpQueue, setXpQueue] = useState<XpReward[]>([]);
  const [leveledUp, setLeveledUp] = useState(false);

  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  useEffect(() => {
    if (isHydrated) {
      setState(getGamificationState());
    }
  }, [isHydrated]);

  const addXp = useCallback((amount: number, reason: string) => {
    const newState = addXpToStorage(amount);
    setState(newState);
    setXpQueue((prev) => [...prev, { amount, reason, timestamp: Date.now() }]);
    
    if (newState.level > state.level) {
      setLeveledUp(true);
      setTimeout(() => setLeveledUp(false), 3000);
    }
    
    return newState;
  }, [state.level]);

  const markSummaryRead = useCallback((chapterId: string) => {
    const progress = getChapterProgress(chapterId);
    if (!progress.summaryRead) {
      updateChapterProgress(chapterId, { summaryRead: true });
      updateStreakStorage();
      addXp(XP_REWARDS.SUMMARY_READ, "Read chapter summary");
    }
  }, [addXp]);

  const markExerciseComplete = useCallback((chapterId: string, exerciseId: number, difficulty: "easy" | "medium" | "hard") => {
    const progress = getChapterProgress(chapterId);
    if (!progress.exercisesCompleted.includes(exerciseId)) {
      const xpAmount = difficulty === "easy" ? XP_REWARDS.EXERCISE_COMPLETE 
        : difficulty === "medium" ? XP_REWARDS.EXERCISE_MEDIUM 
        : XP_REWARDS.EXERCISE_HARD;
      
      const newCompleted = [...progress.exercisesCompleted, exerciseId];
      updateChapterProgress(chapterId, { exercisesCompleted: newCompleted });
      updateStreakStorage();
      addXp(xpAmount, `Completed ${difficulty} exercise`);
    }
  }, [addXp]);

  const markFlashcardReviewed = useCallback((chapterId: string, cardId: string, status: CardStatus) => {
    const progress = getChapterProgress(chapterId);
    const xpAmount = status === "known" ? XP_REWARDS.FLASHCARD_KNOWN : XP_REWARDS.FLASHCARD_REVIEW;
    const newReviewed = { ...progress.flashcardsReviewed, [cardId]: status };
    updateChapterProgress(chapterId, { flashcardsReviewed: newReviewed });
    updateStreakStorage();
    addXp(xpAmount, status === "known" ? "Knew a flashcard" : "Reviewed a flashcard");
  }, [addXp]);

  const completeQuiz = useCallback((chapterId: string, score: number, percentage: number) => {
    const progress = getChapterProgress(chapterId);
    const attempt = { score, percentage, completedAt: new Date().toISOString() };
    const newAttempts = [...progress.quizAttempts, attempt];
    updateChapterProgress(chapterId, { quizAttempts: newAttempts });
    
    updateStreakStorage();
    addXp(XP_REWARDS.QUIZ_COMPLETE, "Completed quiz");
    
    if (percentage >= 80) {
      addXp(XP_REWARDS.QUIZ_HIGH_SCORE, "High quiz score (80%+)");
    }
    if (percentage === 100) {
      addXp(XP_REWARDS.QUIZ_PERFECT, "Perfect quiz score!");
    }
  }, [addXp]);

  const dismissXpNotification = useCallback((timestamp: number) => {
    setXpQueue((prev) => prev.filter((r) => r.timestamp !== timestamp));
  }, []);

  return {
    state,
    xpQueue,
    leveledUp,
    addXp,
    markSummaryRead,
    markExerciseComplete,
    markFlashcardReviewed,
    completeQuiz,
    dismissXpNotification,
  };
}
```

**Step 2: Create use-xp-notifications hook**

```typescript
// frontend/src/components/gamification/use-xp-notifications.ts
"use client";

import { useEffect, useState } from "react";
import type { XpReward } from "@/lib/gamification-types";

export function useXpNotifications(queue: XpReward[], onDismiss: (timestamp: number) => void) {
  const [visibleNotifications, setVisibleNotifications] = useState<XpReward[]>([]);

  useEffect(() => {
    if (queue.length === 0) return;
    
    const latest = queue[queue.length - 1];
    setVisibleNotifications((prev) => {
      if (prev.some((n) => n.timestamp === latest.timestamp)) return prev;
      return [...prev, latest];
    });

    const timer = setTimeout(() => {
      onDismiss(latest.timestamp);
    }, 3000);

    return () => clearTimeout(timer);
  }, [queue, onDismiss]);

  const dismiss = (timestamp: number) => {
    setVisibleNotifications((prev) => prev.filter((n) => n.timestamp !== timestamp));
    onDismiss(timestamp);
  };

  return { visibleNotifications, dismiss };
}
```

**Step 3: Create use-streak-tracking hook**

```typescript
// frontend/src/components/gamification/use-streak-tracking.ts
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getGamificationState, updateStreak } from "@/lib/gamification-storage";

export function useStreakTracking() {
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  useEffect(() => {
    if (isHydrated) {
      const state = getGamificationState();
      setStreak(state.currentStreak);
      setLongestStreak(state.longestStreak);
    }
  }, [isHydrated]);

  const checkAndUpdateStreak = () => {
    const newState = updateStreak();
    setStreak(newState.currentStreak);
    setLongestStreak(newState.longestStreak);
    return newState;
  };

  const getStreakMilestone = (): string | null => {
    const milestones = [3, 7, 14, 30, 60, 100];
    if (milestones.includes(streak)) {
      return `${streak}-Day Streak!`;
    }
    return null;
  };

  return { streak, longestStreak, checkAndUpdateStreak, getStreakMilestone };
}
```

**Step 4: Verify hooks created**

Run: `ls -la frontend/src/components/gamification/`
Expected: Three hook files exist

**Step 5: Commit**

```bash
git add frontend/src/components/gamification/
git commit -m "feat: add gamification hooks"
```

---

### Task 3: Create UI Components - Progress Ring & XP Toast

**Files:**
- Create: `frontend/src/components/gamification/progress-ring.tsx`
- Create: `frontend/src/components/gamification/xp-toast.tsx`
- Create: `frontend/src/components/gamification/streak-counter.tsx`

**Step 1: Create ProgressRing component**

```typescript
// frontend/src/components/gamification/progress-ring.tsx
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showPercentage?: boolean;
}

export function ProgressRing({
  progress,
  size = 60,
  strokeWidth = 6,
  className,
  showPercentage = true,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
          className="text-primary"
        />
      </svg>
      {showPercentage && (
        <span className="absolute text-xs font-semibold text-foreground">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
}
```

**Step 2: Create XpToast component**

```typescript
// frontend/src/components/gamification/xp-toast.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { XpReward } from "@/lib/gamification-types";

interface XpToastProps {
  notifications: XpReward[];
  onDismiss: (timestamp: number) => void;
}

export function XpToast({ notifications, onDismiss }: XpToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <motion.div
            key={notification.timestamp}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg",
              "bg-gradient-to-r from-amber-500 to-yellow-500",
              "text-white"
            )}
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: 1 }}
            >
              <Star className="h-5 w-5 fill-current" />
            </motion.div>
            <div>
              <p className="font-bold text-lg">+{notification.amount} XP</p>
              <p className="text-xs opacity-90">{notification.reason}</p>
            </div>
            <button
              onClick={() => onDismiss(notification.timestamp)}
              className="ml-2 rounded-full p-1 hover:bg-white/20 transition-colors"
            >
              <span className="sr-only">Dismiss</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M9.5 3.205L8.795 2.5 6 5.295 3.205 2.5l-.705.705L5.295 6 2.5 8.795l.705.705L6 6.705 8.795 9.5l.705-.705L6.705 6z" />
              </svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

**Step 3: Create StreakCounter component**

```typescript
// frontend/src/components/gamification/streak-counter.tsx
"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakCounterProps {
  streak: number;
  className?: string;
}

export function StreakCounter({ streak, className }: StreakCounterProps) {
  if (streak === 0) return null;

  const getStreakColor = () => {
    if (streak >= 30) return "text-red-500";
    if (streak >= 14) return "text-orange-500";
    if (streak >= 7) return "text-amber-500";
    return "text-yellow-500";
  };

  return (
    <motion.div
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5",
        "bg-gradient-to-r from-orange-100 to-red-100",
        "dark:from-orange-900/30 dark:to-red-900/30",
        className
      )}
    >
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Flame className={cn("h-4 w-4", getStreakColor())} />
      </motion.div>
      <span className={cn("text-sm font-bold", getStreakColor())}>{streak}</span>
    </motion.div>
  );
}
```

**Step 4: Verify components created**

Run: `ls -la frontend/src/components/gamification/*.tsx`
Expected: Three component files exist

**Step 5: Commit**

```bash
git add frontend/src/components/gamification/
git commit -m "feat: add progress ring, XP toast, and streak counter components"
```

---

### Task 4: Create Quest Header Component

**Files:**
- Create: `frontend/src/components/learn/quest-header.tsx`
- Modify: `frontend/src/components/learn/chapter-study-workspace.tsx`

**Step 1: Create QuestHeader component**

```typescript
// frontend/src/components/learn/quest-header.tsx
"use client";

import Link from "next/link";
import { ChevronLeft, Star, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { ProgressRing } from "@/components/gamification/progress-ring";
import { StreakCounter } from "@/components/gamification/streak-counter";
import { cn } from "@/lib/utils";
import type { GamificationState } from "@/lib/gamification-types";

interface QuestHeaderProps {
  boardName: string;
  boardSlug: string;
  classSlug: string;
  subjectName: string;
  subjectSlug: string;
  chapterNumber: number;
  chapterTitle: string;
  gamificationState: GamificationState;
  streak: number;
  completionPercent: number;
}

export function QuestHeader({
  boardName,
  boardSlug,
  classSlug,
  subjectName,
  subjectSlug,
  chapterNumber,
  chapterTitle,
  gamificationState,
  streak,
  completionPercent,
}: QuestHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <Link
            href={`/${boardSlug}/${classSlug}/${subjectSlug}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{subjectName}</span>
          </Link>
          
          <StreakCounter streak={streak} />
        </div>

        <div className="flex items-start gap-6">
          <ProgressRing progress={completionPercent} size={80} strokeWidth={8} />
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                Quest {chapterNumber}
              </span>
              <span className="text-xs text-muted-foreground">
                {boardName} • Class {classSlug.replace("grade-", "")}
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {chapterTitle}
            </h1>
            
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                >
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                </motion.div>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {gamificationState.xp} XP
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-3 py-1.5">
                <Trophy className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  Level {gamificationState.level}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {completionPercent < 100 ? `${Math.round(100 - completionPercent)}% remaining to complete quest` : "Quest completed! Great job!"}
        </p>
      </div>
    </header>
  );
}
```

**Step 2: Modify chapter-study-workspace to integrate quest header**

Update imports and add hooks:
```typescript
import { useGamification } from "@/components/gamification/use-gamification";
import { useStreakTracking } from "@/components/gamification/use-streak-tracking";
import { XpToast } from "@/components/gamification/xp-toast";
import { QuestHeader } from "./quest-header";
```

Add after state initialization:
```typescript
const { state: gamState, xpQueue, dismissXpNotification, leveledUp } = useGamification();
const { streak } = useStreakTracking();
```

Replace the header section with QuestHeader component

**Step 3: Verify component works**

Run: `npm run typecheck 2>&1 | head -50`
Expected: No type errors

**Step 4: Commit**

```bash
git add frontend/src/components/learn/quest-header.tsx frontend/src/components/learn/chapter-study-workspace.tsx
git commit -m "feat: add quest header with XP and progress display"
```

---

## Phase 2: Enhanced Tab Navigation

### Task 5: Create Quest Tab Bar

**Files:**
- Create: `frontend/src/components/learn/quest-tab-bar.tsx`

**Step 1: Create QuestTabBar component**

```typescript
// frontend/src/components/learn/quest-tab-bar.tsx
"use client";

import { BookOpen, Dumbbell, Layers, HelpCircle, Check } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ChapterTab = "summary" | "exercises" | "flashcards" | "quiz";

interface TabStatus {
  summary: boolean;
  exercises: number;
  totalExercises: number;
  flashcards: number;
  totalFlashcards: number;
  quizCompleted: boolean;
}

interface QuestTabBarProps {
  activeTab: ChapterTab;
  baseHref: string;
  status: TabStatus;
}

const TAB_ICONS: Record<string, React.ReactNode> = {
  summary: <BookOpen className="h-4 w-4" />,
  exercises: <Dumbbell className="h-4 w-4" />,
  flashcards: <Layers className="h-4 w-4" />,
  quiz: <HelpCircle className="h-4 w-4" />,
};

const TAB_LABELS: Record<string, string> = {
  summary: "Study",
  exercises: "Training",
  flashcards: "Memory",
  quiz: "Challenge",
};

export function QuestTabBar({ activeTab, baseHref, status }: QuestTabBarProps) {
  const tabs: Array<{ key: ChapterTab; label: string }> = [
    { key: "summary", label: "Study" },
    { key: "exercises", label: "Training" },
    { key: "flashcards", label: "Memory" },
    { key: "quiz", label: "Challenge" },
  ];

  const getTabStatus = (key: string) => {
    switch (key) {
      case "summary":
        return status.summary;
      case "exercises":
        return status.exercises >= status.totalExercises;
      case "flashcards":
        return status.flashcards >= status.totalFlashcards;
      case "quiz":
        return status.quizCompleted;
      default:
        return false;
    }
  };

  const getTabProgress = (key: string) => {
    switch (key) {
      case "exercises":
        return `${status.exercises}/${status.totalExercises}`;
      case "flashcards":
        return `${status.flashcards}/${status.totalFlashcards}`;
      default:
        return null;
    }
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        const isComplete = getTabStatus(tab.key);
        const progress = getTabProgress(tab.key);
        const icon = TAB_ICONS[tab.key];

        return (
          <Link
            key={tab.key}
            href={`${baseHref}?tab=${tab.key}`}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
              "whitespace-nowrap",
              isActive
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span className="relative">
              {icon}
              {isComplete && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500"
                >
                  <Check className="h-2 w-2 text-white" />
                </motion.span>
              )}
            </span>
            
            <span>{TAB_LABELS[tab.key] ?? tab.label}</span>
            
            {progress && (
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs",
                isActive ? "bg-primary-foreground/20" : "bg-muted"
              )}>
                {progress}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
```

**Step 2: Update chapter-study-workspace imports and usage**

```typescript
import { QuestTabBar } from "./quest-tab-bar";

// Add status prop and render
const tabStatus = {
  summary: chapterProgress?.summaryRead ?? false,
  exercises: chapterProgress?.exercisesCompleted?.length ?? 0,
  totalExercises: exercises?.length ?? 0,
  flashcards: Object.keys(chapterProgress?.flashcardsReviewed ?? {}).length,
  totalFlashcards: flashcards?.length ?? 0,
  quizCompleted: (chapterProgress?.quizAttempts?.length ?? 0) > 0,
};

// Replace tabs with QuestTabBar
<QuestTabBar 
  activeTab={activeTab} 
  baseHref={`/${boardSlug}/${classSlug}/${subjectSlug}/${chapterSlug}`}
  status={tabStatus}
/>
```

**Step 3: Verify**

Run: `npm run lint`
Expected: No lint errors

**Step 4: Commit**

```bash
git add frontend/src/components/learn/quest-tab-bar.tsx
git commit -m "feat: add quest tab bar with progress indicators"
```

---

## Phase 3: Summary Screen Enhancement

### Task 6: Create Quest Summary View

**Files:**
- Create: `frontend/src/components/learn/quest-summary-view.tsx`
- Modify: `frontend/src/components/learn/chapter-study-content-with-ai.tsx`

**Step 1: Create QuestSummaryView component**

```typescript
// frontend/src/components/learn/quest-summary-view.tsx
"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "./markdown-content";
import { cn } from "@/lib/utils";

interface QuestSummaryViewProps {
  summary: string;
  chapterId: number;
  isRead: boolean;
  onMarkRead: () => void;
}

export function QuestSummaryView({
  summary,
  chapterId,
  isRead,
  onMarkRead,
}: QuestSummaryViewProps) {
  const estimatedReadTime = Math.max(1, Math.ceil(summary.length / 1000));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>~{estimatedReadTime} min read</span>
        </div>
        
        {isRead && (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Completed</span>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <MarkdownContent content={summary} />
      </div>

      {!isRead && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          
          <div>
            <p className="font-semibold text-foreground">Finished reading?</p>
            <p className="text-sm text-muted-foreground">
              Mark as complete to earn +10 XP
            </p>
          </div>
          
          <Button onClick={onMarkRead} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            I've Read This
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              +10 XP
            </span>
          </Button>
        </motion.div>
      )}
    </div>
  );
}
```

**Step 2: Update chapter-study-content-with-ai.tsx**

```typescript
import { QuestSummaryView } from "./quest-summary-view";

// In render, replace summary section:
{activeTab === "summary" && (
  <QuestSummaryView
    summary={summary}
    chapterId={chapterId}
    isRead={chapterProgress?.summaryRead ?? false}
    onMarkRead={() => markSummaryRead(String(chapterId))}
  />
)}
```

**Step 3: Commit**

```bash
git add frontend/src/components/learn/quest-summary-view.tsx
git commit -m "feat: enhance summary with quest view"
```

---

## Phase 4: Exercises Screen Enhancement

### Task 7: Create Quest Exercises View

**Files:**
- Create: `frontend/src/components/learn/quest-exercises-view.tsx`

**Step 1: Create QuestExercisesView component**

```typescript
// frontend/src/components/learn/quest-exercises-view.tsx
"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Flame, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChapterDetailResponse } from "@/lib/learn-api";
import { XP_REWARDS } from "@/lib/gamification-types";

type Exercise = ChapterDetailResponse["exercises"][number];

interface QuestExercisesViewProps {
  exercises: Exercise[];
  completedIds: number[];
  onMarkComplete: (exerciseId: number, difficulty: "easy" | "medium" | "hard") => void;
}

const DIFFICULTY_CONFIG = {
  easy: { label: "Easy", color: "bg-emerald-500/10 text-emerald-600", xp: XP_REWARDS.EXERCISE_COMPLETE },
  medium: { label: "Medium", color: "bg-amber-500/10 text-amber-600", xp: XP_REWARDS.EXERCISE_MEDIUM },
  hard: { label: "Hard", color: "bg-orange-500/10 text-orange-600", xp: XP_REWARDS.EXERCISE_HARD },
};

export function QuestExercisesView({
  exercises,
  completedIds,
  onMarkComplete,
}: QuestExercisesViewProps) {
  const completedCount = completedIds.length;
  const totalCount = exercises.length;
  const allCompleted = completedCount >= totalCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
            <Flame className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Training Ground</p>
            <p className="font-semibold">
              {completedCount}/{totalCount} completed
            </p>
          </div>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(completedCount / totalCount) * 100}%` }}
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400"
        />
      </div>

      <div className="space-y-4">
        {exercises.map((exercise, index) => {
          const isComplete = completedIds.includes(exercise.id);
          const difficulty = (exercise.difficulty?.toLowerCase() ?? "easy") as "easy" | "medium" | "hard";
          const config = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.easy;

          return (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "rounded-xl border p-4 transition-all",
                isComplete
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </span>
                    <Badge className={config.color}>{config.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      +{config.xp} XP
                    </span>
                  </div>
                  
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm">{exercise.question}</p>
                  </div>
                  
                  {exercise.solution && (
                    <div className="mt-3 rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-muted-foreground">
                        Answer: {exercise.solution}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  {isComplete ? (
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-sm font-medium text-white">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Solved!</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onMarkComplete(exercise.id, difficulty)}
                    >
                      Mark Solved
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {allCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-amber-500/10 p-8 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-amber-400">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold">Training Complete!</p>
            <p className="text-muted-foreground">
              You've conquered all exercises!
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-lg font-bold text-primary-foreground">
            <Sparkles className="h-5 w-5" />
            <span>+{XP_REWARDS.EXERCISE_BONUS_ALL} XP Bonus!</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
```

**Step 2: Update chapter-exercises-with-ai.tsx**

```typescript
import { QuestExercisesView } from "./quest-exercises-view";

// Replace exercise rendering with QuestExercisesView
```

**Step 3: Commit**

```bash
git add frontend/src/components/learn/quest-exercises-view.tsx
git commit -m "feat: enhance exercises with quest view"
```

---

## Phase 5: Flashcards Screen Enhancement

### Task 8: Create Quest Flashcard View

**Files:**
- Create: `frontend/src/components/learn/quest-flashcard-view.tsx`

**Step 1: Create QuestFlashcardView component**

```typescript
// frontend/src/components/learn/quest-flashcard-view.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChapterDetailResponse } from "@/lib/learn-api";
import { XP_REWARDS } from "@/lib/gamification-types";

type Flashcard = ChapterDetailResponse["flashcards"][number];
type CardStatus = "new" | "learning" | "known" | "review";

interface QuestFlashcardViewProps {
  flashcards: Flashcard[];
  statuses: Record<string, CardStatus>;
  onMarkReviewed: (cardId: string, status: CardStatus) => void;
}

const CARD_SIDE = {
  FRONT: "front",
  BACK: "back",
} as const;

export function QuestFlashcardView({
  flashcards,
  statuses,
  onMarkReviewed,
}: QuestFlashcardViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSide, setCurrentSide] = useState<typeof CARD_SIDE[keyof typeof CARD_SIDE]>(CARD_SIDE.FRONT);

  const currentCard = flashcards[currentIndex];
  const totalCards = flashcards.length;
  
  const stats = {
    known: Object.values(statuses).filter((s) => s === "known").length,
    review: Object.values(statuses).filter((s) => s === "review").length,
    total: Object.keys(statuses).length,
  };

  const progress = (stats.total / totalCards) * 100;
  const isComplete = stats.total >= totalCards;

  const flipCard = () => {
    setCurrentSide(currentSide === CARD_SIDE.FRONT ? CARD_SIDE.BACK : CARD_SIDE.FRONT);
  };

  const nextCard = () => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(currentIndex + 1);
      setCurrentSide(CARD_SIDE.FRONT);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setCurrentSide(CARD_SIDE.FRONT);
    }
  };

  const handleMark = (status: CardStatus) => {
    onMarkReviewed(String(currentCard.id), status);
    nextCard();
  };

  const getStatusBadge = (status?: CardStatus) => {
    switch (status) {
      case "new":
        return <Badge className="bg-blue-500/10 text-blue-600">New</Badge>;
      case "learning":
        return <Badge className="bg-amber-500/10 text-amber-600">Learning</Badge>;
      case "known":
        return <Badge className="bg-emerald-500/10 text-emerald-600">Known</Badge>;
      case "review":
        return <Badge className="bg-orange-500/10 text-orange-600">Review</Badge>;
      default:
        return null;
    }
  };

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No flashcards available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
            <span className="text-lg">🃏</span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Memory Arena</p>
            <p className="font-semibold">
              {currentIndex + 1} of {totalCards}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-emerald-600">✓ {stats.known}</span>
            <span className="text-orange-600">↻ {stats.review}</span>
          </div>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
        />
      </div>

      <div className="flex justify-center py-4">
        <div
          className="relative h-64 w-full max-w-md cursor-pointer perspective-1000"
          onClick={flipCard}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCard.id}
              initial={{ rotateY: 0 }}
              animate={{ rotateY: currentSide === CARD_SIDE.BACK ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 rounded-2xl border-2 border-border bg-card p-6 shadow-lg"
            >
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4">{getStatusBadge(statuses[String(currentCard.id)])}</div>
                
                <p className="text-lg font-medium">
                  {currentSide === CARD_SIDE.FRONT
                    ? currentCard.front
                    : currentCard.back}
                </p>
                
                <p className="mt-4 text-sm text-muted-foreground">
                  {currentSide === CARD_SIDE.FRONT ? "Tap to reveal" : "Tap to flip back"}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {currentSide === CARD_SIDE.BACK && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center gap-4"
        >
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleMark("review")}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Review Again
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              +5 XP
            </span>
          </Button>
          
          <Button
            size="lg"
            onClick={() => handleMark("known")}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500"
          >
            <CheckCircle2 className="h-4 w-4" />
            Know It!
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              +10 XP
            </span>
          </Button>
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={prevCard}
          disabled={currentIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <div className="flex gap-1">
          {flashcards.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i === currentIndex ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        
        <Button
          variant="ghost"
          onClick={nextCard}
          disabled={currentIndex === totalCards - 1}
          className="gap-2"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {isComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-8 text-center"
        >
          <Sparkles className="h-12 w-12 text-primary" />
          <p className="text-xl font-bold">Memory Arena Complete!</p>
          <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-lg font-bold text-primary-foreground">
            <Sparkles className="h-5 w-5" />
            <span>+{XP_REWARDS.FLASHCARD_BONUS_ALL} XP Bonus!</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
```

**Step 2: Update flashcard-deck.tsx to use new view**

```typescript
import { QuestFlashcardView } from "./quest-flashcard-view";
```

**Step 3: Commit**

```bash
git add frontend/src/components/learn/quest-flashcard-view.tsx
git commit -m "feat: enhance flashcards with quest view"
```

---

## Phase 6: Quiz Screen Enhancement

### Task 9: Create Quest Quiz View

**Files:**
- Create: `frontend/src/components/learn/quest-quiz-view.tsx`

**Step 1: Create QuestQuizView component**

```typescript
// frontend/src/components/learn/quest-quiz-view.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  Sparkles, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChapterDetailResponse } from "@/lib/learn-api";
import { XP_REWARDS } from "@/lib/gamification-types";

type Quiz = NonNullable<ChapterDetailResponse["quiz"]>;
type AnswerOption = "a" | "b" | "c" | "d";

interface QuestQuizViewProps {
  quiz: Quiz;
  chapterId: number;
  onComplete: (score: number, percentage: number) => void;
}

interface QuestionResult {
  selectedOption: AnswerOption | null;
  isCorrect: boolean;
}

export function QuestQuizView({ quiz, chapterId, onComplete }: QuestQuizViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerOption>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(quiz.durationMinutes * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);

  const currentQuestion = quiz.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isTimeUp = remainingSeconds === 0;

  useEffect(() => {
    if (isSubmitted || remainingSeconds <= 0) return;
    
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isSubmitted, remainingSeconds]);

  const selectAnswer = (option: AnswerOption) => {
    if (isSubmitted || isTimeUp) return;
    setAnswers((prev) => ({ ...prev, [String(currentQuestion.id)]: option }));
  };

  const calculateResults = () => {
    const questionResults: QuestionResult[] = quiz.questions.map((q) => ({
      selectedOption: answers[String(q.id)] ?? null,
      isCorrect: answers[String(q.id)] === q.correctOption,
    }));
    return questionResults;
  };

  const submitQuiz = () => {
    const questionResults = calculateResults();
    setResults(questionResults);
    setIsSubmitted(true);
    
    const correctCount = questionResults.filter((r) => r.isCorrect).length;
    const percentage = Math.round((correctCount / quiz.questions.length) * 100);
    onComplete(correctCount, percentage);
    
    if (percentage === 100) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
  };

  const retakeQuiz = () => {
    setAnswers({});
    setCurrentIndex(0);
    setIsSubmitted(false);
    setResults([]);
    setRemainingSeconds(quiz.durationMinutes * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (remainingSeconds <= 60) return "text-red-500 bg-red-500/10";
    if (remainingSeconds <= 300) return "text-amber-500 bg-amber-500/10";
    return "text-primary bg-primary/10";
  };

  if (quiz.questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No quiz questions available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
            <Target className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Challenge Arena</p>
            <p className="font-semibold">{quiz.title}</p>
          </div>
        </div>
        
        <div className={cn("flex items-center gap-2 rounded-full px-4 py-2", getTimerColor())}>
          <Clock className="h-4 w-4" />
          <span className="font-mono font-bold">{formatTime(remainingSeconds)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {quiz.questions.map((q, i) => {
          const isAnswered = !!answers[String(q.id)];
          const isCurrent = i === currentIndex;
          const isCorrect = isSubmitted && results[i]?.isCorrect;
          const isWrong = isSubmitted && results[i] && !results[i].isCorrect;

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-all",
                isCurrent && "ring-2 ring-primary ring-offset-2",
                isAnswered && "bg-primary text-primary-foreground",
                !isAnswered && "bg-muted text-muted-foreground hover:bg-muted/70",
                isCorrect && "bg-emerald-500 text-white",
                isWrong && "bg-red-500 text-white"
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {!isSubmitted && (
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-600">Potential Rewards</p>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Complete Quiz: +{XP_REWARDS.QUIZ_COMPLETE} XP</p>
            <p className="font-semibold text-amber-600">
              Total: +{XP_REWARDS.QUIZ_COMPLETE + XP_REWARDS.QUIZ_HIGH_SCORE + XP_REWARDS.QUIZ_PERFECT} XP
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <Badge variant="neutral">{currentIndex + 1} of {quiz.questions.length}</Badge>
          {isTimeUp && !isSubmitted && (
            <Badge variant="destructive">Time's Up!</Badge>
          )}
        </div>

        <p className="mb-6 text-lg">{currentQuestion.question}</p>

        <div className="space-y-3">
          {(["a", "b", "c", "d"] as AnswerOption[]).map((option) => {
            const optionKey = `option${option.toUpperCase()}` as keyof typeof currentQuestion;
            const optionText = currentQuestion[optionKey] as string;
            const isSelected = answers[String(currentQuestion.id)] === option;
            const isCorrectOption = isSubmitted && currentQuestion.correctOption === option;
            const isWrongSelection = isSubmitted && isSelected && !isCorrectOption;

            return (
              <button
                key={option}
                onClick={() => selectAnswer(option)}
                disabled={isSubmitted || isTimeUp}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                  isSelected && !isSubmitted && "border-primary bg-primary/5",
                  isSelected && isSubmitted && isCorrectOption && "border-emerald-500 bg-emerald-500/10",
                  isSelected && isSubmitted && isWrongSelection && "border-red-500 bg-red-500/10",
                  !isSelected && "border-border hover:border-primary/50",
                  (isSubmitted || isTimeUp) && "cursor-not-allowed opacity-80"
                )}
              >
                <span className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg font-bold",
                  isSelected && !isSubmitted && "bg-primary text-primary-foreground",
                  isSelected && isSubmitted && isCorrectOption && "bg-emerald-500 text-white",
                  isSelected && isSubmitted && isWrongSelection && "bg-red-500 text-white",
                  !isSelected && "bg-muted"
                )}>
                  {option.toUpperCase()}
                </span>
                <span className="flex-1">{optionText}</span>
                {isCorrectOption && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                {isWrongSelection && <XCircle className="h-5 w-5 text-red-500" />}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <Button
            variant="ghost"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => setCurrentIndex(Math.min(quiz.questions.length - 1, currentIndex + 1))}
            disabled={currentIndex === quiz.questions.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {!isSubmitted && (
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={submitQuiz}
            disabled={isTimeUp === false && answeredCount < quiz.questions.length}
            className="gap-2"
          >
            <Trophy className="h-5 w-5" />
            Submit Quiz
          </Button>
        </div>
      )}

      {isSubmitted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-purple-500/10 p-8 text-center"
        >
          {showCelebration && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="mb-4"
            >
              <Sparkles className="mx-auto h-16 w-16 text-amber-500" />
            </motion.div>
          )}
          
          <h2 className="text-2xl font-bold">
            {results.filter(r => r.isCorrect).length === quiz.questions.length 
              ? "Perfect Score!" 
              : "Quiz Complete!"}
          </h2>
          
          <div className="my-6">
            <span className="text-5xl font-bold text-primary">
              {Math.round((results.filter(r => r.isCorrect).length / quiz.questions.length) * 100)}%
            </span>
            <p className="mt-2 text-muted-foreground">
              {results.filter(r => r.isCorrect).length} of {quiz.questions.length} correct
            </p>
          </div>

          <Button onClick={retakeQuiz} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Try Again (+10 XP)
          </Button>
        </motion.div>
      )}
    </div>
  );
}
```

**Step 2: Update quiz-runner.tsx to use new view**

```typescript
import { QuestQuizView } from "./quest-quiz-view";
```

**Step 3: Commit**

```bash
git add frontend/src/components/learn/quest-quiz-view.tsx
git commit -m "feat: enhance quiz with quest view"
```

---

## Phase 7: Final Integration

### Task 10: Create Confetti Celebration & Integrate All

**Files:**
- Create: `frontend/src/components/gamification/confetti-celebration.tsx`
- Modify: `frontend/src/components/learn/chapter-study-workspace.tsx`

**Step 1: Create ConfettiCelebration component**

```typescript
// frontend/src/components/gamification/confetti-celebration.tsx
"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";

interface ConfettiCelebrationProps {
  show: boolean;
  onComplete?: () => void;
}

const COLORS = ["#7ac943", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

export function ConfettiCelebration({ show, onComplete }: ConfettiCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!show || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 20,
        vy: Math.random() * -15 - 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 10 + 5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    let frame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let activeCount = 0;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5;
        p.rotation += p.rotationSpeed;

        if (p.y < canvas.height + 50) {
          activeCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2);
          ctx.restore();
        }
      });

      if (activeCount > 0) {
        frame = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none fixed inset-0 z-50"
        />
      )}
    </AnimatePresence>
  );
}
```

**Step 2: Final integration in chapter-study-workspace.tsx**

```typescript
import { useGamification } from "@/components/gamification/use-gamification";
import { useXpNotifications } from "@/components/gamification/use-xp-notifications";
import { useStreakTracking } from "@/components/gamification/use-streak-tracking";
import { XpToast } from "@/components/gamification/xp-toast";
import { ConfettiCelebration } from "@/components/gamification/confetti-celebration";
import { QuestHeader } from "./quest-header";
import { QuestTabBar } from "./quest-tab-bar";

// In component:
const { state, xpQueue, dismissXpNotification, leveledUp, markSummaryRead, markExerciseComplete, markFlashcardReviewed, completeQuiz } = useGamification();
const { streak } = useStreakTracking();
const { visibleNotifications, dismiss } = useXpNotifications(xpQueue, dismissXpNotification);
const [showConfetti, setShowConfetti] = useState(false);

// Wrap return with providers
return (
  <>
    <XpToast notifications={visibleNotifications} onDismiss={dismiss} />
    <ConfettiCelebration show={leveledUp || showConfetti} onComplete={() => setShowConfetti(false)} />
    {/* existing content */}
  </>
);
```

**Step 3: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add frontend/src/components/learn/ frontend/src/components/gamification/
git commit -m "feat: integrate all quest components and celebration effects"
```

---

## Verification Checklist

After all tasks complete, verify:

- [ ] XP toasts appear when completing actions
- [ ] Streak counter displays and updates
- [ ] Progress ring animates on load
- [ ] Tab bar shows completion status
- [ ] Summary marks as read and awards XP
- [ ] Exercises show XP rewards and completion
- [ ] Flashcards flip and award XP
- [ ] Quiz completes with XP breakdown
- [ ] Confetti plays on level up
- [ ] Dark/light themes work correctly
- [ ] Responsive on mobile devices
- [ ] No console errors
- [ ] TypeScript compiles without errors
- [ ] Build succeeds
