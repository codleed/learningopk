import { and, eq, sql } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { quizAttempts, users, userProgress } from "../lib/db/schema.js";

export type LeaderboardScope = "global" | "board" | "school";

export type LeaderboardViewer = {
  id: string;
  name: string;
  board: string | null;
  className: string | null;
  schoolId: number | null;
  leaderboardPublic: boolean;
};

export type LeaderboardCandidateRow = {
  id: string;
  name: string;
  image: string | null;
  xp: number;
  level: number;
  leaderboardPublic: boolean;
};

export class LeaderboardRepository {
  async findViewer(userId: string): Promise<LeaderboardViewer | null> {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        board: users.board,
        className: users.class,
        schoolId: users.schoolId,
        leaderboardPublic: users.leaderboardPublic,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return rows[0] ?? null;
  }

  async setLeaderboardPublic(userId: string, isPublic: boolean): Promise<boolean> {
    const rows = await db
      .update(users)
      .set({
        leaderboardPublic: isPublic,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({ leaderboardPublic: users.leaderboardPublic });

    return rows[0]?.leaderboardPublic ?? isPublic;
  }

  async listCandidates(
    scope: LeaderboardScope,
    viewer: Pick<LeaderboardViewer, "board" | "className" | "schoolId">
  ): Promise<LeaderboardCandidateRow[]> {
    const predicates = [
      eq(users.role, "student"),
      eq(users.status, "active"),
      ...this.buildScopePredicates(scope, viewer),
    ];

    return db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        xp: users.xp,
        level: users.level,
        leaderboardPublic: users.leaderboardPublic,
      })
      .from(users)
      .where(and(...predicates));
  }

  async listQuizCounts(
    scope: LeaderboardScope,
    viewer: Pick<LeaderboardViewer, "board" | "className" | "schoolId">
  ) {
    const predicates = [
      eq(users.role, "student"),
      eq(users.status, "active"),
      ...this.buildScopePredicates(scope, viewer),
    ];

    return db
      .select({
        userId: quizAttempts.userId,
        count: sql<number>`count(*)::int`,
      })
      .from(quizAttempts)
      .innerJoin(users, eq(quizAttempts.userId, users.id))
      .where(and(...predicates))
      .groupBy(quizAttempts.userId);
  }

  async listWeeklyActivityCounts(
    scope: LeaderboardScope,
    viewer: Pick<LeaderboardViewer, "board" | "className" | "schoolId">
  ) {
    const predicates = [
      eq(users.role, "student"),
      eq(users.status, "active"),
      sql`${userProgress.visitedAt} is not null`,
      ...this.buildScopePredicates(scope, viewer),
    ];
    const currentWeekStart = this.startOfUtcDayDaysAgo(7);
    const previousWeekStart = this.startOfUtcDayDaysAgo(14);

    return db
      .select({
        userId: userProgress.userId,
        currentWeekActivity: sql<number>`count(*) filter (where ${userProgress.visitedAt} >= ${currentWeekStart})::int`,
        previousWeekActivity: sql<number>`count(*) filter (where ${userProgress.visitedAt} >= ${previousWeekStart} and ${userProgress.visitedAt} < ${currentWeekStart})::int`,
      })
      .from(userProgress)
      .innerJoin(users, eq(userProgress.userId, users.id))
      .where(and(...predicates))
      .groupBy(userProgress.userId);
  }

  async listActivityDates(
    scope: LeaderboardScope,
    viewer: Pick<LeaderboardViewer, "board" | "className" | "schoolId">
  ) {
    const predicates = [
      eq(users.role, "student"),
      eq(users.status, "active"),
      sql`${userProgress.visitedAt} is not null`,
      ...this.buildScopePredicates(scope, viewer),
    ];

    return db
      .select({
        userId: userProgress.userId,
        activityAt: userProgress.visitedAt,
      })
      .from(userProgress)
      .innerJoin(users, eq(userProgress.userId, users.id))
      .where(and(...predicates));
  }

  async listGlobalXpRows() {
    return db
      .select({
        id: users.id,
        xp: users.xp,
      })
      .from(users)
      .where(and(eq(users.role, "student"), eq(users.status, "active")));
  }

  private buildScopePredicates(
    scope: LeaderboardScope,
    viewer: Pick<LeaderboardViewer, "board" | "className" | "schoolId">
  ) {
    if (scope === "board") {
      return viewer.board ? [eq(users.board, viewer.board)] : [];
    }

    if (scope === "school") {
      if (viewer.schoolId) {
        return [eq(users.schoolId, viewer.schoolId)];
      }
      // Fallback for users not in a school yet
      if (viewer.board && viewer.className) {
        return [eq(users.board, viewer.board), eq(users.class, viewer.className)];
      }
      if (viewer.board) {
        return [eq(users.board, viewer.board)];
      }
    }

    return [];
  }

  private startOfUtcDayDaysAgo(daysAgo: number): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo, 0, 0, 0, 0)
    );
  }
}

export const leaderboardRepository = new LeaderboardRepository();
