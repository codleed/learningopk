import { CacheKeys, cacheService } from "../lib/cache/cache.service.js";
import { logger } from "../lib/logger.js";
import { ensureRedisConnection, redis } from "../lib/redis.js";

import type { AiCircuitState } from "./ai-model-strategy.js";

const AI_CIRCUIT_KEY = "ai:model-strategy:circuit";
const AI_RESPONSE_CACHE_TTL_SECONDS = 3600;

const buildResponseCacheKey = (normalizedPrompt: string): string =>
  CacheKeys.aiResponse(Buffer.from(normalizedPrompt).toString("base64url"));

const emptyCircuitState = (): AiCircuitState => ({
  consecutiveFailures: 0,
  lastFailureAt: null,
  openedAt: null,
});

export const readAiCircuitState = async (): Promise<AiCircuitState> => {
  try {
    await ensureRedisConnection();
    const value = await redis.get(AI_CIRCUIT_KEY);
    if (!value) {
      return emptyCircuitState();
    }

    const parsed = JSON.parse(value) as Partial<AiCircuitState>;
    return {
      consecutiveFailures: parsed.consecutiveFailures ?? 0,
      lastFailureAt: parsed.lastFailureAt ?? null,
      openedAt: parsed.openedAt ?? null,
    };
  } catch (error) {
    logger.error({ error }, "Failed to read AI circuit state");
    return emptyCircuitState();
  }
};

export const writeAiCircuitState = async (state: AiCircuitState): Promise<void> => {
  try {
    await ensureRedisConnection();

    if (state.consecutiveFailures <= 0 && state.openedAt === null) {
      await redis.del(AI_CIRCUIT_KEY);
      return;
    }

    await redis.set(AI_CIRCUIT_KEY, JSON.stringify(state), { EX: 60 });
  } catch (error) {
    logger.error({ error }, "Failed to write AI circuit state");
  }
};

export const getCachedAiResponse = async (normalizedPrompt: string): Promise<string | null> => {
  return cacheService.get<string>(buildResponseCacheKey(normalizedPrompt));
};

export const setCachedAiResponse = async (normalizedPrompt: string, responseText: string): Promise<void> => {
  await cacheService.set(buildResponseCacheKey(normalizedPrompt), responseText, {
    ttlSeconds: AI_RESPONSE_CACHE_TTL_SECONDS,
  });
};
