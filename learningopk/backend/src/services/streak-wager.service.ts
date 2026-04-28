import { and, desc, eq, gte, isNotNull, isNull, lt } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { quizAttempts, streakWagers, userProgress } from "../lib/db/schema.js";
import { calculateStreakDays } from "../lib/progress-metrics.js";
import {
  buildDailyGoalProgress,
  calculateStreakWagerBonus,
  getCurrentPktContext,
  getPktDateKey,
  getPktDayBounds,
  shouldShowStreakAtRiskWarning,
  STREAK_WAGER_MAX_XP,
  STREAK_WAGER_MIN_XP
} from "../lib/streak-wager.js";
import { progressRepository } from "../repositories/progress.repository.js";
import { xpService } from "./xp.service.js";

export type StreakWagerDashboardState = {
  timezone: "Asia/Karachi";
  minWagerXp: number;
  maxWagerXp: number;
  currentPktDate: string;
  currentPktTime: string;
  canPlaceWager: boolean;
  showLockModal: boolean;
  warningAtRisk: boolean;
  activeWager: {
    id: string;
    amount: number;
    bonusXp: number;
    protectedDate: string;
    placedAt: string;
    expiresAt: string;
  } | null;
  brokenWager: {
    id: string;
    amount: number;
    protectedDate: string;
    lostAt: string;
    canRecoverWithFreeze: boolean;
  } | null;
};

export class StreakWagerService {
  async settleOutstandingWagers(userId: string, now: Date = new Date()): Promise<void> {
    const activeRows = await db
      .select({
        id: streakWagers.id,
        amount: streakWagers.amount,
        protectedDate: streakWagers.protectedDate,
        expiresAt: streakWagers.expiresAt
      })
      .from(streakWagers)
      .where(and(eq(streakWagers.userId, userId), eq(streakWagers.status, "active")))
      .orderBy(desc(streakWagers.placedAt));

    for (const wager of activeRows) {
      const goalProgress = await this.getGoalProgressForDate(userId, wager.protectedDate);

      if (goalProgress.completed) {
        await db
          .update(streakWagers)
          .set({
            status: "won",
            completedGoal: true,
            settledAt: now
          })
          .where(eq(streakWagers.id, wager.id));

        await xpService.awardXp(userId, wager.amount + calculateStreakWagerBonus(wager.amount), "streak_wager_win");
        continue;
      }

      if (now >= wager.expiresAt) {
        await db
          .update(streakWagers)
          .set({
            status: "lost",
            completedGoal: false,
            settledAt: now
          })
          .where(eq(streakWagers.id, wager.id));
      }
    }
  }

