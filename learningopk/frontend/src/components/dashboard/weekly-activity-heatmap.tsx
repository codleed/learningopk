type WeeklyActivityEntry = {
  date: string;
  active: boolean;
  activityCount: number;
};

type WeeklyActivityHeatmapProps = {
  weeklyActivity: WeeklyActivityEntry[];
};

export function WeeklyActivityHeatmap({ weeklyActivity }: WeeklyActivityHeatmapProps) {
  return (
    <article className="surface-card rounded-2xl border border-border p-6">
      <h2 className="text-base font-semibold text-foreground">Weekly Activity</h2>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {weeklyActivity.length > 0 ? (
          weeklyActivity.map((entry) => (
            <div key={entry.date} className="text-center">
              <div
                className={[
                  "mx-auto flex h-11 w-11 items-center justify-center rounded-md border text-xs font-semibold",
                  entry.active
                    ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                    : "border-border bg-muted text-muted-foreground"
                ].join(" ")}
                title={`${entry.date}: ${entry.activityCount} activity`}
              >
                {entry.activityCount}
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {new Date(entry.date).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
              </p>
            </div>
          ))
        ) : (
          <p className="col-span-7 text-xs text-muted-foreground">No activity data available.</p>
        )}
      </div>
    </article>
  );
}

