import type { QuizResult } from "./quiz-runner";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

type QuizQuestionReviewListProps = {
  result: QuizResult;
};

export function QuizQuestionReviewList({ result }: QuizQuestionReviewListProps) {
  return (
    <div className="space-y-3">
      {result.questionResults.map((entry, index) => (
        <article key={entry.questionId} className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Question {index + 1}</p>
          <div className="mt-1 font-medium text-foreground">
            <MarkdownRenderer content={entry.question} />
          </div>
          <div className="mt-3 grid gap-2 text-sm text-foreground/95">
            <p>
              Your answer:{" "}
              <span className="font-semibold text-foreground">
                {entry.selectedOption ? entry.selectedOption.toUpperCase() : "Not answered"}
              </span>
            </p>
            <p>
              Correct answer: <span className="font-semibold text-foreground">{entry.correctOption.toUpperCase()}</span>
            </p>
            <p>
              Marks:{" "}
              <span className="font-semibold text-foreground">
                {entry.awardedMarks}/{entry.marks}
              </span>
            </p>
            <div className="rounded-md bg-muted px-3 py-2 text-foreground/90">
              <MarkdownRenderer content={entry.explanation} />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

