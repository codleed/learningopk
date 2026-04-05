import { calculateStreakDays, createUtcDay, toDateKey } from "../lib/progress-metrics.js";
import { CacheKeys, cacheService } from "../lib/cache/cache.service.js";
import { leaderboardRepository, type LeaderboardCandidateRow, type LeaderboardScope, type LeaderboardViewer } from "../repositories/leaderboard.repository.js";

export type LeaderboardMetric = "xp" | "streak" | "quizzes";
export type LeaderboardBadge = "gold" | "silver" | "bronze";

type LeaderboardEntry = {
  rank: number;
  userId: string;
  avatarUrl: string | null;
  name: string;
  xp: number;
  level: number;
  streak: number;
  quizzes: number;
  weeklyChange: number;
  badge: LeaderboardBadge | null;
  isCurrentUser: boolean;
};

type BadgeCacheEntry = {
  userId: string;
  badge: LeaderboardBadge;
};

export type LeaderboardResponse = {
  scope: LeaderboardScope;
  metric: LeaderboardMetric;
  generatedAt: string;
  refreshIntervalSeconds: number;
  entries: LeaderboardEntry[];
  currentUser: {
    rank: number;
    totalStudents: number;
    leaderboardPublic: boolean;
    badge: LeaderboardBadge | null;
  };
};

export type LeaderboardSettings = {
  leaderboardPublic: boolean;
  badge: LeaderboardBadge | null;
};

type RankedCandidate = LeaderboardCandidateRow & {
  quizzes: number;
  streak: number;
  weeklyChange: number;
  rank: number;
};

const REFRESH_INTERVAL_SECONDS = 300;

export class LeaderboardService {
  async getLeaderboard(userId: string, scope: LeaderboardScope, metric: LeaderboardMetric): Promise<LeaderboardResponse> {
    const viewer = await leaderboardRepository.findViewer(userId);
    if (!viewer) {
      throw new Error("User not found");
    }

    return cacheService.getOrSet(
      CacheKeys.leaderboard(userId, scope, metric),
      async () => this.buildLeaderboard(viewer, scope, metric),
      { ttlSeconds: REFRESH_INTERVAL_SECONDS }
    );
  }

  async getSettings(userId: string): Promise<LeaderboardSettings> {
    const viewer = await leaderboardRepository.findViewer(userId);
    if (!viewer) {
      throw new Error("User not found");
    }

    const badgeMap = await this.getBadgeMap();
    return {
      leaderboardPublic: viewer.leaderboardPublic,
      badge: badgeMap.get(userId) ?? null
    };
  }

  async updateSettings(userId: string, isPublic: boolean): Promise<LeaderboardSettings> {
    const leaderboardPublic = await leaderboardRepository.setLeaderboardPublic(userId, isPublic);
    await cacheService.invalidatePattern("leaderboard:*");

    const badgeMap = await this.getBadgeMap();
    return {
      leaderboardPublic,
      badge: badgeMap.get(userId) ?? null
    };
  }

