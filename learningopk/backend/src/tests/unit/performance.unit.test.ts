import assert from "node:assert/strict";
import test from "node:test";

import {
  startSpan,
  endSpan,
  getPerformanceStats,
  resetPerformanceStats,
  type SpanCategory,
} from "../../lib/performance.js";

test("performance: startSpan and endSpan record a duration", () => {
  resetPerformanceStats();

  const span = startSpan("test-query", "db.query");
  // Simulate some work
  const sum = Array.from({ length: 1000 }, (_, i) => i).reduce((a, b) => a + b, 0);
  assert.ok(sum >= 0); // prevent dead-code elimination
  const durationMs = endSpan(span);

  assert.ok(typeof durationMs === "number");
  assert.ok(durationMs >= 0, "Duration should be non-negative");
});

test("performance: getPerformanceStats returns all categories", () => {
  resetPerformanceStats();

  const stats = getPerformanceStats();
  const expectedCategories: SpanCategory[] = [
    "db.query",
    "ai.call",
    "cache.get",
    "cache.set",
    "http.request",
  ];

  for (const cat of expectedCategories) {
    assert.ok(cat in stats, `Missing category: ${cat}`);
    assert.equal(stats[cat].count, 0);
    assert.equal(stats[cat].p50, 0);
    assert.equal(stats[cat].p95, 0);
    assert.equal(stats[cat].p99, 0);
  }
});

test("performance: percentile calculations with known data", () => {
  resetPerformanceStats();

  // Insert 100 spans with durations approximately 1ms, 2ms, ..., 100ms
  // We can't control exact timing, so we'll insert spans and verify structure
  for (let i = 0; i < 100; i++) {
    const span = startSpan(`query-${i}`, "db.query");
    endSpan(span);
  }

  const stats = getPerformanceStats();
  assert.equal(stats["db.query"].count, 100);
  assert.ok(stats["db.query"].p50 >= 0);
  assert.ok(stats["db.query"].p95 >= 0);
  assert.ok(stats["db.query"].p99 >= 0);
  // p50 <= p95 <= p99 (monotonic since they're percentiles of same distribution)
  assert.ok(stats["db.query"].p50 <= stats["db.query"].p95 + 0.01, "p50 should be <= p95");
  assert.ok(stats["db.query"].p95 <= stats["db.query"].p99 + 0.01, "p95 should be <= p99");
  assert.ok(stats["db.query"].min <= stats["db.query"].max, "min should be <= max");
});

test("performance: multiple categories are independent", () => {
  resetPerformanceStats();

  const dbSpan = startSpan("db-test", "db.query");
  endSpan(dbSpan);

  const cacheSpan = startSpan("cache-test", "cache.get");
  endSpan(cacheSpan);

  const stats = getPerformanceStats();
  assert.equal(stats["db.query"].count, 1);
  assert.equal(stats["cache.get"].count, 1);
  assert.equal(stats["ai.call"].count, 0);
  assert.equal(stats["cache.set"].count, 0);
  assert.equal(stats["http.request"].count, 0);
});

test("performance: resetPerformanceStats clears all data", () => {
  // First add some data
  const span = startSpan("to-clear", "ai.call");
  endSpan(span);

  let stats = getPerformanceStats();
  assert.ok(stats["ai.call"].count > 0);

  // Reset
  resetPerformanceStats();
  stats = getPerformanceStats();
  assert.equal(stats["ai.call"].count, 0);
});

test("performance: span metadata is preserved", () => {
  resetPerformanceStats();

  const span = startSpan("test-with-metadata", "http.request", { url: "/api/test", method: "GET" });
  assert.equal(span.name, "test-with-metadata");
  assert.equal(span.category, "http.request");
  assert.deepEqual(span.metadata, { url: "/api/test", method: "GET" });
  endSpan(span);
});
