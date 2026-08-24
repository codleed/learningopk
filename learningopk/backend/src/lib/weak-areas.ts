const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);

const STOP_WORDS = new Set([
  "what",
  "which",
  "when",
  "where",
  "from",
  "into",
  "about",
  "using",
  "solve",
  "state",
  "object",
  "student",
  "true",
  "false",
  "formula",
  "calculate",
  "find",
]);

const toTitleCase = (value: string): string =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => (part[0] ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(" ");

const extractLabel = (question: string, fallback: string): string => {
  const keywords = Array.from(
    new Set(tokenize(question).filter((token) => !STOP_WORDS.has(token)))
  );
  if (keywords.length === 0) {
    return fallback;
  }

  return toTitleCase(keywords.slice(0, 3).join(" "));
};

const similarity = (left: string, right: string): number => {
  const leftTokens = new Set(tokenize(left));
  return tokenize(right).reduce((total, token) => total + (leftTokens.has(token) ? 1 : 0), 0);
};

export type SubjectWeakArea = {
  label: string;
  href: string;
  chapterId: number;
  chapterTitle: string;
  exerciseId: number | null;
  exerciseNumber: string | null;
  exerciseQuestion: string | null;
  wrongAnswerCount: number;
  quizAttemptsCount: number;
};

export const buildSubjectWeakAreas = (params: {
  attempts: Array<{
    quizId: number;
    answers: Record<string, string>;
    subjectId: number;
    subjectSlug: string;
    grade: string | null;
    boardSlug: string;
    chapterId: number;
    chapterSlug: string;
    chapterTitle: string;
  }>;
  questions: Array<{
    questionId: number;
    quizId: number;
    chapterId: number | null;
    question: string;
    correctOption: "a" | "b" | "c" | "d";
  }>;
  exercises: Array<{
    exerciseId: number;
    chapterId: number;
    exerciseNumber: string;
    question: string;
  }>;
  minAttempts?: number;
  limitPerSubject?: number;
}): Map<number, SubjectWeakArea[]> => {
  const attemptsBySubject = new Map<number, typeof params.attempts>();
  for (const attempt of params.attempts) {
    const existing = attemptsBySubject.get(attempt.subjectId) ?? [];
    existing.push(attempt);
    attemptsBySubject.set(attempt.subjectId, existing);
  }

  const questionsByKey = new Map<string, (typeof params.questions)[number]>();
  for (const question of params.questions) {
    questionsByKey.set(`${question.quizId}:${question.questionId}`, question);
  }

  const exercisesByChapter = new Map<number, typeof params.exercises>();
  for (const exercise of params.exercises) {
    const existing = exercisesByChapter.get(exercise.chapterId) ?? [];
    existing.push(exercise);
    exercisesByChapter.set(exercise.chapterId, existing);
  }

  const subjectWeakAreas = new Map<number, SubjectWeakArea[]>();
  const minAttempts = params.minAttempts ?? 3;

  for (const [subjectId, attempts] of attemptsBySubject.entries()) {
    if (attempts.length < minAttempts) {
      subjectWeakAreas.set(subjectId, []);
      continue;
    }

    const buckets = new Map<string, SubjectWeakArea>();

    for (const attempt of attempts) {
      for (const [questionId, selectedOption] of Object.entries(attempt.answers)) {
        const question = questionsByKey.get(`${attempt.quizId}:${questionId}`);
        if (!question || selectedOption === question.correctOption) {
          continue;
        }

        const candidateExercises = exercisesByChapter.get(attempt.chapterId) ?? [];
        let matchedExercise = candidateExercises[0] ?? null;
        let bestScore = matchedExercise
          ? similarity(question.question, matchedExercise.question)
          : 0;

        for (const exercise of candidateExercises.slice(1)) {
          const nextScore = similarity(question.question, exercise.question);
          if (nextScore > bestScore) {
            matchedExercise = exercise;
            bestScore = nextScore;
          }
        }

        const key = `${attempt.chapterId}:${matchedExercise?.exerciseId ?? question.questionId}`;
        const existing = buckets.get(key);
        if (existing) {
          existing.wrongAnswerCount += 1;
          continue;
        }

        buckets.set(key, {
          label: extractLabel(matchedExercise?.question ?? question.question, attempt.chapterTitle),
          href: `/${attempt.boardSlug}/${attempt.grade ?? "9"}/${attempt.subjectSlug}/${attempt.chapterSlug}?tab=exercises`,
          chapterId: attempt.chapterId,
          chapterTitle: attempt.chapterTitle,
          exerciseId: matchedExercise?.exerciseId ?? null,
          exerciseNumber: matchedExercise?.exerciseNumber ?? null,
          exerciseQuestion: matchedExercise?.question ?? null,
          wrongAnswerCount: 1,
          quizAttemptsCount: attempts.length,
        });
      }
    }

    subjectWeakAreas.set(
      subjectId,
      Array.from(buckets.values())
        .sort(
          (left, right) =>
            right.wrongAnswerCount - left.wrongAnswerCount || left.label.localeCompare(right.label)
        )
        .slice(0, params.limitPerSubject ?? 3)
    );
  }

  return subjectWeakAreas;
};