  async getGoalProgressForDate(userId: string, dateKey: string) {
    const { startUtc, endUtc } = getPktDayBounds(dateKey);

    const chapterRows = await db
      .select({ chapterId: userProgress.chapterId })
      .from(userProgress)
      .where(and(eq(userProgress.userId, userId), gte(userProgress.visitedAt, startUtc), lt(userProgress.visitedAt, endUtc)));

    const quizRows = await db
      .select({ id: quizAttempts.id })
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), gte(quizAttempts.completedAt, startUtc), lt(quizAttempts.completedAt, endUtc)));

    return buildDailyGoalProgress({
      dateKey,
      chaptersCompleted: chapterRows.length,
      quizzesCompleted: quizRows.length
    });
  }

  async getRecoveredProtectedDateKeys(userId: string): Promise<string[]> {
    const rows = await db
      .select({ protectedDate: streakWagers.protectedDate })
      .from(streakWagers)
      .where(and(eq(streakWagers.userId, userId), isNotNull(streakWagers.recoveredAt)));

    return rows.map((row) => row.protectedDate);
  }

  async getLostProtectedDateKeys(userId: string): Promise<string[]> {
    const rows = await db
      .select({ protectedDate: streakWagers.protectedDate })
      .from(streakWagers)
      .where(and(eq(streakWagers.userId, userId), eq(streakWagers.status, "lost"), isNull(streakWagers.recoveredAt)));

    return rows.map((row) => row.protectedDate);
  }

  async computeEffectiveStreakDays(userId: string): Promise<number> {
    const activityLogRows = await progressRepository.findActivityLogByUserId(userId);
    const recoveredProtectedDateKeys = await this.getRecoveredProtectedDateKeys(userId);
    const lostProtectedDateKeys = new Set(await this.getLostProtectedDateKeys(userId));
    const currentPktDate = getCurrentPktContext().todayKey;
    const activityDateKeys = new Set(
      activityLogRows.map((row) => getPktDateKey(row.occurredAt))
    );
    const activityDates = [
      ...[...activityDateKeys]
        .filter((value) => !lostProtectedDateKeys.has(value))
        .map((value) => new Date(`${value}T00:00:00.000Z`)),
      ...recoveredProtectedDateKeys.map((dateKey) => new Date(`${dateKey}T00:00:00.000Z`))
    ];

    return calculateStreakDays(activityDates, new Date(`${currentPktDate}T00:00:00.000Z`));
  }

  async placeWager(userId: string, amount: number, now: Date = new Date()): Promise<void> {
    if (!Number.isInteger(amount) || amount < STREAK_WAGER_MIN_XP || amount > STREAK_WAGER_MAX_XP) {
      throw new Error(`Wager must be between ${STREAK_WAGER_MIN_XP} and ${STREAK_WAGER_MAX_XP} XP`);
    }

    await this.settleOutstandingWagers(userId, now);

    const streakDays = await this.computeEffectiveStreakDays(userId);
    if (streakDays < 3) {
      throw new Error("A streak of at least 3 days is required to place a wager");
    }

    const pkt = getCurrentPktContext(now);
    const existingForToday = await db
      .select({ id: streakWagers.id })
      .from(streakWagers)
      .where(and(eq(streakWagers.userId, userId), eq(streakWagers.protectedDate, pkt.todayKey)))
      .limit(1);

    if (existingForToday[0]) {
      throw new Error("You already placed a streak wager for today");
    }

    await xpService.spendXp(userId, amount, "streak_wager_lock");

    await db.insert(streakWagers).values({
      userId,
      amount,
      bonusXp: calculateStreakWagerBonus(amount),
      protectedDate: pkt.todayKey,
      expiresAt: pkt.nextDayStartUtc,
      status: "active"
    });
  }

  async recoverBrokenWager(userId: string, now: Date = new Date()): Promise<void> {
    await this.settleOutstandingWagers(userId, now);

    const brokenRows = await db
      .select({
        id: streakWagers.id,
        protectedDate: streakWagers.protectedDate
      })
      .from(streakWagers)
      .where(and(eq(streakWagers.userId, userId), eq(streakWagers.status, "lost"), isNull(streakWagers.recoveredAt)))
      .orderBy(desc(streakWagers.settledAt), desc(streakWagers.placedAt))
      .limit(1);

    const broken = brokenRows[0];
    if (!broken) {
      throw new Error("No broken streak wager is available to recover");
    }

    const freezeUsed = await xpService.useStreakFreeze(userId);
    if (!freezeUsed) {
      throw new Error("Your streak freeze is not available right now");
    }

    await db
      .update(streakWagers)
      .set({
        recoveredAt: now
      })
      .where(eq(streakWagers.id, broken.id));
  }

  async buildDashboardState(userId: string, streakDays: number, now: Date = new Date()): Promise<StreakWagerDashboardState> {
    await this.settleOutstandingWagers(userId, now);

    const pkt = getCurrentPktContext(now);
    const freezeStatus = await xpService.checkStreakFreeze(userId);

    const todayRows = await db
      .select({
        id: streakWagers.id,
        amount: streakWagers.amount,
        bonusXp: streakWagers.bonusXp,
        protectedDate: streakWagers.protectedDate,
        placedAt: streakWagers.placedAt,
        expiresAt: streakWagers.expiresAt,
        status: streakWagers.status
      })
      .from(streakWagers)
      .where(and(eq(streakWagers.userId, userId), eq(streakWagers.protectedDate, pkt.todayKey)))
      .limit(1);

    const brokenRows = await db
      .select({
        id: streakWagers.id,
        amount: streakWagers.amount,
        protectedDate: streakWagers.protectedDate,
        settledAt: streakWagers.settledAt
      })
      .from(streakWagers)
      .where(and(eq(streakWagers.userId, userId), eq(streakWagers.status, "lost"), isNull(streakWagers.recoveredAt)))
      .orderBy(desc(streakWagers.settledAt), desc(streakWagers.placedAt))
      .limit(1);

    const todayWager = todayRows[0];
    const hasWagerForToday = Boolean(todayWager);

    return {
      timezone: "Asia/Karachi",
      minWagerXp: STREAK_WAGER_MIN_XP,
      maxWagerXp: STREAK_WAGER_MAX_XP,
      currentPktDate: pkt.todayKey,
      currentPktTime: now.toISOString(),
      canPlaceWager: streakDays >= 3 && !hasWagerForToday,
      showLockModal: streakDays >= 3 && !hasWagerForToday,
      warningAtRisk: shouldShowStreakAtRiskWarning({
        streakDays,
        hasWagerForToday,
        pktHour: pkt.pktHour
      }),
      activeWager:
        todayWager && todayWager.status === "active"
          ? {
              id: todayWager.id,
              amount: todayWager.amount,
              bonusXp: todayWager.bonusXp,
              protectedDate: todayWager.protectedDate,
              placedAt: todayWager.placedAt.toISOString(),
              expiresAt: todayWager.expiresAt.toISOString()
            }
          : null,
      brokenWager: brokenRows[0]
        ? {
            id: brokenRows[0].id,
            amount: brokenRows[0].amount,
            protectedDate: brokenRows[0].protectedDate,
            lostAt: brokenRows[0].settledAt?.toISOString() ?? now.toISOString(),
            canRecoverWithFreeze: freezeStatus.canUseStreakFreeze
          }
        : null
    };
  }
}

export const streakWagerService = new StreakWagerService();