  private async buildLeaderboard(viewer: LeaderboardViewer, scope: LeaderboardScope, metric: LeaderboardMetric): Promise<LeaderboardResponse> {
    const [candidateRows, activityRows, quizRows, weeklyRows, badgeMap] = await Promise.all([
      leaderboardRepository.listCandidates(scope, viewer),
      leaderboardRepository.listActivityDates(scope, viewer),
      leaderboardRepository.listQuizCounts(scope, viewer),
      leaderboardRepository.listWeeklyActivityCounts(scope, viewer),
      this.getBadgeMap()
    ]);

    const activityMap = new Map<string, Date[]>();
    for (const row of activityRows) {
      if (!row.activityAt) continue;
      const list = activityMap.get(row.userId) ?? [];
      list.push(row.activityAt);
      activityMap.set(row.userId, list);
    }

    const quizMap = new Map(quizRows.map((row) => [row.userId, row.count]));
    const weeklyMap = new Map(
      weeklyRows.map((row) => [row.userId, { currentWeekActivity: row.currentWeekActivity, previousWeekActivity: row.previousWeekActivity }])
    );

    const ranked = candidateRows
      .map((row) => this.toRankedCandidate(row, activityMap, quizMap, weeklyMap))
      .sort((a, b) => this.compareByMetric(a, b, metric))
      .map((row, index) => ({ ...row, rank: index + 1 }));

    const currentUser = ranked.find((row) => row.id === viewer.id);
    if (!currentUser) {
      throw new Error("Current user is missing from leaderboard cohort");
    }

    return {
      scope,
      metric,
      generatedAt: new Date().toISOString(),
      refreshIntervalSeconds: REFRESH_INTERVAL_SECONDS,
      entries: ranked
        .filter((row) => row.leaderboardPublic || row.id === viewer.id)
        .slice(0, 100)
        .map((row) => ({
          rank: row.rank,
          userId: row.id,
          avatarUrl: row.image,
          name: row.name,
          xp: row.xp,
          level: row.level,
          streak: row.streak,
          quizzes: row.quizzes,
          weeklyChange: row.weeklyChange,
          badge: badgeMap.get(row.id) ?? null,
          isCurrentUser: row.id === viewer.id
        })),
      currentUser: {
        rank: currentUser.rank,
        totalStudents: ranked.length,
        leaderboardPublic: viewer.leaderboardPublic,
        badge: badgeMap.get(viewer.id) ?? null
      }
    };
  }

  private toRankedCandidate(
    row: LeaderboardCandidateRow,
    activityMap: Map<string, Date[]>,
    quizMap: Map<string, number>,
    weeklyMap: Map<string, { currentWeekActivity: number; previousWeekActivity: number }>
  ): RankedCandidate {
    const dates = activityMap.get(row.id) ?? [];
    const uniqueDates = Array.from(new Set(dates.map((date) => toDateKey(date)))).map((dateKey) => new Date(`${dateKey}T00:00:00.000Z`));
    const now = new Date();
    const todayUtc = createUtcDay(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const weeklyCounts = weeklyMap.get(row.id) ?? { currentWeekActivity: 0, previousWeekActivity: 0 };

    return {
      ...row,
      quizzes: quizMap.get(row.id) ?? 0,
      streak: calculateStreakDays(uniqueDates, todayUtc),
      weeklyChange: weeklyCounts.currentWeekActivity - weeklyCounts.previousWeekActivity,
      rank: 0
    };
  }

  private compareByMetric(a: RankedCandidate, b: RankedCandidate, metric: LeaderboardMetric): number {
    if (metric === "streak") {
      return b.streak - a.streak || b.xp - a.xp || b.quizzes - a.quizzes || a.name.localeCompare(b.name);
    }

    if (metric === "quizzes") {
      return b.quizzes - a.quizzes || b.xp - a.xp || b.streak - a.streak || a.name.localeCompare(b.name);
    }

    return b.xp - a.xp || b.streak - a.streak || b.quizzes - a.quizzes || a.name.localeCompare(b.name);
  }

  private async getBadgeMap(): Promise<Map<string, LeaderboardBadge>> {
    const cachedEntries = await cacheService.get<BadgeCacheEntry[]>(CacheKeys.leaderboardBadges());
    if (cachedEntries) {
      return new Map(cachedEntries.map((entry) => [entry.userId, entry.badge]));
    }

    const entries = await cacheService.getOrSet(
      CacheKeys.leaderboardBadges(),
      async () => {
        const rows = await leaderboardRepository.listGlobalXpRows();
        return rows
          .sort((a, b) => b.xp - a.xp || a.id.localeCompare(b.id))
          .slice(0, 100)
          .map((row, index) => ({ userId: row.id, badge: this.badgeForRank(index + 1) }));
      },
      { ttlSeconds: REFRESH_INTERVAL_SECONDS }
    );

    return new Map(entries.map((entry) => [entry.userId, entry.badge]));
  }

  private badgeForRank(rank: number): LeaderboardBadge {
    if (rank <= 10) return "gold";
    if (rank <= 50) return "silver";
    return "bronze";
  }
}

export const leaderboardService = new LeaderboardService();
