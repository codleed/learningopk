"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, SkipForward, Send, AlertTriangle, Swords, TimerReset } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LinearProgress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/states";
import type { ChapterDetailResponse } from "@/lib/learn-api";

import { QuizQuestionCard } from "./quiz-question-card";
import { QuizQuestionReviewList } from "./quiz-question-review-list";
import { QuizResultSummary } from "./quiz-result-summary";
import { QuizTimer } from "./quiz-timer";
import { QuestionNavigator } from "./question-navigator";
import { MockExamResultDetails } from "./mock-exam-result-details";
import { QUIZ_NAVIGATOR_THRESHOLD, TIMER_INTERVAL_MS } from "@/lib/quiz-constants";

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
      chapterId: z.number().int().positive().nullable(),
      chapterTitle: z.string().nullable(),
      selectedOption: z.enum(["a", "b", "c", "d"]).nullable(),
      correctOption: z.enum(["a", "b", "c", "d"]),
      isCorrect: z.boolean(),
      explanation: z.string(),
      marks: z.number().int().positive(),
      awardedMarks: z.number().int().nonnegative()
    })
  ),
  sectionScores: z.array(
    z.object({
      chapterId: z.number().int().nullable(),
      chapterTitle: z.string().nullable(),
      chapterNumber: z.number().int().nullable(),
      score: z.number().int(),
      totalMarks: z.number().int(),
      questionCount: z.number().int(),
      correctCount: z.number().int()
    })
  ).optional(),
  weakAreas: z.array(
    z.object({
      chapterId: z.number().int(),
      chapterTitle: z.string(),
      chapterNumber: z.number().int(),
      correctPercentage: z.number(),
      wrongQuestionCount: z.number().int(),
      totalQuestions: z.number().int()
    })
  ).optional(),
  duel: z.object({
    challengeId: z.string().uuid(),
    status: z.enum(["open", "completed", "expired"]),
    expiresAt: z.string().datetime(),
    challenger: z.object({
      userId: z.string(),
      name: z.string(),
      score: z.number().int().nonnegative(),
      totalMarks: z.number().int().nonnegative(),
      percentage: z.number().int().min(0).max(100),
      completedAt: z.string().datetime(),
      isCurrentUser: z.boolean()
    }),
    recipient: z.object({
      userId: z.string(),
      name: z.string(),
      score: z.number().int().nonnegative(),
      totalMarks: z.number().int().nonnegative(),
      percentage: z.number().int().min(0).max(100),
      completedAt: z.string().datetime(),
      isCurrentUser: z.boolean()
    }).nullable()
  }).optional()
});

export type QuizResult = z.infer<typeof submitQuizResponseSchema>;

type QuizSubmitErrorResponse = {
  error?: string;
};

type QuizRunnerProps = {
  quiz: Quiz;
  subjectName?: string;
  chapterNumber?: number;
  chapterTitle?: string;
  challengeId?: string;
};

const quizChallengeResponseSchema = z.object({
  data: z.object({
    challengeId: z.string().uuid(),
    quizId: z.number().int().positive(),
    expiresAt: z.string().datetime(),
    createdAt: z.string().datetime()
  })
});

const quizChallengeDetailResponseSchema = z.object({
  data: submitQuizResponseSchema.shape.duel.unwrap()
});

/** Slide direction for the page transition */
type SlideDirection = "left" | "right";

