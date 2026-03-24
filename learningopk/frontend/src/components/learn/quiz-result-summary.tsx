import type { QuizResult } from "./quiz-runner";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";

type QuizResultSummaryProps = {
  result: QuizResult;
  onRetake: () => void;
};

export function QuizResultSummary({ result, onRetake }: QuizResultSummaryProps) {
  const passed = result.percentage >= 70;

  return (
    <div className="surface-card rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Result</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {result.score} / {result.totalMarks}
          </p>
          <p className="text-sm text-muted-foreground">
            {result.percentage}% score in {Math.max(1, Math.ceil(result.timeSpentSeconds / 60))} minute(s)
          </p>
          <p className="text-xs text-muted-foreground">Submitted at {new Date(result.completedAt).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone={passed ? "success" : "warning"} label={passed ? "Passed" : "Needs Review"} />
          <Button type="button" onClick={onRetake}>
            Retake Quiz
          </Button>
        </div>
      </div>
    </div>
  );
}

