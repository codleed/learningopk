import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DashboardSkeleton() {
  return (
    <section
      className="space-y-10"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading dashboard"
    >
      {/* Hero zone: 3-column grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Continue Learning */}
        <div className="md:col-span-2 xl:col-span-1 rounded-xl border border-border-default bg-bg-surface p-5 space-y-4">
          <Skeleton className="h-3 w-24" />
          <div className="flex items-center gap-4">
            <Skeleton variant="circular" className="h-[72px] w-[72px]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          </div>
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>

        {/* Streak & XP */}
        <div className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-3">
          <Skeleton className="h-5 w-28" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        {/* Today's Goal */}
        <div className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-4">
          <Skeleton className="h-5 w-28" />
          <div className="flex items-center justify-center py-3">
            <Skeleton variant="circular" className="h-24 w-24" />
          </div>
          <div className="flex items-center justify-center gap-6">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-5 w-24 rounded" />
          </div>
        </div>
      </div>

      {/* Main + Sidebar */}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Subject progress grid */}
          <div className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-4">
            <Skeleton className="h-5 w-40" />
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="rounded-xl border border-border-default bg-bg-base p-4 space-y-3"
                >
                  <Skeleton className="h-1.5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-2.5 w-full rounded-full" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar widgets */}
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-3">
            <Skeleton className="h-5 w-28" />
            {[0, 1, 2].map((k) => (
              <Skeleton key={k} className="h-20 w-full rounded-xl" />
            ))}
          </div>
          <div className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((k) => (
                <Skeleton key={k} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activity: 2-column */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-3">
          <Skeleton className="h-5 w-36" />
          <div className="flex items-center justify-end gap-1.5">
            <Skeleton className="h-5 w-40 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-7 gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((l) => (
              <div key={l} className="space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-3">
          <Skeleton className="h-5 w-36" />
          {[0, 1, 2, 3].map((m) => (
            <div
              key={m}
              className="flex items-start gap-3 py-2.5 border-b border-border-default/40 last:border-0"
            >
              <Skeleton variant="circular" className="h-7 w-7" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Study Groups */}
      <div className="rounded-xl border border-border-default bg-bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1].map((n) => (
            <div
              key={n}
              className="flex items-center justify-between rounded-xl border border-border-default bg-bg-base p-4"
            >
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
