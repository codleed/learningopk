"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { 
  Clock, 
  Trophy, 
  Sparkles, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChapterDetailResponse } from "@/lib/learn-api";
import { XP_REWARDS } from "@/lib/gamification-types";

type Quiz = NonNullable<ChapterDetailResponse["quiz"]>;
type AnswerOption = "a" | "b" | "c" | "d";

interface QuestQuizViewProps {
  quiz: Quiz;
  chapterId: number;
  onComplete: (score: number, percentage: number) => void;
}

interface QuizSubmissionResult {
  score: number;
  total: number;
  percentage: number;
  answers: Record<string, AnswerOption>;
}

export function QuestQuizView({ quiz, chapterId, onComplete }: QuestQuizViewProps) {
  const reduced = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerOption>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(quiz.durationMinutes * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<QuizSubmissionResult | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = quiz.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isTimeUp = remainingSeconds === 0;

  useEffect(() => {
    if (isSubmitted || remainingSeconds <= 0) return;
    
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isSubmitted, remainingSeconds]);

  const selectAnswer = (option: AnswerOption) => {
    if (isSubmitted || isTimeUp) return;
    setAnswers((prev) => ({ ...prev, [String(currentQuestion.id)]: option }));
  };

  const submitQuiz = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
      const response = await fetch(`${backendUrl}/api/quiz/submit`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          quizId: quiz.id,
          startedAt: new Date().toISOString(),
          answers
        })
      });

      if (response.ok) {
        const data = await response.json();
        const correctCount = data.questionResults?.filter((q: { isCorrect: boolean }) => q.isCorrect).length ?? 0;
        const percentage = Math.round((correctCount / quiz.questions.length) * 100);
        
        setResult({
          score: correctCount,
          total: quiz.questions.length,
          percentage,
          answers
        });
        setIsSubmitted(true);
        onComplete(correctCount, percentage);
        
        if (percentage === 100) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3000);
        }
      } else {
        const percentage = Math.round((answeredCount / quiz.questions.length) * 100);
        setResult({
          score: answeredCount,
          total: quiz.questions.length,
          percentage,
          answers
        });
        setIsSubmitted(true);
        onComplete(answeredCount, percentage);
      }
    } catch {
      const percentage = Math.round((answeredCount / quiz.questions.length) * 100);
      setResult({
        score: answeredCount,
        total: quiz.questions.length,
        percentage,
        answers
      });
      setIsSubmitted(true);
      onComplete(answeredCount, percentage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const retakeQuiz = () => {
    setAnswers({});
    setCurrentIndex(0);
    setIsSubmitted(false);
    setResult(null);
    setRemainingSeconds(quiz.durationMinutes * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (remainingSeconds <= 60) return "text-red-500 bg-red-500/10";
    if (remainingSeconds <= 300) return "text-amber-500 bg-amber-500/10";
    return "text-primary bg-primary/10";
  };

  if (quiz.questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No quiz questions available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
            <Target className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Challenge Arena</p>
            <p className="font-semibold">{quiz.title}</p>
          </div>
        </div>
        
        <div className={cn("flex items-center gap-2 rounded-full px-4 py-2", getTimerColor())}>
          <Clock className="h-4 w-4" />
          <span className="font-mono font-bold">{formatTime(remainingSeconds)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {quiz.questions.map((q, i) => {
          const isAnswered = !!answers[String(q.id)];
          const isCurrent = i === currentIndex;

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-all",
                isCurrent && "ring-2 ring-primary ring-offset-2",
                isAnswered && "bg-primary text-primary-foreground",
                !isAnswered && "bg-muted text-muted-foreground hover:bg-muted/70"
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {!isSubmitted && (
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-600">Potential Rewards</p>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Complete Quiz: +{XP_REWARDS.QUIZ_COMPLETE} XP</p>
            <p className="font-semibold text-amber-600">
              Total: +{XP_REWARDS.QUIZ_COMPLETE + XP_REWARDS.QUIZ_HIGH_SCORE + XP_REWARDS.QUIZ_PERFECT} XP
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <Badge variant="neutral">{currentIndex + 1} of {quiz.questions.length}</Badge>
          {isTimeUp && !isSubmitted && (
            <Badge variant="error">Time&apos;s Up!</Badge>
          )}
        </div>

        <p className="mb-6 text-lg">{currentQuestion.question}</p>

        <div className="space-y-3">
          {(["a", "b", "c", "d"] as AnswerOption[]).map((option) => {
            const optionKey = `option${option.toUpperCase()}` as keyof typeof currentQuestion;
            const optionText = currentQuestion[optionKey] as string;
            const isSelected = answers[String(currentQuestion.id)] === option;

            return (
              <button
                key={option}
                onClick={() => selectAnswer(option)}
                disabled={isSubmitted || isTimeUp}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                  isSelected && "border-primary bg-primary/5",
                  !isSelected && "border-border hover:border-primary/50",
                  (isSubmitted || isTimeUp) && "cursor-not-allowed opacity-80"
                )}
              >
                <span className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg font-bold",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  {option.toUpperCase()}
                </span>
                <span className="flex-1">{optionText}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <Button
            variant="ghost"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => setCurrentIndex(Math.min(quiz.questions.length - 1, currentIndex + 1))}
            disabled={currentIndex === quiz.questions.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {!isSubmitted && (
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={submitQuiz}
            disabled={isSubmitting}
            className="gap-2"
          >
            <Trophy className="h-5 w-5" />
            {isSubmitting ? "Submitting..." : "Submit Quiz"}
          </Button>
        </div>
      )}

      {isSubmitted && result && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : undefined}
          className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-purple-500/10 p-8 text-center"
        >
          {showCelebration && (
            <motion.div
              initial={reduced ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={reduced ? { duration: 0 } : undefined}
              className="mb-4"
            >
              <Sparkles className="mx-auto h-16 w-16 text-amber-500" />
            </motion.div>
          )}
          
          <h2 className="text-2xl font-bold">
            Quiz Complete!
          </h2>
          
          <div className="my-6">
            <span className="text-5xl font-bold text-primary">
              {result.percentage}%
            </span>
            <p className="mt-2 text-muted-foreground">
              {result.score} of {result.total} answered
            </p>
          </div>

          <Button onClick={retakeQuiz} variant="secondary" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
        </motion.div>
      )}
    </div>
  );
}
