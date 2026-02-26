import type { SubjectResponse } from "@/lib/learn-api";

type SubjectHeaderProps = {
  board: SubjectResponse["board"];
  grade: SubjectResponse["grade"];
  subject: SubjectResponse["subject"];
};

export function SubjectHeader({ board, grade, subject }: SubjectHeaderProps) {
  return (
    <header className="surface-card rounded-3xl border border-border p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {board.name} | Grade {grade}
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">{subject.name}</h1>
      <p className="mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">
        {subject.description.trim().length > 0
          ? subject.description
          : "Study chapter summaries, solve exercises, review flashcards, and practice quizzes."}
      </p>
    </header>
  );
}

