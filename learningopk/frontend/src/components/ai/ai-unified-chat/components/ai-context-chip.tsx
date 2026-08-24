"use client";

import { Atom, BookOpen, HelpCircle, Layers, FileQuestion, NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIContext } from "../types";

type AIContextChipProps = {
  context: AIContext;
  className?: string;
};

const tabIcons = {
  summary: BookOpen,
  "quick-revision": NotebookPen,
  exercises: HelpCircle,
  flashcards: Layers,
  quiz: FileQuestion,
  illustration: Atom,
} as const;

const tabLabels = {
  summary: "Summary",
  "quick-revision": "Quick Revision",
  exercises: "Exercises",
  flashcards: "Flashcards",
  quiz: "Quiz",
  illustration: "Illustration",
} as const;

export function AIContextChip({ context, className }: AIContextChipProps) {
  const TabIcon = tabIcons[context.currentTab];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5",
        "px-3 py-1",
        "rounded-full",
        "bg-accent-primary/10 border border-accent-primary/25",
        "text-xs font-medium text-accent-primary",
        className
      )}
    >
      <TabIcon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="truncate max-w-[200px]">
        {context.chapterTitle || `Chapter ${context.chapterNumber}`}
      </span>
      <span className="text-accent-primary/60">·</span>
      <span>{tabLabels[context.currentTab]}</span>
    </div>
  );
}
