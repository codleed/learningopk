"use client";

import { BookOpen, Dumbbell, Layers, HelpCircle, Check } from "lucide-react";
import { motion } from "framer-motion";
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

const TAB_ICONS: Record<string, React.ReactNode> = {
  summary: <BookOpen className="h-4 w-4" />,
  exercises: <Dumbbell className="h-4 w-4" />,
  flashcards: <Layers className="h-4 w-4" />,
  quiz: <HelpCircle className="h-4 w-4" />,
};

const TAB_LABELS: Record<string, string> = {
  summary: "Study",
  exercises: "Training",
  flashcards: "Memory",
  quiz: "Challenge",
};

export function QuestTabBar({ activeTab, baseHref, status }: QuestTabBarProps) {
  const tabs: Array<{ key: ChapterTab; label: string }> = [
    { key: "summary", label: "Study" },
    { key: "exercises", label: "Training" },
    { key: "flashcards", label: "Memory" },
    { key: "quiz", label: "Challenge" },
  ];

  const getTabStatus = (key: string) => {
    switch (key) {
      case "summary":
        return status.summary;
      case "exercises":
        return status.exercises >= status.totalExercises;
      case "flashcards":
        return status.flashcards >= status.totalFlashcards;
      case "quiz":
        return status.quizCompleted;
      default:
        return false;
    }
  };

  const getTabProgress = (key: string) => {
    switch (key) {
      case "exercises":
        return `${status.exercises}/${status.totalExercises}`;
      case "flashcards":
        return `${status.flashcards}/${status.totalFlashcards}`;
      default:
        return null;
    }
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        const isComplete = getTabStatus(tab.key);
        const progress = getTabProgress(tab.key);
        const icon = TAB_ICONS[tab.key];

        return (
          <Link
            key={tab.key}
            href={`${baseHref}?tab=${tab.key}`}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
              "whitespace-nowrap",
              isActive
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span className="relative">
              {icon}
              {isComplete && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500"
                >
                  <Check className="h-2 w-2 text-white" />
                </motion.span>
              )}
            </span>
            
            <span>{TAB_LABELS[tab.key] ?? tab.label}</span>
            
            {progress && (
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs",
                isActive ? "bg-primary-foreground/20" : "bg-muted"
              )}>
                {progress}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}