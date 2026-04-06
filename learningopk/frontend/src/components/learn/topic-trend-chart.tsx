type TopicTrendChartProps = {
  points: Array<{ year: number; marks: number }>;
};

export function TopicTrendChart({ points }: TopicTrendChartProps) {
  if (points.length === 0) {
    return <p className="text-xs text-text-secondary">No trend data yet.</p>;
  }

  const max = Math.max(...points.map((point) => point.marks), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        {points.map((point) => (
          <div key={point.year} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-24 w-full items-end rounded-md bg-slate-100 px-1 dark:bg-slate-900/70">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-cyan-500 to-blue-500"
                style={{ height: `${Math.max((point.marks / max) * 100, point.marks > 0 ? 8 : 2)}%` }}
              />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-medium text-text-primary">{point.year}</p>
              <p className="text-[11px] text-text-secondary">{Math.round(point.marks)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
