// frontend/src/lib/gamification-storage.ts
import type { GamificationState, BadgeId, ChapterProgress } from "./gamification-types";
import { computeLevelFromXp, XP_REWARDS } from "./gamification-types";

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
  const levelDef = computeLevelFromXp(newTotalXp);
  
  const newState: GamificationState = {
    ...state,
    xp: state.xp + amount,
    totalXp: newTotalXp,
    level: levelDef.level,
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
    const newState = { ...state, currentStreak: 1, longestStreak: state.longestStreak, lastActivityDate: today };
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
  return Object.assign(
    {
      summaryRead: false,
      subpartsRead: [],
      exercisesCompleted: [],
      flashcardsReviewed: {},
      quizAttempts: [],
      xpEarned: 0,
    },
    state.chapterProgress[chapterId],
  );
}

export function updateChapterProgress(chapterId: string, updates: Partial<ChapterProgress>): void {
  const state = getGamificationState();
  const current: ChapterProgress = Object.assign(
    {
      summaryRead: false,
      subpartsRead: [],
      exercisesCompleted: [],
      flashcardsReviewed: {},
      quizAttempts: [],
      xpEarned: 0,
    },
    state.chapterProgress[chapterId],
  );

  saveGamificationState({
    ...state,
    chapterProgress: {
      ...state.chapterProgress,
      [chapterId]: { ...current, ...updates },
    },
  });

  // Notify components that chapter progress has changed
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("chapter-progress-updated"));
  }
}

export function markSubpartRead(
  chapterId: string,
  subpartId: number,
  totalSubparts: number
): { summaryRead: boolean; xpAwarded: number } {
  const progress = getChapterProgress(chapterId);
  const alreadyRead = progress.subpartsRead.includes(subpartId);

  if (alreadyRead) {
    return { summaryRead: progress.summaryRead, xpAwarded: 0 };
  }

  const subpartsRead = [...progress.subpartsRead, subpartId];
  const summaryRead = subpartsRead.length >= totalSubparts;
  const xpAwarded = XP_REWARDS.SUBPART_READ;

  updateChapterProgress(chapterId, {
    subpartsRead,
    summaryRead,
    xpEarned: (progress.xpEarned ?? 0) + xpAwarded,
  });

  return { summaryRead, xpAwarded };
}
