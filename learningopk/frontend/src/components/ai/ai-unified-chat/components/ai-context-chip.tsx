'use client';

import { BookOpen, HelpCircle, Layers, FileQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIContext } from '../types';

type AIContextChipProps = {
  context: AIContext;
  className?: string;
};

const tabIcons = {
  summary: BookOpen,
  exercises: HelpCircle,
  flashcards: Layers,
  quiz: FileQuestion,
} as const;

const tabLabels = {
  summary: 'Summary',
  exercises: 'Exercises',
  flashcards: 'Flashcards',
  quiz: 'Quiz',
} as const;

export function AIContextChip({ context, className }: AIContextChipProps) {
  const TabIcon = tabIcons[context.currentTab];
  
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5',
        'px-3 py-1',
        'rounded-full',
        'bg-primary/10 border border-primary/25',
        'text-xs font-medium text-primary',
        className
      )}
    >
      <TabIcon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="truncate max-w-[200px]">
        {context.chapterTitle || `Chapter ${context.chapterNumber}`}
      </span>
      <span className="text-primary/60">·</span>
      <span>{tabLabels[context.currentTab]}</span>
    </div>
  );
}
