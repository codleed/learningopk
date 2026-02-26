import type { GoalProgress } from "@/lib/stats-metrics";

import { DashboardCard } from "@/components/foundation/dashboard-primitives";

type StatsGoalsProps = {
  goals: GoalProgress[];
};

export function StatsGoals({ goals }: StatsGoalsProps) {
  return (
    <div className="space-y-3">
      {goals.map((goal) => (
        <DashboardCard key={goal.label} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-foreground">{goal.label}</p>
            <span className="text-xs font-semibold text-primary">{goal.valueLabel}</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${goal.progressPercent}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{goal.progressPercent}% complete</p>
        </DashboardCard>
      ))}
    </div>
  );
}
