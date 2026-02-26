import type { WeeklyStudyTrendPoint } from "@/lib/stats-metrics";

type WeeklyTrendProps = {
  points: WeeklyStudyTrendPoint[];
};

export function WeeklyTrend({ points }: WeeklyTrendProps) {
  const maxHours = points.reduce((max, point) => Math.max(max, point.estimatedHours), 1);

  return (
    <div>
      <div className="flex h-36 items-end gap-2">
        {points.map((point) => {
          const heightPercent = Math.max(8, Math.round((point.estimatedHours / maxHours) * 100));

          return (
            <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[10px] font-semibold text-muted-foreground">{point.estimatedHours}h</span>
              <span
                className="w-full rounded-md bg-primary/80"
                style={{ height: `${heightPercent}%` }}
                title={`${point.label}: ${point.estimatedHours} estimated hours (${point.activityCount} events)`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground sm:grid-cols-4">
        {points.slice(-4).map((point) => (
          <p key={point.label} className="truncate">
            {point.label}
          </p>
        ))}
      </div>
    </div>
  );
}
