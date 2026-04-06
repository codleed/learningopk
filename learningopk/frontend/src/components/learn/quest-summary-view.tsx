"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "./markdown-content";

interface QuestSummaryViewProps {
  summary: string;
  chapterId: number;
  isRead: boolean;
  onMarkRead: () => void;
}

export function QuestSummaryView({
  summary,
  isRead,
  onMarkRead,
}: QuestSummaryViewProps) {
  const estimatedReadTime = Math.max(1, Math.ceil(summary.length / 1000));
  const reduced = useReducedMotion();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Clock className="h-4 w-4" />
          <span>~{estimatedReadTime} min read</span>
        </div>
        
        {isRead && (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Completed</span>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border-default/50 bg-bg-surface p-6">
        <MarkdownContent content={summary} />
      </div>

      {!isRead && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : undefined}
          className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-accent-primary/30 bg-accent-primary/5 p-6 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/10">
            <Sparkles className="h-6 w-6 text-accent-primary" />
          </div>
          
          <div>
            <p className="font-semibold text-text-primary">Finished reading?</p>
            <p className="text-sm text-text-secondary">
              Mark as complete to earn +10 XP
            </p>
          </div>
          
          <Button onClick={onMarkRead} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            I&apos;ve Read This
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              +10 XP
            </span>
          </Button>
        </motion.div>
      )}
    </div>
  );
}
