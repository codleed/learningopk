"use client";

import { useState, useSyncExternalStore } from "react";
import { getGamificationState, updateStreak } from "@/lib/gamification-storage";

export function useStreakTracking() {
  const initialState = getGamificationState();
  const [streak, setStreak] = useState(initialState.currentStreak);
  const [longestStreak, setLongestStreak] = useState(initialState.longestStreak);
  
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  const hydratedState = isHydrated ? getGamificationState() : initialState;
  const currentStreak = isHydrated ? hydratedState.currentStreak : streak;
  const currentLongestStreak = isHydrated ? hydratedState.longestStreak : longestStreak;

  const checkAndUpdateStreak = () => {
    const newState = updateStreak();
    setStreak(newState.currentStreak);
    setLongestStreak(newState.longestStreak);
    return newState;
  };

  const getStreakMilestone = (): string | null => {
    const milestones = [3, 7, 14, 30, 60, 100];
    if (milestones.includes(currentStreak)) {
      return `${currentStreak}-Day Streak!`;
    }
    return null;
  };

  return {
    streak: currentStreak,
    longestStreak: currentLongestStreak,
    checkAndUpdateStreak,
    getStreakMilestone,
  };
}
