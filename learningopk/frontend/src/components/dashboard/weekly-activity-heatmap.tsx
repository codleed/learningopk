import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type WeeklyActivityEntry = {
  date: string;
  active: boolean;
  activityCount: number;
};

type WeeklyActivityHeatmapProps = {
  weeklyActivity: WeeklyActivityEntry[];
};

const getDayLabel = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });

const getIntensityClass = (count: number): string => {
  if (count === 0) return "bg-bg-subtle border-border-default text-text-muted";
  if (count <= 1)
    return "bg-accent-primary/10 border-accent-primary/20 text-accent-primary";
  if (count <= 3)
    return "bg-accent-primary/20 border-accent-primary/30 text-accent-primary";
  if (count <= 5)
    return "bg-accent-primary/40 border-accent-primary/40 text-accent-primary";
  return "bg-accent-primary/60 border-accent-primary/50 text-white";
};

export function WeeklyActivityHeatmap({
  weeklyActivity,
}: WeeklyActivityHeatmapProps) {
  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="font-[var(--font-display)] text-base font-bold text-text-primary">
            Weekly Activity
          </h2>
          <Badge variant="default" size="sm">
            Last 7 days
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        {weeklyActivity.length > 0 ? (
          <div className="grid grid-cols-7 gap-2">
            {weeklyActivity.map((entry) => (
              <div key={entry.date} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                  {getDayLabel(entry.date)}
                </span>
                <div
                  className={cn(
                    "flex h-12 w-full items-center justify-center rounded-lg border text-xs font-bold tabular-nums transition-colors",
                    getIntensityClass(entry.activityCount)
                  )}
                  title={`${entry.date}: ${entry.activityCount} activit${entry.activityCount === 1 ? "y" : "ies"}`}
                >
                  {entry.activityCount}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-xs text-text-secondary">
            No activity data available yet.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
