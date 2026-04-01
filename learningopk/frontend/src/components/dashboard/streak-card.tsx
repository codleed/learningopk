import { Flame } from "lucide-react";

import { Card, CardBody } from "@/components/ui/card";
import { StreakCounter } from "@/components/common/streak-counter";

type StreakCardProps = {
  streakDays: number;
};

export function StreakCard({ streakDays }: StreakCardProps) {
  return (
    <Card variant="default">
      <CardBody>
        <div className="flex items-center gap-4">
          <StreakCounter count={streakDays} size="lg" />
          <div>
            <p className="text-xs font-medium text-text-secondary">
              Current streak
            </p>
            <p className="font-[var(--font-display)] text-2xl font-bold text-text-primary">
              {streakDays} day{streakDays !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
