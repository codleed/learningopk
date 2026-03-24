import { Flame } from "lucide-react";

type StreakCardProps = {
  streakDays: number;
};

export function StreakCard({ streakDays }: StreakCardProps) {
  return (
    <article className="surface-card rounded-2xl border border-border p-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Flame className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">Current streak</p>
          <p className="text-2xl font-semibold text-foreground">{streakDays} day(s)</p>
        </div>
      </div>
    </article>
  );
}

