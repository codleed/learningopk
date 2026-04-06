import { eq, sql } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { users } from "../lib/db/schema.js";
import { QUIZ_PASS_THRESHOLD_PERCENT } from "../lib/constants.js";

// XP point values for different actions
export const XP_VALUES = {
  chapterVisit: 5,
  exerciseView: 2,
  flashcardComplete: 10,
  quizPass: 25,
  forumAnswerAccepted: 15
} as const;

// Level thresholds
export const LEVEL_THRESHOLDS = [
  { level: 0, name: "Fresher", minXp: 0 },
  { level: 1, name: "Student", minXp: 100 },
  { level: 2, name: "Scholar", minXp: 300 },
  { level: 3, name: "Topper", minXp: 600 },
  { level: 4, name: "Board Topper", minXp: 1000 }
] as const;

export type LevelName = (typeof LEVEL_THRESHOLDS)[number]["name"];

// Streak freeze cooldown in milliseconds (7 days)
const STREAK_FREEZE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export interface XpAwardResult {
  xpAwarded: number;
  newXp: number;
  level: number;
  levelName: LevelName;
  leveledUp: boolean;
  previousLevel: number;
}

export interface StreakFreezeResult {
  canUseStreakFreeze: boolean;
  streakFreezeUsed: boolean;
  nextFreezeAvailableAt: Date | null;
}

export class XpService {
  private async adjustXp(
    userId: string,
    deltaXp: number,
    _reason: string
  ): Promise<XpAwardResult> {
    const userRows = await db
      .select({
        xp: users.xp,
        level: users.level
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const currentUser = userRows[0];

    if (!currentUser) {
      throw new Error("User not found");
    }

    const previousXp = currentUser.xp;
    const previousLevel = currentUser.level;
    const newXp = previousXp + deltaXp;

    if (newXp < 0) {
      throw new Error("Insufficient XP balance");
    }

    const { level: newLevel, name: newLevelName } = this.calculateLevel(newXp);
    const leveledUp = newLevel > previousLevel;

    await db
      .update(users)
      .set({
        xp: sql`${users.xp} + ${deltaXp}`,
        level: newLevel
      })
      .where(eq(users.id, userId));

    return {
      xpAwarded: deltaXp,
      newXp,
      level: newLevel,
      levelName: newLevelName,
      leveledUp,
      previousLevel
    };
  }

  /**
   * Calculate the level based on XP
   */
  calculateLevel(xp: number): { level: number; name: LevelName } {
    let currentLevel = 0;
    let levelName: LevelName = "Fresher";

    for (const threshold of LEVEL_THRESHOLDS) {
      if (xp >= threshold.minXp) {
        currentLevel = threshold.level;
        levelName = threshold.name;
      }
    }

    return { level: currentLevel, name: levelName };
  }

  /**
   * Check if user can use streak freeze (one per week)
   */
  async checkStreakFreeze(userId: string): Promise<StreakFreezeResult> {
    const userRows = await db
      .select({
        streakFreezeUsedAt: users.streakFreezeUsedAt
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = userRows[0];

    if (!user) {
      return {
        canUseStreakFreeze: false,
        streakFreezeUsed: false,
        nextFreezeAvailableAt: null
      };
    }

    // If never used, user can use it
    if (!user.streakFreezeUsedAt) {
      return {
        canUseStreakFreeze: true,
        streakFreezeUsed: false,
        nextFreezeAvailableAt: null
      };
    }

    const now = new Date();
    const timeSinceLastUse = now.getTime() - user.streakFreezeUsedAt.getTime();
    const canUse = timeSinceLastUse >= STREAK_FREEZE_COOLDOWN_MS;

    const nextAvailableAt = canUse
      ? null
      : new Date(user.streakFreezeUsedAt.getTime() + STREAK_FREEZE_COOLDOWN_MS);

    return {
      canUseStreakFreeze: canUse,
      streakFreezeUsed: false,
      nextFreezeAvailableAt: nextAvailableAt
    };
  }

  /**
   * Use streak freeze (mark as used)
   */
  async useStreakFreeze(userId: string): Promise<boolean> {
    const freezeStatus = await this.checkStreakFreeze(userId);

    if (!freezeStatus.canUseStreakFreeze) {
      return false;
    }

    await db
      .update(users)
      .set({
        streakFreezeUsedAt: new Date()
      })
      .where(eq(users.id, userId));

    return true;
  }

  /**
   * Award XP to a user and update their level
   * Uses atomic increment to prevent race conditions
   */
  async awardXp(
    userId: string,
    xpAmount: number,
    reason: string
  ): Promise<XpAwardResult> {
    if (typeof xpAmount !== "number" || xpAmount < 0) {
      throw new Error("XP amount must be a non-negative number");
    }
    return this.adjustXp(userId, xpAmount, reason);
  }

  async spendXp(userId: string, xpAmount: number, reason: string): Promise<XpAwardResult> {
    if (typeof xpAmount !== "number" || xpAmount <= 0) {
      throw new Error("XP amount must be a positive number");
    }

    return this.adjustXp(userId, -xpAmount, reason);
  }

  /**
   * Award XP for chapter visit
   */
  async awardChapterVisitXp(userId: string): Promise<XpAwardResult> {
    return this.awardXp(userId, XP_VALUES.chapterVisit, "chapter_visit");
  }

  /**
   * Award XP for exercise view
   */
  async awardExerciseViewXp(userId: string): Promise<XpAwardResult> {
    return this.awardXp(userId, XP_VALUES.exerciseView, "exercise_view");
  }

  /**
   * Award XP for flashcard completion
   */
  async awardFlashcardCompleteXp(userId: string): Promise<XpAwardResult> {
    return this.awardXp(userId, XP_VALUES.flashcardComplete, "flashcard_complete");
  }

  /**
   * Award XP for quiz pass (only if passed with pass threshold+)
   */
  async awardQuizPassXp(userId: string, score: number, totalMarks: number): Promise<XpAwardResult | null> {
    const percentage = (score / totalMarks) * 100;

    // Only award XP if passed (pass threshold or higher)
    if (percentage < QUIZ_PASS_THRESHOLD_PERCENT) {
      return null;
    }

    return this.awardXp(userId, XP_VALUES.quizPass, "quiz_pass");
  }

  /**
   * Award XP for forum answer accepted
   */
  async awardForumAnswerAcceptedXp(userId: string): Promise<XpAwardResult> {
    return this.awardXp(userId, XP_VALUES.forumAnswerAccepted, "forum_answer_accepted");
  }

  /**
   * Get user XP and level info
   */
  async getUserXpInfo(userId: string) {
    const userRows = await db
      .select({
        xp: users.xp,
        level: users.level,
        streakFreezeUsedAt: users.streakFreezeUsedAt
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = userRows[0];

    if (!user) {
      return null;
    }

    const { name: levelName } = this.calculateLevel(user.xp);

    // Calculate next level threshold
    const nextThreshold = LEVEL_THRESHOLDS.find((t) => t.level === user.level + 1);
    const xpToNextLevel = nextThreshold ? nextThreshold.minXp - user.xp : 0;

    return {
      xp: user.xp,
      level: user.level,
      levelName,
      xpToNextLevel: Math.max(0, xpToNextLevel),
      streakFreezeUsedAt: user.streakFreezeUsedAt?.toISOString() ?? null
    };
  }
}

export const xpService = new XpService();
