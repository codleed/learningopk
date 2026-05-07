export interface GradableExercise {
  id: number;
  type: "mcq" | "short" | "long" | "numerical" | "fill_in_blanks";
  options?: Array<{ key: string; text: string }> | null | undefined;
  correctOption?: string | null | undefined;
  blanksAnswer?: string[] | null | undefined;
  statements?: Array<{ text: string; blanksAnswer: string[] }> | null | undefined;
  marks?: number | null | undefined;
  solution?: string | undefined;
}

export interface GradedQuestion {
  exerciseId: number;
  score: number;
  maxMarks: number;
  isCorrect: boolean;
  needsAiGrading: boolean;
  aiFeedback?: string;
}

export function gradeMcq(exercise: GradableExercise, userAnswer: unknown): { score: number; isCorrect: boolean } {
  const maxMarks = exercise.marks ?? 1;
  if (exercise.correctOption && typeof userAnswer === "string") {
    const isCorrect = userAnswer.toLowerCase() === exercise.correctOption.toLowerCase();
    return { score: isCorrect ? maxMarks : 0, isCorrect };
  }
  return { score: 0, isCorrect: false };
}

export function gradeFillInBlanks(
  exercise: GradableExercise,
  userAnswer: unknown
): { score: number; isCorrect: boolean; totalBlanks: number; correctBlanks: number } {
  const maxMarks = exercise.marks ?? 1;
  const allBlanks: string[] = [];

  if (exercise.blanksAnswer) {
    allBlanks.push(...exercise.blanksAnswer);
  }
  if (exercise.statements) {
    for (const stmt of exercise.statements) {
      allBlanks.push(...stmt.blanksAnswer);
    }
  }

  if (allBlanks.length === 0) return { score: 0, isCorrect: false, totalBlanks: 0, correctBlanks: 0 };

  const userAnswers = Array.isArray(userAnswer) ? userAnswer.map(a => String(a).trim().toLowerCase()) : [];
  let correctBlanks = 0;
  for (let i = 0; i < allBlanks.length; i++) {
    const expected = allBlanks[i]!.trim().toLowerCase();
    const given = userAnswers[i]?.trim().toLowerCase();
    if (expected === given) correctBlanks++;
  }

  const fraction = correctBlanks / allBlanks.length;
  const score = Math.round(fraction * maxMarks);
  const isCorrect = fraction >= 0.5;

  return { score, isCorrect, totalBlanks: allBlanks.length, correctBlanks };
}

export function autoGradeExercises(
  exercises: GradableExercise[],
  answers: Record<number, unknown>
): GradedQuestion[] {
  return exercises.map(exercise => {
    const userAnswer = answers[exercise.id];
    const maxMarks = exercise.marks ?? 1;
    const needsAiGrading = exercise.type === "short" || exercise.type === "long" || exercise.type === "numerical";

    if (exercise.type === "mcq") {
      const { score, isCorrect } = gradeMcq(exercise, userAnswer);
      return { exerciseId: exercise.id, score, maxMarks, isCorrect, needsAiGrading: false };
    }

    if (exercise.type === "fill_in_blanks") {
      const { score, isCorrect } = gradeFillInBlanks(exercise, userAnswer);
      return { exerciseId: exercise.id, score, maxMarks, isCorrect, needsAiGrading: false };
    }

    return {
      exerciseId: exercise.id,
      score: 0,
      maxMarks,
      isCorrect: false,
      needsAiGrading
    };
  });
}

export function calculateTotalScore(gradedQuestions: GradedQuestion[]): { totalScore: number; totalMarks: number; percentage: number } {
  const totalScore = gradedQuestions.reduce((sum, q) => sum + q.score, 0);
  const totalMarks = gradedQuestions.reduce((sum, q) => sum + q.maxMarks, 0);
  const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 10000) / 100 : 0;
  return { totalScore, totalMarks, percentage };
}
