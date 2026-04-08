import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DashboardSkeleton() {
  return (
    <section
      className="space-y-8"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading dashboard"
    >
      {/* ---- Hero zone: 3-column grid matching DashboardClient ---- */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr]">
        {/* Continue Learning (hero) */}
        <div className="md:col-span-2 xl:col-span-1 rounded-2xl border border-border-default bg-bg-surface p-5 space-y-4">
          <Skeleton className="h-3 w-24" />
          <div className="flex items-center gap-4">
            <Skeleton variant="circular" className="h-[72px] w-[72px]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>

        {/* Streak & XP */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 space-y-4">
          <Skeleton className="h-5 w-28" />
          <div className="flex items-center justify-center py-2">
            <Skeleton variant="circular" className="h-16 w-16" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
        </div>

        {/* Today's Goal */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 space-y-4">
          <Skeleton className="h-5 w-28" />
          <div className="flex items-center justify-center py-3">
            <Skeleton variant="circular" className="h-24 w-24" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>

      {/* ---- Section label ---- */}
      <div className="flex items-center gap-3 pt-2 pb-1">
        <Skeleton className="h-3 w-24" />
        <div className="h-px flex-1 bg-border-default" />
      </div>

      {/* ---- Insights: 2-column (main + sidebar) ---- */}
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          {/* Subject progress grid */}
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 space-y-4">
            <Skeleton className="h-5 w-40" />
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="rounded-2xl border border-border-default bg-bg-base p-4 space-y-3"
                >
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-2.5 w-full rounded-full" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar widgets */}
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 space-y-3">
            <Skeleton className="h-5 w-28" />
            {[0, 1, 2].map((k) => (
              <Skeleton key={k} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((k) => (
                <Skeleton key={k} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Activity section label ---- */}
      <div className="flex items-center gap-3 pt-2 pb-1">
        <Skeleton className="h-3 w-16" />
        <div className="h-px flex-1 bg-border-default" />
      </div>

      {/* ---- Activity: 2-column ---- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-40 rounded-full" />
          <div className="grid grid-cols-7 gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((l) => (
              <div key={l} className="space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 space-y-3">
          <Skeleton className="h-5 w-36" />
          {[0, 1, 2, 3].map((m) => (
            <div key={m} className="flex items-start gap-3">
              <Skeleton variant="circular" className="h-2.5 w-2.5 mt-2" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Personalization section label ---- */}
      <div className="flex items-center gap-3 pt-2 pb-1">
        <Skeleton className="h-3 w-28" />
        <div className="h-px flex-1 bg-border-default" />
      </div>

      {/* ---- AI Memory ---- */}
      <div className="rounded-2xl border border-border-default bg-bg-surface p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" className="h-5 w-5" />
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
    </section>
  );
}
