// Bounds an awaited promise so an operation that may never settle (e.g. a
// Redis client retrying its initial connection forever) cannot stall its
// caller indefinitely. The underlying promise keeps running — callers decide
// how to treat the loss (fail open, report "down", etc.).

export type RaceResult<T> = { ok: true; value: T } | { ok: false };

export const raceWithTimeout = async <T>(promise: Promise<T>, ms: number): Promise<RaceResult<T>> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<RaceResult<never>>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false }), ms);
  });

  try {
    return await Promise.race([
      promise.then((value): RaceResult<T> => ({ ok: true, value })),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
};
