"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Flame, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChapterDetailResponse } from "@/lib/learn-api";
import { XP_REWARDS } from "@/lib/gamification-types";

type Exercise = ChapterDetailResponse["exercises"][number];

interface QuestExercisesViewProps {
  exercises: Exercise[];
  completedIds: number[];
  onMarkComplete: (exerciseId: number, difficulty: "easy" | "medium" | "hard") => void;
}

const DIFFICULTY_CONFIG = {
  easy: { label: "Easy", color: "bg-emerald-500/10 text-emerald-600", xp: XP_REWARDS.EXERCISE_COMPLETE },
  medium: { label: "Medium", color: "bg-amber-500/10 text-amber-600", xp: XP_REWARDS.EXERCISE_MEDIUM },
  hard: { label: "Hard", color: "bg-orange-500/10 text-orange-600", xp: XP_REWARDS.EXERCISE_HARD },
};

export function QuestExercisesView({
  exercises,
  completedIds,
  onMarkComplete,
}: QuestExercisesViewProps) {
  const completedCount = completedIds.length;
  const totalCount = exercises.length;
  const allCompleted = completedCount >= totalCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
            <Flame className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Training Ground</p>
            <p className="font-semibold">
              {completedCount}/{totalCount} completed
            </p>
          </div>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400"
        />
      </div>

      <div className="space-y-4">
        {exercises.map((exercise, index) => {
          const isComplete = completedIds.includes(exercise.id);
          const difficulty = (exercise.difficulty?.toLowerCase() ?? "easy") as "easy" | "medium" | "hard";
          const config = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.easy;

          return (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "rounded-xl border p-4 transition-all",
                isComplete
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </span>
                    <Badge className={config.color}>{config.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      +{config.xp} XP
                    </span>
                  </div>
                  
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm">{exercise.question}</p>
                  </div>
                  
                  {exercise.solution && (
                    <div className="mt-3 rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-muted-foreground">
                        Answer: {exercise.solution}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  {isComplete ? (
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-sm font-medium text-white">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Solved!</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onMarkComplete(exercise.id, difficulty)}
                    >
                      Mark Solved
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {allCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-amber-500/10 p-8 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-amber-400">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold">Training Complete!</p>
            <p className="text-muted-foreground">
              You've conquered all exercises!
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-lg font-bold text-primary-foreground">
            <Sparkles className="h-5 w-5" />
            <span>+{XP_REWARDS.EXERCISE_BONUS_ALL} XP Bonus!</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}