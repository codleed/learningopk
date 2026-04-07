"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import {
  getGamificationState,
  addXp as addXpToStorage,
  updateStreak as updateStreakStorage,
  getChapterProgress,
  updateChapterProgress,
} from "@/lib/gamification-storage";
import {
  type GamificationState,
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

  const addXp = useCallback((amount: number, reason: string) => {
    const newState = addXpToStorage(amount);
    setState(newState);
    const timestamp = Date.now();
    setXpQueue((prev) => [...prev, { id: crypto.randomUUID(), amount, reason, timestamp }]);
    
    if (newState.level > state.level) {
      setLeveledUp(true);
      setTimeout(() => setLeveledUp(false), 3000);
    }
    
    return newState;
  }, [state.level]);

  const markSummaryRead = useCallback((chapterId: string) => {
    const progress = getChapterProgress(chapterId);
    if (!progress.summaryRead) {
      const xpAmount = XP_REWARDS.SUMMARY_READ;
      updateChapterProgress(chapterId, {
        summaryRead: true,
        xpEarned: (progress.xpEarned ?? 0) + xpAmount,
      });
      updateStreakStorage();
      addXp(xpAmount, "Read chapter summary");
    }
  }, [addXp]);

  const markExerciseComplete = useCallback((chapterId: string, exerciseId: number, difficulty: "easy" | "medium" | "hard") => {
    const progress = getChapterProgress(chapterId);
    if (!progress.exercisesCompleted.includes(exerciseId)) {
      const xpAmount = difficulty === "easy" ? XP_REWARDS.EXERCISE_COMPLETE 
        : difficulty === "medium" ? XP_REWARDS.EXERCISE_MEDIUM 
        : XP_REWARDS.EXERCISE_HARD;
      
      const newCompleted = [...progress.exercisesCompleted, exerciseId];
      updateChapterProgress(chapterId, {
        exercisesCompleted: newCompleted,
        xpEarned: (progress.xpEarned ?? 0) + xpAmount,
      });
      updateStreakStorage();
      addXp(xpAmount, `Completed ${difficulty} exercise`);
    }
  }, [addXp]);

  const markFlashcardReviewed = useCallback((chapterId: string, cardId: string, status: CardStatus) => {
    const progress = getChapterProgress(chapterId);
    const xpAmount = status === "known" ? XP_REWARDS.FLASHCARD_KNOWN : XP_REWARDS.FLASHCARD_REVIEW;
    const newReviewed = { ...progress.flashcardsReviewed, [cardId]: status };
    updateChapterProgress(chapterId, {
      flashcardsReviewed: newReviewed,
      xpEarned: (progress.xpEarned ?? 0) + xpAmount,
    });
    updateStreakStorage();
    addXp(xpAmount, status === "known" ? "Knew a flashcard" : "Reviewed a flashcard");
  }, [addXp]);

  const completeQuiz = useCallback((chapterId: string, score: number, percentage: number) => {
    const progress = getChapterProgress(chapterId);
    const attempt = { score, percentage, completedAt: new Date().toISOString() };
    const newAttempts = [...progress.quizAttempts, attempt];
    
    let totalXpAwarded = XP_REWARDS.QUIZ_COMPLETE;
    if (percentage >= 80) totalXpAwarded += XP_REWARDS.QUIZ_HIGH_SCORE;
    if (percentage === 100) totalXpAwarded += XP_REWARDS.QUIZ_PERFECT;

    updateChapterProgress(chapterId, {
      quizAttempts: newAttempts,
      xpEarned: (progress.xpEarned ?? 0) + totalXpAwarded,
    });
    
    updateStreakStorage();
    addXp(XP_REWARDS.QUIZ_COMPLETE, "Completed quiz");
    
    if (percentage >= 80) {
      addXp(XP_REWARDS.QUIZ_HIGH_SCORE, "High quiz score (80%+)");
    }
    if (percentage === 100) {
      addXp(XP_REWARDS.QUIZ_PERFECT, "Perfect quiz score!");
    }
  }, [addXp]);

  const dismissXpNotification = useCallback((notificationId: string) => {
    setXpQueue((prev) => prev.filter((r) => r.id !== notificationId));
  }, []);

  return {
    state: isHydrated ? state : getGamificationState(),
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
