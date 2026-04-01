"use client";

import { BookOpen, Dumbbell, Layers, HelpCircle, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

import { cn } from "@/lib/utils";

type ChapterTab = "summary" | "exercises" | "flashcards" | "quiz";

interface TabStatus {
  summary: boolean;
  exercises: number;
  totalExercises: number;
  flashcards: number;
  totalFlashcards: number;
  quizCompleted: boolean;
}

interface QuestTabBarProps {
  activeTab: ChapterTab;
  baseHref: string;
  status: TabStatus;
}

const TAB_CONFIG: Array<{
  key: ChapterTab;
  label: string;
  icon: typeof BookOpen;
}> = [
  { key: "summary", label: "Study", icon: BookOpen },
  { key: "exercises", label: "Training", icon: Dumbbell },
  { key: "flashcards", label: "Memory", icon: Layers },
  { key: "quiz", label: "Challenge", icon: HelpCircle },
];

export function QuestTabBar({ activeTab, baseHref, status }: QuestTabBarProps) {
  const getTabCompleted = (key: ChapterTab): boolean => {
    switch (key) {
      case "summary":
        return status.summary;
      case "exercises":
        return status.totalExercises > 0 && status.exercises >= status.totalExercises;
      case "flashcards":
        return status.totalFlashcards > 0 && status.flashcards >= status.totalFlashcards;
      case "quiz":
        return status.quizCompleted;
      default:
        return false;
    }
  };

  const getTabProgress = (key: ChapterTab): string | null => {
    switch (key) {
      case "exercises":
        return status.totalExercises > 0
          ? `${status.exercises}/${status.totalExercises}`
          : null;
      case "flashcards":
        return status.totalFlashcards > 0
          ? `${status.flashcards}/${status.totalFlashcards}`
          : null;
      default:
        return null;
    }
  };

  return (
    <nav
      className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0"
      aria-label="Chapter content tabs"
    >
      {TAB_CONFIG.map((tab) => {
        const isActive = tab.key === activeTab;
        const isComplete = getTabCompleted(tab.key);
        const progress = getTabProgress(tab.key);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.key}
            href={`${baseHref}?tab=${tab.key}`}
            className={cn(
              "relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium",
              "whitespace-nowrap transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40",
              isActive
                ? "text-text-primary"
                : "text-text-muted hover:text-text-secondary hover:bg-bg-subtle"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {/* Active indicator background */}
            {isActive && (
              <motion.span
                layoutId="quest-tab-active"
                className="absolute inset-0 rounded-lg bg-bg-surface shadow-[var(--shadow-sm)] border border-border-default"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{ zIndex: -1 }}
              />
            )}

            {/* Icon with completion badge */}
            <span className="relative">
              <Icon className="h-4 w-4" aria-hidden />
              <AnimatePresence>
                {isComplete && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className={cn(
                      "absolute -right-1.5 -top-1.5",
                      "flex h-3.5 w-3.5 items-center justify-center rounded-full",
                      "bg-accent-success"
                    )}
                  >
                    <Check className="h-2 w-2 text-white" strokeWidth={3} />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>

            <span>{tab.label}</span>

            {/* Progress count pill */}
            {progress && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-[var(--font-mono)] text-[0.625rem] font-semibold",
                  isActive
                    ? "bg-accent-primary/10 text-accent-primary"
                    : "bg-bg-subtle text-text-muted"
                )}
              >
                {progress}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
