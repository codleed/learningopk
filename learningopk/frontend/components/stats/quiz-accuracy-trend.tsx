import type { QuizAccuracyPoint } from "@/lib/stats-metrics";

import { EmptyState } from "@/components/ui/states";

type QuizAccuracyTrendProps = {
  points: QuizAccuracyPoint[];
};

const toPolylinePoints = (points: QuizAccuracyPoint[]): string => {
  if (points.length === 0) {
    return "";
  }

  const maxIndex = Math.max(1, points.length - 1);

  return points
    .map((point, index) => {
      const x = (index / maxIndex) * 100;
      const y = 100 - point.movingAverage;
      return `${x},${y}`;
    })
    .join(" ");
};

export function QuizAccuracyTrend({ points }: QuizAccuracyTrendProps) {
  if (points.length === 0) {
    return (
      <EmptyState
        title="No quiz attempts yet"
        description="Submit chapter quizzes to populate your accuracy trend."
      />
    );
  }

  const current = points[points.length - 1];

  return (
    <div>
      <div className="rounded-xl border border-border bg-muted/35 p-3">
        <svg viewBox="0 0 100 100" role="img" aria-label="Quiz accuracy moving average trend" className="h-28 w-full">
          <polyline points={toPolylinePoints(points)} fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" />
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground">
          Latest moving average: <span className="font-semibold text-foreground">{current?.movingAverage ?? 0}%</span>
        </p>
        <p className="text-xs text-muted-foreground">Based on last {points.length} quiz attempts</p>
      </div>
    </div>
  );
}
