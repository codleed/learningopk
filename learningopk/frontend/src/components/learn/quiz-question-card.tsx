import type { ChapterDetailResponse } from "@/lib/learn-api";
import { cn } from "@/lib/utils";

type Quiz = NonNullable<ChapterDetailResponse["quiz"]>;
type QuizQuestion = Quiz["questions"][number];
type AnswerOption = "a" | "b" | "c" | "d";

type QuizQuestionCardProps = {
  question: QuizQuestion;
  questionNumber: number;
  selectedAnswer: AnswerOption | undefined;
  locked: boolean;
  onSelect: (option: AnswerOption) => void;
};

const answerOptionEntries: Array<{ key: AnswerOption; label: string }> = [
  { key: "a", label: "A" },
  { key: "b", label: "B" },
  { key: "c", label: "C" },
  { key: "d", label: "D" }
];

const getOptionText = (question: QuizQuestion, option: AnswerOption): string => {
  switch (option) {
    case "a":
      return question.optionA;
    case "b":
      return question.optionB;
    case "c":
      return question.optionC;
    case "d":
      return question.optionD;
  }
};

export function QuizQuestionCard({ question, questionNumber, selectedAnswer, locked, onSelect }: QuizQuestionCardProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLFieldSetElement>) => {
    if (locked || !selectedAnswer) return;

    const currentIndex = answerOptionEntries.findIndex((opt) => opt.key === selectedAnswer);
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        nextIndex = (currentIndex + 1) % answerOptionEntries.length;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        nextIndex = (currentIndex - 1 + answerOptionEntries.length) % answerOptionEntries.length;
        break;
      default:
        return;
    }

    event.preventDefault();
    onSelect(answerOptionEntries[nextIndex].key);
  };

  return (
    <article className="space-y-4">
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Question {questionNumber}: {question.question}</p>
        <fieldset onKeyDown={handleKeyDown} disabled={locked}>
          <legend className="sr-only">Options for question {questionNumber}</legend>
          <div
            role="radiogroup"
            aria-label={`Options for question ${questionNumber}`}
            className="grid gap-2"
          >
          {answerOptionEntries.map((option) => {
            const isSelected = selectedAnswer === option.key;
            return (
              <label
                key={option.key}
                className={cn(
                  "flex cursor-pointer items-center rounded-lg border px-3 py-2 text-sm transition",
                  "text-left",
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-border bg-card text-foreground hover:border-[var(--primary)]/45",
                  locked ? "cursor-not-allowed opacity-60" : ""
                )}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.key}
                  checked={isSelected}
                  onChange={() => onSelect(option.key)}
                  disabled={locked}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "mr-2 flex h-5 w-5 items-center justify-center rounded-full border text-xs font-semibold transition",
                    isSelected
                      ? "border-[var(--primary-foreground)] bg-[var(--primary-foreground)] text-[var(--primary)]"
                      : "border-[var(--foreground)]/30 bg-transparent text-[var(--foreground)]/30",
                    !locked && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                  )}
                  aria-hidden="true"
                >
                  {option.label}
                </span>
                <span className="flex-1">{getOptionText(question, option.key)}</span>
              </label>
            );
          })}
          </div>
        </fieldset>
      </div>
    </article>
  );
}
