import { ensureRedisConnection, redis } from "../redis.js";

export type CacheKey = string;

export interface CacheOptions {
  ttlSeconds?: number;
}

const DEFAULT_TTL: Record<string, number> = {
  subjectList: 3600,
  chapterContent: 1800,
  forumThreads: 300,
  quizQuestions: 0,
  progress: 0,
  aiResponses: 0
};

export class CacheService {
  private async getClient() {
    await ensureRedisConnection();
    return redis;
  }

  async get<T>(key: CacheKey): Promise<T | null> {
    try {
      const client = await this.getClient();
      const value = await client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: CacheKey, value: T, options: CacheOptions = {}): Promise<boolean> {
    try {
      const client = await this.getClient();
      const ttl = options.ttlSeconds ?? DEFAULT_TTL[key] ?? 300;
      if (ttl <= 0) return false;
      await client.set(key, JSON.stringify(value), { EX: ttl });
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: CacheKey): Promise<boolean> {
    try {
      const client = await this.getClient();
      await client.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const client = await this.getClient();
      const keys = await client.keys(pattern);
      if (keys.length === 0) return 0;
      return await client.del(keys);
    } catch (error) {
      console.error(`Cache invalidate pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  async getOrSet<T>(
    key: CacheKey,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

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