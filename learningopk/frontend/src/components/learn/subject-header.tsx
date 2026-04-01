"use client";

import { motion } from "framer-motion";
import { BookOpen, GraduationCap } from "lucide-react";

import { SubjectBadge } from "@/components/common/subject-badge";
import { BoardBadge } from "@/components/common/board-badge";
import { ProgressRing } from "@/components/common/progress-ring";
import type { SubjectResponse } from "@/lib/learn-api";
import { cn } from "@/lib/utils";

type SubjectHeaderProps = {
  board: SubjectResponse["board"];
  className: SubjectResponse["class"]["name"];
  subject: SubjectResponse["subject"];
  chapterCount?: number;
  completionPercent?: number;
};

export function SubjectHeader({
  board,
  className,
  subject,
  chapterCount,
  completionPercent = 0,
}: SubjectHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "border border-border-default",
        "bg-bg-surface",
        "p-6 sm:p-8 lg:p-10"
      )}
    >
      {/* Decorative background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Gradient accent wash */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent-success/6 blur-3xl" />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: subject info */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <BoardBadge board={board.slug} size="md" />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-bg-subtle px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
              <GraduationCap className="h-3 w-3" aria-hidden />
              Class {className}
            </span>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <SubjectBadge name={subject.name} size="lg" />
            </div>
            <h1 className="font-[var(--font-display)] text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-[2.75rem]">
              {subject.name}
            </h1>
          </div>

          {/* Description */}
          <p className="max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
            {subject.description.trim().length > 0
              ? subject.description
              : "Study chapter summaries, solve exercises, review flashcards, and practice quizzes."}
          </p>

          {/* Stats row */}
          {chapterCount !== undefined && (
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <BookOpen className="h-4 w-4 text-accent-primary" aria-hidden />
                <span className="font-medium">
                  {chapterCount} {chapterCount === 1 ? "chapter" : "chapters"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: progress ring */}
        {completionPercent > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="shrink-0 self-center sm:self-start"
          >
            <ProgressRing
              percentage={completionPercent}
              size={88}
              strokeWidth={7}
            />
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}
