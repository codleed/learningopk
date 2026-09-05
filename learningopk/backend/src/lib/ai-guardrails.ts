import { ensureRedisConnection, redis } from "./redis.js";

export const AI_CHAT_RATE_LIMIT_MAX_REQUESTS = 20;
export const AI_CHAT_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
export const FORUM_MUTATION_RATE_LIMIT_MAX_REQUESTS = 60;
export const FORUM_MUTATION_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
};

type ModerationResult = {
  blocked: boolean;
  reason: "profanity" | "harassment" | "self_harm" | "spam" | null;
};

const profanityPattern = /\b(fuck|fucking|shit|bitch|bastard|asshole|motherfucker)\b/i;
const harassmentPattern = /\b(stupid|idiot|moron|loser|shut up|hate you)\b/i;
const selfHarmPattern = /\b(suicide|kill myself|self harm|hurt myself|want to die)\b/i;
const repeatedWordPattern = /\b(\w+)(\s+\1){7,}\b/i;
const repeatedCharacterPattern = /(.)\1{10,}/i;

const detectSpam = (value: string): boolean => {
  const sanitized = value.trim();
  if (sanitized.length === 0) {
    return false;
  }

  if (repeatedWordPattern.test(sanitized) || repeatedCharacterPattern.test(sanitized)) {
    return true;
  }

  const urls = sanitized.match(/https?:\/\/\S+/gi);
  if ((urls?.length ?? 0) >= 3) {
    return true;
  }

  const tokens = sanitized
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length < 12) {
    return false;
  }

  const uniqueTokenCount = new Set(tokens).size;
  return uniqueTokenCount <= Math.max(3, Math.floor(tokens.length / 5));
};

export const moderateTextInput = (text: string): ModerationResult => {
  if (profanityPattern.test(text)) {
    return {
      blocked: true,
      reason: "profanity",
    };
  }

  if (harassmentPattern.test(text)) {
    return {
      blocked: true,
      reason: "harassment",
    };
  }

  if (selfHarmPattern.test(text)) {
    return {
      blocked: true,
      reason: "self_harm",
    };
  }

  if (detectSpam(text)) {
    return {
      blocked: true,
      reason: "spam",
    };
  }

  return {
    blocked: false,
    reason: null,
  };
};

export const moderateAiInput = (text: string): ModerationResult => {
  return moderateTextInput(text);
};

export const moderateForumInput = (text: string): ModerationResult => {
  return moderateTextInput(text);
};

const consumeRateLimit = async (
  keyPrefix: string,
  userId: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> => {
  await ensureRedisConnection();

  const windowBucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `${keyPrefix}:${userId}:${windowBucket}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  let ttl = await redis.ttl(key);
  if (ttl < 0) {
    await redis.expire(key, windowSeconds);
    ttl = windowSeconds;
  }

  const remaining = Math.max(0, maxRequests - count);

  return {
    allowed: count <= maxRequests,
    limit: maxRequests,
    remaining,
    resetSeconds: ttl,
  };
};

export const consumeAiChatRateLimit = async (userId: string): Promise<RateLimitResult> => {
  return consumeRateLimit(
    "ratelimit:ai-chat",
    userId,
    AI_CHAT_RATE_LIMIT_MAX_REQUESTS,
    AI_CHAT_RATE_LIMIT_WINDOW_SECONDS
  );
};

export const consumeForumMutationRateLimit = async (userId: string): Promise<RateLimitResult> => {
  return consumeRateLimit(
    "ratelimit:forum",
    userId,
    FORUM_MUTATION_RATE_LIMIT_MAX_REQUESTS,
    FORUM_MUTATION_RATE_LIMIT_WINDOW_SECONDS
  );
};
