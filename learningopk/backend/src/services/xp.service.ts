import { eq, sql } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { users } from "../lib/db/schema.js";
import { QUIZ_PASS_THRESHOLD_PERCENT } from "../lib/constants.js";

// XP point values for different actions
export const XP_VALUES = {
  chapterVisit: 10,
  summaryRead: 15,
  exerciseComplete: 5,
  flashcardComplete: 15,
  quizPass: 50,
  quizPerfect: 100,
  forumAnswerAccepted: 25,
  dailyLoginBonus: 10,
  streakBonus3Days: 25,
  streakBonus7Days: 75,
  streakBonus30Days: 200
} as const;

// Level thresholds — more granular, rewarding progression
export const LEVEL_THRESHOLDS = [
  { level: 0, name: "Newcomer", minXp: 0 },
  { level: 1, name: "Learner", minXp: 50 },
  { level: 2, name: "Explorer", minXp: 150 },
  { level: 3, name: "Achiever", minXp: 350 },
  { level: 4, name: "Scholar", minXp: 600 },
  { level: 5, name: "Expert", minXp: 1000 },
  { level: 6, name: "Master", minXp: 1500 },
  { level: 7, name: "Champion", minXp: 2200 },
  { level: 8, name: "Legend", minXp: 3000 },
  { level: 9, name: "Genius", minXp: 4000 },
  { level: 10, name: "Board Topper", minXp: 5500 }
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
    let levelName: LevelName = "Newcomer";

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
   * Award XP for reading the chapter summary
   */
  async awardSummaryReadXp(userId: string): Promise<XpAwardResult> {
    return this.awardXp(userId, XP_VALUES.summaryRead, "summary_read");
  }

  /**
   * Award XP for exercise completion (per exercise)
   */
  async awardExerciseCompleteXp(userId: string): Promise<XpAwardResult> {
    return this.awardXp(userId, XP_VALUES.exerciseComplete, "exercise_complete");
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

    // Award base quiz pass XP
    const baseResult = await this.awardXp(userId, XP_VALUES.quizPass, "quiz_pass");

    // If perfect score, award the bonus on top
    if (percentage >= 100) {
      return this.awardXp(userId, XP_VALUES.quizPerfect, "quiz_perfect");
    }

    return baseResult;
  }

  /**
   * Award XP for a perfect quiz score (100%)
   */
  async awardQuizPerfectXp(userId: string): Promise<XpAwardResult> {
    return this.awardXp(userId, XP_VALUES.quizPerfect, "quiz_perfect");
  }

  /**
   * Award XP for forum answer accepted
   */
  async awardForumAnswerAcceptedXp(userId: string): Promise<XpAwardResult> {
    return this.awardXp(userId, XP_VALUES.forumAnswerAccepted, "forum_answer_accepted");
  }

  /**
   * Award daily login bonus XP
   */
  async awardDailyLoginBonusXp(userId: string): Promise<XpAwardResult> {
    return this.awardXp(userId, XP_VALUES.dailyLoginBonus, "daily_login_bonus");
  }

  /**
   * Award streak milestone bonus XP (3, 7, or 30 day streaks)
   */
  async awardStreakBonusXp(userId: string, streakDays: number): Promise<XpAwardResult | null> {
    if (streakDays === 3) {
      return this.awardXp(userId, XP_VALUES.streakBonus3Days, "streak_bonus_3_days");
    }
    if (streakDays === 7) {
      return this.awardXp(userId, XP_VALUES.streakBonus7Days, "streak_bonus_7_days");
    }
    if (streakDays === 30) {
      return this.awardXp(userId, XP_VALUES.streakBonus30Days, "streak_bonus_30_days");
    }
    return null;
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

    const { level: computedLevel, name: levelName } = this.calculateLevel(user.xp);

    // Calculate next level threshold
    const nextThreshold = LEVEL_THRESHOLDS.find((t) => t.level === computedLevel + 1);
    const currentThreshold = LEVEL_THRESHOLDS.find((t) => t.level === computedLevel);
    const xpToNextLevel = nextThreshold ? nextThreshold.minXp - user.xp : 0;
    const currentLevelMinXp = currentThreshold?.minXp ?? 0;
    const nextLevelMinXp = nextThreshold?.minXp ?? currentLevelMinXp;
    const xpInCurrentLevel = user.xp - currentLevelMinXp;
    const xpRequiredForLevel = nextLevelMinXp - currentLevelMinXp;

    return {
      xp: user.xp,
      level: computedLevel,
      levelName,
      xpToNextLevel: Math.max(0, xpToNextLevel),
      xpInCurrentLevel: Math.max(0, xpInCurrentLevel),
      xpRequiredForLevel: Math.max(1, xpRequiredForLevel),
      isMaxLevel: !nextThreshold,
      streakFreezeUsedAt: user.streakFreezeUsedAt?.toISOString() ?? null
    };
  }
}

export const xpService = new XpService();
