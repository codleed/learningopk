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