const slideVariants = {
  enter: (direction: SlideDirection) => ({
    x: direction === "left" ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: SlideDirection) => ({
    x: direction === "left" ? -300 : 300,
    opacity: 0,
  }),
};

export function QuizRunner({ quiz, subjectName, chapterNumber, chapterTitle, challengeId }: QuizRunnerProps) {
  const reduced = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerOption>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(quiz.durationMinutes * 60);
  const [startedAtMs, setStartedAtMs] = useState(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [announcementText, setAnnouncementText] = useState("");
  const [slideDirection, setSlideDirection] = useState<SlideDirection>("left");
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [challengeDetails, setChallengeDetails] = useState<QuizResult["duel"] | null>(null);

  const backendUrl = useMemo(() => process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001", []);

  const currentQuestion = quiz.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isMockExam = quiz.type === "mock_exam";
  const isTimeUp = remainingSeconds === 0;
  const totalQuestions = quiz.questions.length;
  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;
  const isChallengeMode = Boolean(challengeId);

  const selectAnswer = (questionId: number, option: AnswerOption) => {
    if (result || isSubmitting || isTimeUp) {
      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [String(questionId)]: option
    }));
  };

  const goToQuestion = useCallback((newIndex: number) => {
    setSlideDirection(newIndex > currentIndex ? "left" : "right");
    setCurrentIndex(newIndex);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setSlideDirection("left");
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, totalQuestions]);

  const goPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setSlideDirection("right");
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const skipQuestion = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setSlideDirection("left");
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, totalQuestions]);

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
          answers,
          challengeId
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
  }, [answers, backendUrl, challengeId, isSubmitting, quiz.id, result, startedAtMs]);

  const createChallenge = useCallback(async () => {
    if (!result || result.quizType !== "chapter_quiz") {
      return null;
    }

    const response = await fetch(`${backendUrl}/api/quiz/challenges`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        quizId: result.quizId,
        attemptId: result.attemptId
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Unable to create challenge link.");
    }

    const json = (await response.json()) as unknown;
    const parsed = quizChallengeResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error("Challenge response could not be parsed.");
    }

    const url = new URL(window.location.href);
    url.searchParams.set("tab", "quiz");
    url.searchParams.set("challengeId", parsed.data.data.challengeId);
    await navigator.clipboard.writeText(url.toString());
    return url.toString();
  }, [backendUrl, result]);

  const startRetake = () => {
    setResult(null);
    setSubmitError(null);
    setAnswers({});
    setCurrentIndex(0);
    setRemainingSeconds(quiz.durationMinutes * 60);
    setStartedAtMs(Date.now());
    setIsSubmitting(false);
    setAnnouncementText("");
    setSlideDirection("left");
  };

  useEffect(() => {
    if (result || isSubmitting || remainingSeconds <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((previous) => Math.max(0, previous - 1));
    }, TIMER_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [result, isSubmitting, remainingSeconds]);

  useEffect(() => {
    if (!challengeId) {
      setChallengeError(null);
      setChallengeDetails(null);
      return;
    }

    let cancelled = false;

    const loadChallenge = async () => {
      try {
        setChallengeError(null);
        const response = await fetch(`${backendUrl}/api/quiz/challenges/${challengeId}`, {
          credentials: "include"
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          if (!cancelled) {
            setChallengeError(payload?.error ?? "Unable to load challenge.");
          }
          return;
        }

        const json = (await response.json()) as unknown;
        const parsed = quizChallengeDetailResponseSchema.safeParse(json);
        if (!parsed.success) {
          if (!cancelled) {
            setChallengeError("Unable to parse challenge details.");
          }
          return;
        }

        if (!cancelled) {
          setChallengeDetails(parsed.data.data);
        }
      } catch {
        if (!cancelled) {
          setChallengeError("Unable to load challenge right now.");
        }
      }
    };

    void loadChallenge();

    return () => {
      cancelled = true;
    };
  }, [backendUrl, challengeId]);

  if (quiz.questions.length === 0) {
    return (
      <EmptyState
        title="No quiz questions yet"
        description="Quiz content for this chapter is being prepared. Review summary, exercises, and flashcards meanwhile."
      />
    );
  }

  /* ─── Result view ─── */
  if (result) {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.4 }}
        className="space-y-5"
      >
        <QuizResultSummary
          result={result}
          onRetake={startRetake}
          subjectName={subjectName}
          chapterNumber={chapterNumber}
          chapterTitle={chapterTitle}
          onCreateChallenge={quiz.type === "chapter_quiz" ? createChallenge : undefined}
        />
        {isMockExam && result.sectionScores && result.sectionScores.length > 0 && (
          <MockExamResultDetails
            sectionScores={result.sectionScores}
            weakAreas={result.weakAreas}
          />
        )}
        <QuizQuestionReviewList result={result} />
      </motion.div>
    );
  }

  /* ─── Quiz taking view ─── */
  const showNavigator = isMockExam && totalQuestions > QUIZ_NAVIGATOR_THRESHOLD;

  const quizContent = (
    <div className="space-y-5">
      {/* Top bar: counter + timer + progress */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {isMockExam ? "Mock Exam" : "Chapter Quiz"}
              </p>
              <p className="font-display text-lg font-bold text-text-primary">
                Q {currentIndex + 1}
                <span className="text-text-secondary font-normal">/{totalQuestions}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="default" size="sm">{totalQuestions} questions</Badge>
              <Badge variant="default" size="sm">{quiz.totalMarks} marks</Badge>
              <Badge variant="primary" size="sm">{answeredCount} answered</Badge>
            </div>
          </div>
          <QuizTimer remainingSeconds={remainingSeconds} expired={isTimeUp && !result} />
        </div>

        {/* Linear progress */}
        <div className="mt-3">
          <LinearProgress
            value={progressPercent}
            barSize="sm"
            colorVariant={isTimeUp ? "danger" : "primary"}
          />
        </div>
      </Card>

      {/* Alerts */}
      {isTimeUp && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-accent-warning/30 bg-accent-warning-light px-4 py-3 text-sm text-accent-warning"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Time is up. Answer selection is locked — submit your attempt to view results.</span>
        </motion.div>
      )}

      {submitError && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-accent-danger/30 bg-accent-danger-light px-4 py-3 text-sm text-accent-danger"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{submitError}</span>
        </motion.div>
      )}

      {isChallengeMode && challengeError ? (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-accent-danger/30 bg-accent-danger-light px-4 py-3 text-sm text-accent-danger"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{challengeError}</span>
        </motion.div>
      ) : null}

      {isChallengeMode && challengeDetails && !result ? (
        <Card className="border border-accent-primary/20 bg-gradient-to-r from-accent-primary/5 via-bg-surface to-accent-warning-light p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Swords className="h-4 w-4 text-accent-primary" />
                Duel challenge from {challengeDetails.challenger.name}
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                Match the same 10 questions and compare your score side-by-side.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="primary" size="sm">{challengeDetails.challenger.score}/{challengeDetails.challenger.totalMarks}</Badge>
              <Badge variant={challengeDetails.status === "expired" ? "warning" : "default"} size="sm">
                <TimerReset className="mr-1 inline h-3.5 w-3.5" />
                Expires {new Date(challengeDetails.expiresAt).toLocaleString()}
              </Badge>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Accessibility announcement */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcementText}
      </div>

      {/* Question card with slide transition */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={slideDirection}>
          <motion.div
            key={currentIndex}
            custom={slideDirection}
            variants={reduced ? undefined : slideVariants}
            initial={reduced ? false : "enter"}
            animate={reduced ? undefined : "center"}
            exit={reduced ? undefined : "exit"}
            transition={reduced ? { duration: 0 } : { duration: 0.25, ease: "easeInOut" }}
          >
            <QuizQuestionCard
              question={currentQuestion}
              questionNumber={currentIndex + 1}
              selectedAnswer={answers[String(currentQuestion.id)]}
              locked={isTimeUp}
              onSelect={(option) => selectAnswer(currentQuestion.id, option)}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goPrevious}
              disabled={currentIndex === 0}
              iconLeft={<ChevronLeft />}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={skipQuestion}
              disabled={currentIndex === totalQuestions - 1 || isTimeUp}
              iconLeft={<SkipForward />}
            >
              Skip
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {currentIndex < totalQuestions - 1 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={goNext}
                iconRight={<ChevronRight />}
              >
                Next
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              onClick={submitQuiz}
              disabled={isSubmitting}
              loading={isSubmitting}
              iconLeft={!isSubmitting ? <Send /> : undefined}
            >
              {isTimeUp ? "Submit Time-Up Attempt" : "Submit Quiz"}
            </Button>
          </div>
        </div>

        <p className="mt-2 text-xs text-text-secondary">
          {isMockExam
            ? "Mock exam rule: feedback is shown only after final submission."
            : isChallengeMode
              ? "Submit to lock your duel score and compare it with your friend."
              : "Submit when ready to view your score and explanations."}
        </p>
      </Card>
    </div>
  );

  /* ─── Layout: with navigator sidebar or standalone ─── */
  if (showNavigator) {
    return (
      <div className="flex gap-5">
        <div className="min-w-0 flex-1">
          {quizContent}
        </div>
        <div className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-4">
            <QuestionNavigator
              questions={quiz.questions}
              currentIndex={currentIndex}
              answers={answers}
              onSelectQuestion={goToQuestion}
              isLocked={isTimeUp}
            />
          </div>
        </div>
      </div>
    );
  }

  return quizContent;
}
