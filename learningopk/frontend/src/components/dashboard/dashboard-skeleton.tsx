import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DashboardSkeleton() {
  return (
    <section
      className="space-y-6"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading dashboard"
    >
      {/* Top row skeleton */}
      <div className="grid gap-6 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-4"
          >
            <Skeleton className="h-5 w-32" />
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" className="h-16 w-16" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      {/* Middle row skeleton */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((j) => (
              <div
                key={j}
                className="rounded-xl border border-border-default bg-bg-base p-4 space-y-3"
              >
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-3">
          <Skeleton className="h-5 w-32" />
          {[0, 1, 2].map((k) => (
            <Skeleton key={k} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
      {/* Bottom row skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-3">
          <Skeleton className="h-5 w-36" />
          <div className="grid grid-cols-7 gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((l) => (
              <Skeleton key={l} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-3">
          <Skeleton className="h-5 w-36" />
          {[0, 1, 2].map((m) => (
            <Skeleton key={m} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </section>
  );
}
