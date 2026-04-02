"use client";

import { motion } from "framer-motion";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
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

      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <MarkdownContent content={summary} />
      </div>

      {!isRead && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          
          <div>
            <p className="font-semibold text-foreground">Finished reading?</p>
            <p className="text-sm text-muted-foreground">
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
