import assert from "node:assert/strict";
import test from "node:test";

import { CacheService, CacheKeys, cacheService } from "../../../lib/cache/cache.service.js";

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

test("cacheService is an instance of CacheService", () => {
  assert.ok(cacheService instanceof CacheService);
});

// ---------------------------------------------------------------------------
// Stats initialisation & reset
// ---------------------------------------------------------------------------

test("getStats returns zeroed counters after resetStats", () => {
  cacheService.resetStats();
  const stats = cacheService.getStats();
  assert.equal(stats.hits, 0);
  assert.equal(stats.misses, 0);
  assert.equal(stats.sets, 0);
  assert.equal(stats.deletes, 0);
  assert.equal(stats.backgroundRefreshes, 0);
  assert.equal(stats.hitRate, 0);
});

test("getStats.uptimeMs is a positive number", () => {
  const stats = cacheService.getStats();
  assert.ok(stats.uptimeMs >= 0, "uptimeMs should be non-negative");
});

test("hitRate is 0 when no operations have been performed", () => {
  cacheService.resetStats();
  const stats = cacheService.getStats();
  assert.equal(stats.hitRate, 0);
});

// ---------------------------------------------------------------------------
// CacheService public API surface
// ---------------------------------------------------------------------------

test("CacheService has required public methods", () => {
  assert.ok(typeof cacheService.get === "function");
  assert.ok(typeof cacheService.set === "function");
  assert.ok(typeof cacheService.delete === "function");
  assert.ok(typeof cacheService.invalidatePattern === "function");
  assert.ok(typeof cacheService.getOrSet === "function");
  assert.ok(typeof cacheService.getStats === "function");
  assert.ok(typeof cacheService.resetStats === "function");
  assert.ok(typeof cacheService.purgeAll === "function");
  assert.ok(typeof cacheService.buildKey === "function");
});

// ---------------------------------------------------------------------------
// CacheStats shape
// ---------------------------------------------------------------------------

test("getStats returns all required fields", () => {
  cacheService.resetStats();
  const stats = cacheService.getStats();
  const requiredKeys: readonly string[] = [
    "hits",
    "misses",
    "sets",
    "deletes",
    "backgroundRefreshes",
    "hitRate",
    "uptimeMs",
  ];
  for (const key of requiredKeys) {
    assert.ok(key in stats, `Missing stats field: ${key}`);
    assert.equal(typeof stats[key as keyof typeof stats], "number", `${key} should be a number`);
  }
});

// ---------------------------------------------------------------------------
// CacheKeys consistency
// ---------------------------------------------------------------------------

test("CacheKeys has all expected factory functions", () => {
  assert.ok(typeof CacheKeys.subjectList === "function");
  assert.ok(typeof CacheKeys.subjectDetail === "function");
  assert.ok(typeof CacheKeys.chapterContent === "function");
  assert.ok(typeof CacheKeys.chapterList === "function");
  assert.ok(typeof CacheKeys.aiResponse === "function");
  assert.ok(typeof CacheKeys.forumThreads === "function");
  assert.ok(typeof CacheKeys.forumThreadDetail === "function");
  assert.ok(typeof CacheKeys.quizQuestions === "function");
  assert.ok(typeof CacheKeys.userProgress === "function");
  assert.ok(typeof CacheKeys.userDashboard === "function");
});

test("CacheKeys produce unique keys for different inputs", () => {
  const key1 = CacheKeys.chapterContent(1);
  const key2 = CacheKeys.chapterContent(2);
  assert.notEqual(key1, key2);

  const key3 = CacheKeys.chapterList(10);
  const key4 = CacheKeys.chapterList(20);
  assert.notEqual(key3, key4);

  const key5 = CacheKeys.forumThreadDetail("aaa");
  const key6 = CacheKeys.forumThreadDetail("bbb");
  assert.notEqual(key5, key6);
});

test("CacheKeys key namespaces do not collide", () => {
  const subjectKey = CacheKeys.subjectDetail(1);
  const chapterKey = CacheKeys.chapterContent(1);
  const quizKey = CacheKeys.quizQuestions(1);
  assert.notEqual(subjectKey, chapterKey);
  assert.notEqual(subjectKey, quizKey);
  assert.notEqual(chapterKey, quizKey);
});

// ---------------------------------------------------------------------------
// buildKey utility
// ---------------------------------------------------------------------------

test("buildKey constructs colon-delimited key", () => {
  assert.equal(cacheService.buildKey("ns"), "ns:");
  assert.equal(cacheService.buildKey("ns", "a"), "ns:a");
  assert.equal(cacheService.buildKey("ns", "a", "b"), "ns:a:b");
  assert.equal(cacheService.buildKey("cache", "user", "42"), "cache:user:42");
});
