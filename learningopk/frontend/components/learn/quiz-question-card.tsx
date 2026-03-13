import type { ChapterDetailResponse } from "@/lib/learn-api";

type Quiz = NonNullable<ChapterDetailResponse["quiz"]>;
type QuizQuestion = Quiz["questions"][number];
type AnswerOption = "a" | "b" | "c" | "d";

type QuizQuestionCardProps = {
  question: QuizQuestion;
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

export function QuizQuestionCard({ question, selectedAnswer, locked, onSelect }: QuizQuestionCardProps) {
  return (
    <article className="space-y-4">
      <h4 className="text-lg font-semibold text-foreground">{question.question}</h4>
      <div className="grid gap-2">
        {answerOptionEntries.map((option) => {
          const isSelected = selectedAnswer === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onSelect(option.key)}
              disabled={locked}
              className={[
                "rounded-lg border px-3 py-2 text-left text-sm transition",
                isSelected
                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "border-border bg-card text-foreground hover:border-[var(--primary)]/45",
                locked ? "cursor-not-allowed opacity-60" : ""
              ].join(" ")}
            >
              <span className="mr-2 font-semibold">{option.label}.</span>
              {getOptionText(question, option.key)}
            </button>
          );
        })}
      </div>
    </article>
  );
}

