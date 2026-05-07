"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/states";
import { ExamTimer } from "@/components/past-papers/exam-timer";
import { QuestionNavigator } from "@/components/past-papers/question-navigator";
import { MCQOptionGroup } from "@/components/past-papers/mcq-option-group";
import { FillBlanksInput } from "@/components/past-papers/fill-blanks-input";
import { AnswerEditor } from "@/components/past-papers/answer-editor";
import {
  startAttempt,
  saveAnswer,
  submitAttempt,
  type AttemptExercise,
  type PastPaperAttempt
} from "@/lib/past-papers-api";

export function AttemptClient({ paperId }: { paperId: string }) {
  const router = useRouter();
  const paperIdNum = parseInt(paperId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<PastPaperAttempt | null>(null);
  const [exercises, setExercises] = useState<AttemptExercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [submitting, setSubmitting] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isNaN(paperIdNum)) {
      setError("Invalid paper ID");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const data = await startAttempt(paperIdNum);
        setAttempt(data.attempt);
        setExercises(data.exercises);
        if (data.savedAnswers && Object.keys(data.savedAnswers).length > 0) {
          setAnswers(data.savedAnswers as Record<number, unknown>);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load paper");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [paperIdNum]);

  const autoSave = useCallback(
    (exerciseId: number, answer: unknown) => {
      if (!attempt) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveAnswer({ paperId: paperIdNum, attemptId: attempt.id, exerciseId, answer }).catch(console.error);
      }, 2000);
    },
    [attempt, paperIdNum]
  );

  const currentExercise = exercises[currentIndex];

  const answeredSet = useMemo(() => {
    const set = new Set<number>();
    for (const [key, val] of Object.entries(answers)) {
      const idx = exercises.findIndex(e => e.id === Number(key));
      if (idx !== -1 && val !== undefined && val !== null && (typeof val !== "string" || val.trim() !== "")) {
        set.add(idx);
      }
    }
    return set;
  }, [answers, exercises]);

  const handleAnswerChange = useCallback(
    (exerciseId: number, answer: unknown) => {
      setAnswers(prev => ({ ...prev, [exerciseId]: answer }));
      autoSave(exerciseId, answer);
    },
    [autoSave]
  );

  const handleSubmit = useCallback(async () => {
    if (!attempt) return;
    setSubmitting(true);
    try {
      const result = await submitAttempt({ paperId: paperIdNum, attemptId: attempt.id });
      router.push(`/past-papers/${paperId}/attempts/${result.attemptId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }, [attempt, paperIdNum, router]);

  const handleTimeout = useCallback(async () => {
    if (!attempt || attempt.status !== "in_progress") return;
    try {
      await submitAttempt({ paperId: paperIdNum, attemptId: attempt.id });
    } catch {
      // silent catch — redirect anyway
    }
    router.push(`/past-papers/${paperId}/attempts/${attempt.id}`);
  }, [attempt, paperIdNum, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  if (error || !attempt || exercises.length === 0) {
    return (
      <ErrorState
        title="Cannot load paper"
        description={error ?? "No exercises found for this paper"}
        action={
          <Button variant="secondary" size="sm" onClick={() => router.push("/past-papers")}>
            Back to Papers
          </Button>
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface-primary">
      {/* Header bar */}
      <div className="sticky top-0 z-30 border-b border-border-primary bg-surface-primary/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-display text-lg font-bold text-text-primary">Past Paper</h1>
            <p className="text-xs text-text-secondary">Question {currentIndex + 1} of {exercises.length}</p>
          </div>

          <div className="flex items-center gap-3">
            <ExamTimer
              timeLimitSeconds={attempt.timeLimitSeconds}
              startedAt={attempt.startedAt}
              onTimeout={handleTimeout}
            />
            <Badge variant={attempt.status === "in_progress" ? "primary" : "default"} size="sm">
              {attempt.status === "in_progress" ? "In Progress" : attempt.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6">
          <Card className="p-4">
            <QuestionNavigator
              totalQuestions={exercises.length}
              answeredQuestions={answeredSet}
              currentIndex={currentIndex}
              onNavigate={setCurrentIndex}
            />
          </Card>
        </div>

        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {currentExercise && (
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Badge variant="primary" size="sm">Q{currentIndex + 1}</Badge>
                <Badge variant="default" size="sm">{currentExercise.type.replace(/_/g, " ")}</Badge>
                {currentExercise.marks != null && (
                  <Badge variant="outline" size="sm">{currentExercise.marks} marks</Badge>
                )}
              </div>

              <div className="mb-6 text-base text-text-primary font-medium">
                {currentExercise.question}
              </div>

              {currentExercise.type === "mcq" && currentExercise.options && (
                <MCQOptionGroup
                  options={currentExercise.options}
                  selectedOption={answers[currentExercise.id] as string ?? null}
                  onChange={(key) => handleAnswerChange(currentExercise.id, key)}
                />
              )}

              {currentExercise.type === "fill_in_blanks" && (
                <FillBlanksInput
                  statements={currentExercise.statements}
                  blanksAnswer={currentExercise.blanksAnswer}
                  onChange={(vals) => handleAnswerChange(currentExercise.id, vals)}
                />
              )}

              {(currentExercise.type === "short" || currentExercise.type === "long") && (
                <AnswerEditor
                  value={answers[currentExercise.id] as string ?? ""}
                  onChange={(val) => handleAnswerChange(currentExercise.id, val)}
                  exerciseType={currentExercise.type}
                />
              )}

              {currentExercise.type === "numerical" && (
                <input
                  type="text"
                  className="w-full rounded-lg border border-border-primary bg-surface-secondary p-4 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                  placeholder="Enter your numerical answer..."
                  value={answers[currentExercise.id] as string ?? ""}
                  onChange={(e) => handleAnswerChange(currentExercise.id, e.target.value)}
                />
              )}
            </Card>
          )}
        </motion.div>

        {/* Navigation buttons */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            iconLeft={<ChevronLeft className="h-4 w-4" />}
          >
            Previous
          </Button>

          <div className="flex items-center gap-3">
            {currentIndex < exercises.length - 1 ? (
              <Button
                size="sm"
                onClick={() => setCurrentIndex(i => Math.min(exercises.length - 1, i + 1))}
                iconRight={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                onClick={handleSubmit}
                loading={submitting}
                iconRight={submitting ? undefined : <Send className="h-4 w-4" />}
              >
                Submit Paper
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
