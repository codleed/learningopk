"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Share2, RotateCcw, Sparkles, Check, X, Minus, Swords } from "lucide-react";

import type { QuizResult } from "./quiz-runner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/common/progress-ring";
import { ShareableResultCard } from "./shareable-result-card";

type QuizResultSummaryProps = {
  result: QuizResult;
  onRetake: () => void;
  subjectName?: string;
  chapterNumber?: number;
  chapterTitle?: string;
  onCreateChallenge?: () => Promise<string | null>;
};

export function QuizResultSummary({ result, onRetake, subjectName, chapterNumber, chapterTitle, onCreateChallenge }: QuizResultSummaryProps) {
  const passed = result.percentage >= 70;
  const reduced = useReducedMotion();
  const [showShareCard, setShowShareCard] = useState(false);
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
  const [challengeMessage, setChallengeMessage] = useState<string | null>(null);

  const displaySubjectName = subjectName || "Quiz";

  const correctCount = result.questionResults.filter((q) => q.isCorrect).length;
  const incorrectCount = result.questionResults.filter((q) => !q.isCorrect && q.selectedOption !== null).length;
  const skippedCount = result.questionResults.filter((q) => q.selectedOption === null).length;

  const ringColor = passed ? "var(--accent-success)" : "var(--accent-warning)";

  return (
    <div className="space-y-5">
      {/* Main result card */}
      <Card variant="elevated" className="overflow-hidden">
        {/* Top gradient strip */}
        <div
          className="h-1.5"
          style={{
            background: passed
              ? "linear-gradient(90deg, var(--accent-success), var(--accent-primary))"
              : "linear-gradient(90deg, var(--accent-warning), var(--accent-danger))",
          }}
        />

        <div className="p-6">
          {result.duel ? (
            <div className="mb-6 rounded-2xl border border-accent-primary/20 bg-gradient-to-r from-accent-primary/5 via-bg-surface to-accent-warning-light p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                  <Swords className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Quiz Duel</p>
                  <p className="text-xs text-text-secondary">Both scores, side-by-side</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[result.duel.challenger, result.duel.recipient].filter(Boolean).map((player) => (
                  <div key={`${player!.userId}-${player!.completedAt}`} className="rounded-xl border border-border-default bg-bg-surface/90 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{player!.name}</p>
                        <p className="text-xs text-text-secondary">{player!.isCurrentUser ? "You" : "Friend"}</p>
                      </div>
                      <Badge variant={player!.isCurrentUser ? "primary" : "default"} size="sm">{player!.percentage}%</Badge>
                    </div>
                    <p className="mt-3 font-display text-2xl font-bold text-text-primary">
                      {player!.score} <span className="text-sm font-medium text-text-secondary">/ {player!.totalMarks}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            {/* Large progress ring */}
            <div className="flex flex-col items-center gap-2">
              <ProgressRing
                percentage={result.percentage}
                size={120}
                strokeWidth={8}
                color={ringColor}
              />
              <Badge
                variant={passed ? "success" : "warning"}
                size="lg"
              >
                {passed ? "Passed" : "Needs Review"}
              </Badge>
            </div>

            {/* Score details */}
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Your Score
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-text-primary">
                {result.score} <span className="text-lg text-text-secondary">/ {result.totalMarks}</span>
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {result.percentage}% in {Math.max(1, Math.ceil(result.timeSpentSeconds / 60))} minute{Math.ceil(result.timeSpentSeconds / 60) !== 1 ? "s" : ""}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                Submitted {new Date(result.completedAt).toLocaleString()}
              </p>

              {/* XP badge with pop animation */}
              <motion.div
                initial={reduced ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={reduced ? { duration: 0 } : { delay: 0.5, type: "spring", stiffness: 400, damping: 15 }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent-warning-light px-3 py-1"
              >
                <Sparkles className="h-3.5 w-3.5 text-accent-warning" />
                <span className="text-sm font-bold text-accent-warning">
                  +{Math.round(result.score * 10)} XP
                </span>
              </motion.div>
            </div>
          </div>

          {/* Stat boxes */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduced ? { duration: 0 } : { delay: 0.2 }}
              className="flex flex-col items-center gap-1 rounded-xl border border-accent-success/20 bg-accent-success-light p-3"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-success text-white">
                <Check className="h-3.5 w-3.5" />
              </div>
              <span className="font-display text-xl font-bold text-accent-success">{correctCount}</span>
              <span className="text-[11px] font-medium text-accent-success">Correct</span>
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduced ? { duration: 0 } : { delay: 0.3 }}
              className="flex flex-col items-center gap-1 rounded-xl border border-accent-danger/20 bg-accent-danger-light p-3"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-danger text-white">
                <X className="h-3.5 w-3.5" />
              </div>
              <span className="font-display text-xl font-bold text-accent-danger">{incorrectCount}</span>
              <span className="text-[11px] font-medium text-accent-danger">Incorrect</span>
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduced ? { duration: 0 } : { delay: 0.4 }}
              className="flex flex-col items-center gap-1 rounded-xl border border-accent-warning/20 bg-accent-warning-light p-3"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-warning text-white">
                <Minus className="h-3.5 w-3.5" />
              </div>
              <span className="font-display text-xl font-bold text-accent-warning">{skippedCount}</span>
              <span className="text-[11px] font-medium text-accent-warning">Skipped</span>
            </motion.div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={onRetake}
              iconLeft={<RotateCcw />}
            >
              Try Again
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowShareCard(!showShareCard)}
              iconLeft={<Share2 />}
            >
              {showShareCard ? "Hide Share Card" : "Share Result"}
            </Button>
            {onCreateChallenge ? (
              <Button
                type="button"
                variant="outline"
                loading={isCreatingChallenge}
                onClick={async () => {
                  try {
                    setIsCreatingChallenge(true);
                    setChallengeMessage(null);
                    const url = await onCreateChallenge();
                    setChallengeMessage(url ? "Challenge link copied to clipboard." : "Unable to create challenge link.");
                  } catch (error) {
                    setChallengeMessage(error instanceof Error ? error.message : "Unable to create challenge link.");
                  } finally {
                    setIsCreatingChallenge(false);
                  }
                }}
                iconLeft={<Swords />}
              >
                Challenge a friend
              </Button>
            ) : null}
          </div>
          {challengeMessage ? <p className="mt-3 text-center text-sm text-text-secondary">{challengeMessage}</p> : null}
        </div>
      </Card>

      {/* Shareable result card */}
      {showShareCard && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.3 }}
          className="flex justify-center"
        >
          <ShareableResultCard
            result={result}
            subjectName={displaySubjectName}
            chapterNumber={chapterNumber}
            chapterTitle={chapterTitle}
          />
        </motion.div>
      )}
    </div>
  );
}
