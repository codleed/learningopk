import type { QuizResult } from "./quiz-runner";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";
import { ShareableResultCard } from "./shareable-result-card";
import { useState } from "react";
import { Share2 } from "lucide-react";

type QuizResultSummaryProps = {
  result: QuizResult;
  onRetake: () => void;
  subjectName?: string;
  chapterNumber?: number;
  chapterTitle?: string;
};

export function QuizResultSummary({ result, onRetake, subjectName, chapterNumber, chapterTitle }: QuizResultSummaryProps) {
  const passed = result.percentage >= 70;
  const [showShareCard, setShowShareCard] = useState(false);

  // Default subject name if not provided
  const displaySubjectName = subjectName || "Quiz";

  return (
    <div className="space-y-4">
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

      {/* Share Result Button */}
      <div className="flex justify-center">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowShareCard(!showShareCard)}
          className="flex items-center gap-2"
        >
          <Share2 className="h-4 w-4" />
          {showShareCard ? "Hide Share Card" : "Share Result"}
        </Button>
      </div>

      {/* Shareable Result Card */}
      {showShareCard && (
        <div className="flex justify-center">
          <ShareableResultCard
            result={result}
            subjectName={displaySubjectName}
            chapterNumber={chapterNumber}
            chapterTitle={chapterTitle}
          />
        </div>
      )}
    </div>
  );
}

