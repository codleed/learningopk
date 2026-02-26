export type QuizOption = "a" | "b" | "c" | "d";

export type QuizAnswers = Record<string, QuizOption>;

export type QuizQuestionForScoring = {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: QuizOption;
  explanation: string;
  marks: number;
};

export type QuizQuestionResult = {
  questionId: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  selectedOption: QuizOption | null;
  correctOption: QuizOption;
  isCorrect: boolean;
  explanation: string;
  marks: number;
  awardedMarks: number;
};

type ScoreQuizSubmissionInput = {
  questionRows: QuizQuestionForScoring[];
  answers: QuizAnswers;
  configuredTotalMarks: number;
};

type ScoreQuizSubmissionResult = {
  questionResults: QuizQuestionResult[];
  score: number;
  totalMarks: number;
  percentage: number;
};

export const getInvalidAnswerQuestionIds = (questionRows: QuizQuestionForScoring[], answers: QuizAnswers): string[] => {
  const validQuestionIdSet = new Set(questionRows.map((question) => String(question.id)));
  return Object.keys(answers).filter((questionId) => !validQuestionIdSet.has(questionId));
};

export const scoreQuizSubmission = (input: ScoreQuizSubmissionInput): ScoreQuizSubmissionResult => {
  const questionResults = input.questionRows.map((question) => {
    const selectedOption = input.answers[String(question.id)] ?? null;
    const isCorrect = selectedOption === question.correctOption;
    const awardedMarks = isCorrect ? question.marks : 0;

    return {
      questionId: question.id,
      question: question.question,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      selectedOption,
      correctOption: question.correctOption,
      isCorrect,
      explanation: question.explanation,
      marks: question.marks,
      awardedMarks
    };
  });

  const score = questionResults.reduce((total, question) => total + question.awardedMarks, 0);
  const calculatedTotalMarks = input.questionRows.reduce((total, question) => total + question.marks, 0);
  const totalMarks = input.configuredTotalMarks > 0 ? input.configuredTotalMarks : calculatedTotalMarks;
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  return {
    questionResults,
    score,
    totalMarks,
    percentage
  };
};
