import { logger, getCorrelationId } from "./logger.js";
import { isSentryEnabled, Sentry } from "./sentry.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpanContext {
  name: string;
  category: SpanCategory;
  startTime: bigint;
  metadata?: Record<string, string>;
}

export type SpanCategory = "db.query" | "ai.call" | "cache.get" | "cache.set" | "http.request";

export interface PercentileStats {
  p50: number;
  p95: number;
  p99: number;
  count: number;
  min: number;
  max: number;
}

export type PerformanceStats = Record<SpanCategory, PercentileStats>;

// ---------------------------------------------------------------------------
// In-memory histogram (sorted array approach)
// ---------------------------------------------------------------------------

/** Maximum samples to retain per category to bound memory usage. */
const MAX_SAMPLES = 10_000;

const histograms = new Map<SpanCategory, number[]>();

const getHistogram = (category: SpanCategory): number[] => {
  let arr = histograms.get(category);
  if (!arr) {
    arr = [];
    histograms.set(category, arr);
  }
  return arr;
};

const insertSorted = (arr: number[], value: number): void => {
  // Binary search for insertion point
  let low = 0;
  let high = arr.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if ((arr[mid] ?? 0) < value) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  arr.splice(low, 0, value);

  // Evict oldest samples if exceeding max (remove from front since those are smallest / oldest)
  if (arr.length > MAX_SAMPLES) {
    // Remove a random 10% to avoid O(n) shifts on every insert
    const removeCount = Math.floor(MAX_SAMPLES * 0.1);
    arr.splice(0, removeCount);
  }
};

const percentile = (arr: number[], p: number): number => {
  if (arr.length === 0) return 0;
  const index = Math.ceil((p / 100) * arr.length) - 1;
  return arr[Math.max(0, Math.min(index, arr.length - 1))] ?? 0;
};

// ---------------------------------------------------------------------------
// Span management
// ---------------------------------------------------------------------------

export const startSpan = (name: string, category: SpanCategory, metadata?: Record<string, string>): SpanContext => {
  const span: SpanContext = {
    name,
    category,
    startTime: process.hrtime.bigint(),
  };
  if (metadata) {
    span.metadata = metadata;
  }
  return span;
};

export const endSpan = (span: SpanContext): number => {
  const durationNs = process.hrtime.bigint() - span.startTime;
  const durationMs = Number(durationNs) / 1_000_000;

  // Record in histogram
  const histogram = getHistogram(span.category);
  insertSorted(histogram, durationMs);

  // Log span
  logger.debug({
    correlationId: getCorrelationId(),
    span: span.name,
    category: span.category,
    durationMs: Math.round(durationMs * 100) / 100,
    ...(span.metadata ? { metadata: span.metadata } : {}),
    message: "span completed",
  });

  // Forward to Sentry if available
  if (isSentryEnabled() && span.metadata) {
    Sentry.startSpan(
      {
        name: span.name,
        op: span.category,
        attributes: span.metadata,
      },
      () => {
        // span auto-finishes when callback returns
      },
    );
  } else if (isSentryEnabled()) {
    Sentry.startSpan(
      {
        name: span.name,
        op: span.category,
      },
      () => {
        // span auto-finishes when callback returns
      },
    );
  }

  return durationMs;
};

// ---------------------------------------------------------------------------
// Stats retrieval
// ---------------------------------------------------------------------------

const CATEGORIES: SpanCategory[] = ["db.query", "ai.call", "cache.get", "cache.set", "http.request"];

export const getPerformanceStats = (): PerformanceStats => {
  const stats = {} as PerformanceStats;

  for (const category of CATEGORIES) {
    const arr = histograms.get(category) ?? [];
    stats[category] = {
      p50: Math.round(percentile(arr, 50) * 100) / 100,
      p95: Math.round(percentile(arr, 95) * 100) / 100,
      p99: Math.round(percentile(arr, 99) * 100) / 100,
      count: arr.length,
      min: arr.length > 0 ? Math.round((arr[0] ?? 0) * 100) / 100 : 0,
      max: arr.length > 0 ? Math.round((arr[arr.length - 1] ?? 0) * 100) / 100 : 0,
    };
  }

  return stats;
};

// ---------------------------------------------------------------------------
// Convenience wrappers for common categories
// ---------------------------------------------------------------------------

/**
 * Wrap an async function with performance tracking.
 */
export const withSpan = async <T>(
  name: string,
  category: SpanCategory,
  fn: () => Promise<T>,
  metadata?: Record<string, string>,
): Promise<T> => {
  const span = startSpan(name, category, metadata);
  try {
    return await fn();
  } finally {
    endSpan(span);
  }
};

// ---------------------------------------------------------------------------
// Reset (for testing)
// ---------------------------------------------------------------------------

export const resetPerformanceStats = (): void => {
  histograms.clear();
};
