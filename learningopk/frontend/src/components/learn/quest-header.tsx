"use client";

import { Star, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { ProgressRing } from "@/components/gamification/progress-ring";
import { StreakCounter } from "@/components/gamification/streak-counter";
import type { GamificationState } from "@/lib/gamification-types";

interface QuestHeaderProps {
  boardName: string;
  boardSlug: string;
  classSlug: string;
  subjectName: string;
  subjectSlug: string;
  chapterNumber: number;
  chapterTitle: string;
  gamificationState: GamificationState;
  streak: number;
  completionPercent: number;
}

export function QuestHeader({
  boardName,
  boardSlug,
  classSlug,
  subjectName,
  subjectSlug,
  chapterNumber,
  chapterTitle,
  gamificationState,
  streak,
  completionPercent,
}: QuestHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative">
        <div className="flex items-center justify-end mb-4">
          <StreakCounter streak={streak} />
        </div>

        <div className="flex items-start gap-6">
          <ProgressRing progress={completionPercent} size={80} strokeWidth={8} />
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                Quest {chapterNumber}
              </span>
              <span className="text-xs text-muted-foreground">
                {boardName} • Class {classSlug.replace("grade-", "")}
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {chapterTitle}
            </h1>
            
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                >
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                </motion.div>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {gamificationState.xp} XP
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-3 py-1.5">
                <Trophy className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  Level {gamificationState.level}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {completionPercent < 100 ? `${Math.round(100 - completionPercent)}% remaining to complete quest` : "Quest completed! Great job!"}
        </p>
      </div>
    </header>
  );
}
