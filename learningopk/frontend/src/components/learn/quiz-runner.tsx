"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import type { ChapterDetailResponse } from "@/lib/learn-api";

import { QuizQuestionCard } from "./quiz-question-card";
import { QuizQuestionReviewList } from "./quiz-question-review-list";
import { QuizResultSummary } from "./quiz-result-summary";
import { QuizTimer } from "./quiz-timer";

type Quiz = NonNullable<ChapterDetailResponse["quiz"]>;
type AnswerOption = "a" | "b" | "c" | "d";

const submitQuizResponseSchema = z.object({
  attemptId: z.string().uuid(),
  quizId: z.number().int().positive(),
  quizType: z.enum(["chapter_quiz", "mock_exam"]),
  score: z.number().int().nonnegative(),
  totalMarks: z.number().int().positive(),
  percentage: z.number().int().min(0).max(100),
  timeSpentSeconds: z.number().int().nonnegative(),
  completedAt: z.string().datetime(),
  questionResults: z.array(
    z.object({
      questionId: z.number().int().positive(),
      question: z.string(),
      optionA: z.string(),
      optionB: z.string(),
      optionC: z.string(),
      optionD: z.string(),
      selectedOption: z.enum(["a", "b", "c", "d"]).nullable(),
      correctOption: z.enum(["a", "b", "c", "d"]),
      isCorrect: z.boolean(),
      explanation: z.string(),
      marks: z.number().int().positive(),
      awardedMarks: z.number().int().nonnegative()
    })
  )
});

export type QuizResult = z.infer<typeof submitQuizResponseSchema>;

type QuizSubmitErrorResponse = {
  error?: string;
};

type QuizRunnerProps = {
  quiz: Quiz;
};

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export function QuizRunner({ quiz }: QuizRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerOption>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(quiz.durationMinutes * 60);
  const [startedAtMs, setStartedAtMs] = useState(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [announcementText, setAnnouncementText] = useState("");

  const currentQuestion = quiz.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isMockExam = quiz.type === "mock_exam";
  const isTimeUp = remainingSeconds === 0;

  const questionProgressLabel = useMemo(() => `${currentIndex + 1} of ${quiz.questions.length}`, [currentIndex, quiz.questions.length]);

  const selectAnswer = (questionId: number, option: AnswerOption) => {
    if (result || isSubmitting || isTimeUp) {
      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [String(questionId)]: option
    }));
  };

  const submitQuiz = useCallback(async () => {
    if (result || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`${backendUrl}/api/quiz/submit`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          quizId: quiz.id,
          startedAt: new Date(startedAtMs).toISOString(),
          answers
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as QuizSubmitErrorResponse | null;
        setSubmitError(payload?.error ?? `Quiz submission failed with status ${response.status}.`);
        return;
      }

      const json = (await response.json()) as unknown;
      const parsedResponse = submitQuizResponseSchema.safeParse(json);
      if (!parsedResponse.success) {
        setSubmitError("Quiz submission response could not be parsed.");
        return;
      }

      const correctCount = parsedResponse.data.questionResults.filter((q) => q.isCorrect).length;
      const totalCount = parsedResponse.data.questionResults.length;
      setAnnouncementText(`Quiz complete! You got ${correctCount} out of ${totalCount} questions correct.`);
      setResult(parsedResponse.data);
    } catch {
      setSubmitError("Unable to submit quiz right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, isSubmitting, quiz.id, result, startedAtMs]);

  const startRetake = () => {
    setResult(null);
    setSubmitError(null);
    setAnswers({});
    setCurrentIndex(0);
    setRemainingSeconds(quiz.durationMinutes * 60);
    setStartedAtMs(Date.now());
    setIsSubmitting(false);
    setAnnouncementText("");
  };

  useEffect(() => {
    if (result || isSubmitting || remainingSeconds <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [result, isSubmitting, remainingSeconds]);

  if (quiz.questions.length === 0) {
    return (
      <EmptyState
        title="No quiz questions yet"
        description="Quiz content for this chapter is being prepared. Review summary, exercises, and flashcards meanwhile."
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="surface-card rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isMockExam ? "Mock Exam Mode" : "Chapter Quiz"}
            </p>
            <h3 className="text-lg font-semibold text-foreground">{quiz.title}</h3>
          </div>
          <QuizTimer remainingSeconds={remainingSeconds} expired={isTimeUp && !result} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="neutral">{quiz.questions.length} questions</Badge>
          <Badge variant="neutral">{quiz.totalMarks} total marks</Badge>
          <Badge variant="neutral">{answeredCount} answered</Badge>
        </div>
      </section>

      {result ? (
        <div className="space-y-4">
          <QuizResultSummary result={result} onRetake={startRetake} />
          <QuizQuestionReviewList result={result} />
        </div>
      ) : (
        <section className="surface-card space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Question {questionProgressLabel}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCurrentIndex((previous) => Math.max(0, previous - 1))}
                disabled={currentIndex === 0}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCurrentIndex((previous) => Math.min(quiz.questions.length - 1, previous + 1))}
                disabled={currentIndex === quiz.questions.length - 1}
              >
                Next
              </Button>
            </div>
          </div>

          {isTimeUp ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Time is up. Answer selection is locked, submit your attempt to view results.
            </p>
          ) : null}
          {submitError ? <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{submitError}</p> : null}

          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {announcementText}
          </div>
          <QuizQuestionCard
            question={currentQuestion}
            questionNumber={currentIndex + 1}
            selectedAnswer={answers[String(currentQuestion.id)]}
            locked={isTimeUp}
            onSelect={(option) => selectAnswer(currentQuestion.id, option)}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
            <p className="text-xs text-muted-foreground">
              {isMockExam
                ? "Mock exam rule: feedback is shown only after final submission."
                : "Submit when ready to view your score and explanations."}
            </p>
            <Button type="button" onClick={submitQuiz} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : isTimeUp ? "Submit Time-Up Attempt" : "Submit Quiz"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

