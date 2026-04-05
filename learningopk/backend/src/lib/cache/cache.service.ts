import { ensureRedisConnection, redis } from "../redis.js";
import { logger } from "../logger.js";
import { startSpan, endSpan } from "../performance.js";

export type CacheKey = string;

export interface CacheOptions {
  ttlSeconds?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  backgroundRefreshes: number;
  hitRate: number;
  uptimeMs: number;
}

interface CacheEnvelope<T> {
  data: T;
  cachedAt: number;
  ttl: number;
}

const DEFAULT_TTL: Record<string, number> = {
  subjectList: 3600,
  chapterContent: 1800,
  forumThreads: 300,
  quizQuestions: 0,
  progress: 0,
  aiResponses: 0
};

/** Ratio of remaining TTL below which a background refresh is triggered. */
const STALE_THRESHOLD = 0.2;

export class CacheService {
  private _hits = 0;
  private _misses = 0;
  private _sets = 0;
  private _deletes = 0;
  private _backgroundRefreshes = 0;
  private readonly _startedAt = Date.now();

  /** Keys currently being refreshed in the background (prevents duplicate refreshes). */
  private readonly _refreshing = new Set<string>();

  private async getClient() {
    await ensureRedisConnection();
    return redis;
  }

  // ---------------------------------------------------------------------------
  // Core operations
  // ---------------------------------------------------------------------------

  async get<T>(key: CacheKey): Promise<T | null> {
    const span = startSpan(`cache.get:${key}`, "cache.get", { key });
    try {
      const client = await this.getClient();
      const value = await client.get(key);
      if (!value) {
        this._misses++;
        return null;
      }

      // Try to unwrap envelope; fall back to raw value for legacy entries
      try {
        const parsed: unknown = JSON.parse(value);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "data" in parsed &&
          "cachedAt" in parsed &&
          "ttl" in parsed
        ) {
          this._hits++;
          return (parsed as CacheEnvelope<T>).data;
        }
      } catch {
        // not JSON – treat as miss
        this._misses++;
        return null;
      }

      // Legacy value (plain JSON, no envelope)
      this._hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error({ error, key }, "Cache get error");
      return null;
    } finally {
      endSpan(span);
    }
  }

  async set<T>(key: CacheKey, value: T, options: CacheOptions = {}): Promise<boolean> {
    const span = startSpan(`cache.set:${key}`, "cache.set", { key });
    try {
      const client = await this.getClient();
      const ttl = options.ttlSeconds ?? DEFAULT_TTL[key] ?? 300;
      if (ttl <= 0) return false;

      const envelope: CacheEnvelope<T> = {
        data: value,
        cachedAt: Date.now(),
        ttl,
      };

      await client.set(key, JSON.stringify(envelope), { EX: ttl });
      this._sets++;
      return true;
    } catch (error) {
      logger.error({ error, key }, "Cache set error");
      return false;
    } finally {
      endSpan(span);
    }
  }

  async delete(key: CacheKey): Promise<boolean> {
    try {
      const client = await this.getClient();
      await client.del(key);
      this._deletes++;
      return true;
    } catch (error) {
      logger.error({ error, key }, "Cache delete error");
      return false;
    }
  }

  /**
   * Invalidate all keys matching `pattern`.
   * Uses SCAN instead of KEYS to avoid blocking Redis on large key-spaces.
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const client = await this.getClient();
      let deleted = 0;
      let cursor: string = "0";

      do {
        const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = result.cursor;
        const keys = result.keys;
        if (keys.length > 0) {
          deleted += await client.del(keys);
        }
      } while (cursor !== "0");

      this._deletes += deleted;
      return deleted;
    } catch (error) {
      logger.error({ error, pattern }, "Cache invalidate pattern error");
      return 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Cache-through with stale-while-revalidate
  // ---------------------------------------------------------------------------

  async getOrSet<T>(
    key: CacheKey,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    try {
      const client = await this.getClient();
      const raw = await client.get(key);

      if (raw) {
        try {
          const parsed: unknown = JSON.parse(raw);

          if (
            typeof parsed === "object" &&
            parsed !== null &&
            "data" in parsed &&
            "cachedAt" in parsed &&
            "ttl" in parsed
          ) {
            const envelope = parsed as CacheEnvelope<T>;
            this._hits++;

            // Stale-while-revalidate: if remaining TTL < 20% of original, refresh in background
            const elapsed = (Date.now() - envelope.cachedAt) / 1000;
            const remaining = envelope.ttl - elapsed;

            if (remaining > 0 && remaining < envelope.ttl * STALE_THRESHOLD) {
              this._triggerBackgroundRefresh(key, factory, options);
            }

            return envelope.data;
          }
        } catch {
          // corrupt entry – fall through to factory
        }

        // Legacy value without envelope – treat as hit, no background refresh possible
        try {
          this._hits++;
          return JSON.parse(raw) as T;
        } catch {
          // corrupt JSON – fall through
        }
      }
    } catch (error) {
      logger.error({ error, key }, "Cache getOrSet read error");
      // fall through to factory
    }

    // Cache miss – invoke factory
    this._misses++;
    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  // ---------------------------------------------------------------------------
  // Background refresh (fire-and-forget)
  // ---------------------------------------------------------------------------

  private _triggerBackgroundRefresh<T>(
    key: CacheKey,
    factory: () => Promise<T>,
    options: CacheOptions
  ): void {
    if (this._refreshing.has(key)) return;

    this._refreshing.add(key);
    this._backgroundRefreshes++;

    factory()
      .then(async (value) => {
        await this.set(key, value, options);
      })
      .catch((error: unknown) => {
        logger.error({ error, key }, "Cache background refresh error");
      })
      .finally(() => {
        this._refreshing.delete(key);
      });
  }

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  getStats(): CacheStats {
    const total = this._hits + this._misses;
    return {
      hits: this._hits,
      misses: this._misses,
      sets: this._sets,
      deletes: this._deletes,
      backgroundRefreshes: this._backgroundRefreshes,
      hitRate: total > 0 ? this._hits / total : 0,
      uptimeMs: Date.now() - this._startedAt,
    };
  }

  /** Reset all in-memory counters (useful for tests). */
  resetStats(): void {
    this._hits = 0;
    this._misses = 0;
    this._sets = 0;
    this._deletes = 0;
    this._backgroundRefreshes = 0;
  }

  // ---------------------------------------------------------------------------
  // Purge all cache entries
  // ---------------------------------------------------------------------------

  async purgeAll(): Promise<number> {
    return this.invalidatePattern("*");
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  buildKey(namespace: string, ...parts: string[]): string {
    return `${namespace}:${parts.join(":")}`;
  }
}

export const cacheService = new CacheService();

export const CacheKeys = {
  subjectList: () => "subjects:list",
  subjectDetail: (subjectId: number) => `subjects:detail:${subjectId}`,
  chapterContent: (chapterId: number) => `chapters:content:${chapterId}`,
  chapterList: (subjectId: number) => `chapters:list:${subjectId}`,
  forumThreads: (filters: Record<string, unknown>) => `forum:threads:${JSON.stringify(filters)}`,
  forumThreadDetail: (threadId: string) => `forum:thread:${threadId}`,
  quizQuestions: (quizId: number) => `quiz:questions:${quizId}`,
  userProgress: (userId: string) => `user:progress:${userId}`,
  userDashboard: (userId: string) => `user:dashboard:${userId}`
};
