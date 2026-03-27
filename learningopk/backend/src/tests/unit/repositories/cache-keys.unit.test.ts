import assert from "node:assert/strict";
import test from "node:test";

import { CacheKeys, cacheService } from "../../../lib/cache/cache.service.js";

test("CacheService buildKey creates correct key", () => {
  const key = cacheService.buildKey("namespace", "a", "b", "123");
  assert.equal(key, "namespace:a:b:123");
});

test("CacheKeys.subjectList returns correct key", () => {
  assert.equal(CacheKeys.subjectList(), "subjects:list");
});

test("CacheKeys.subjectDetail returns key with subjectId", () => {
  assert.equal(CacheKeys.subjectDetail(5), "subjects:detail:5");
});

test("CacheKeys.chapterList returns key with subjectId", () => {
  assert.equal(CacheKeys.chapterList(3), "chapters:list:3");
});

test("CacheKeys.chapterContent returns key with chapterId", () => {
  assert.equal(CacheKeys.chapterContent(7), "chapters:content:7");
});

test("CacheKeys.forumThreadDetail returns key with threadId", () => {
  assert.equal(CacheKeys.forumThreadDetail("abc-123"), "forum:thread:abc-123");
});

test("CacheKeys.userProgress returns key with userId", () => {
  assert.equal(CacheKeys.userProgress("user-456"), "user:progress:user-456");
});

test("CacheKeys.userDashboard returns key with userId", () => {
  assert.equal(CacheKeys.userDashboard("user-789"), "user:dashboard:user-789");
});

test("CacheKeys.quizQuestions returns key with quizId", () => {
  assert.equal(CacheKeys.quizQuestions(10), "quiz:questions:10");
});