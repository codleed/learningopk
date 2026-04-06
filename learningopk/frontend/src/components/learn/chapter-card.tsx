"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { SubjectResponse } from "@/lib/learn-api";
import { cn } from "@/lib/utils";

type Chapter = SubjectResponse["chapters"][number];

type ChapterCardProps = {
  chapter: Chapter;
  href: string;
  index?: number;
};

export function ChapterCard({ chapter, href, index = 0 }: ChapterCardProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : {
              delay: Math.min(index * 0.04, 0.4),
              duration: 0.35,
              ease: [0.23, 1, 0.32, 1],
            }
      }
    >
      <Link
        href={href}
        className={cn(
          "group relative flex items-center gap-4 rounded-xl",
          "border border-border-default bg-bg-surface",
          "p-4 sm:p-5",
          "transition-all duration-200 ease-out",
          "hover:-translate-y-0.5 hover:border-accent-primary/30 hover:shadow-[var(--shadow-card)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2"
        )}
      >
        {/* Chapter number pill */}
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
            "bg-accent-primary/10 font-[var(--font-mono)] text-sm font-bold text-accent-primary",
            "transition-colors duration-200",
            "group-hover:bg-accent-primary group-hover:text-white"
          )}
        >
          {String(chapter.chapterNumber).padStart(2, "0")}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-[var(--font-mono)] text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-text-muted">
                Chapter {chapter.chapterNumber}
              </p>
              <h3 className="mt-0.5 truncate font-[var(--font-display)] text-base font-semibold leading-snug text-text-primary sm:text-lg">
                {chapter.title}
              </h3>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Badge
                variant={chapter.isPublished ? "success" : "warning"}
                size="sm"
              >
                {chapter.isPublished ? "Published" : "Draft"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Arrow indicator */}
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-text-muted",
            "transition-transform duration-200",
            "group-hover:translate-x-0.5 group-hover:text-accent-primary"
          )}
          aria-hidden
        />
      </Link>
    </motion.div>
  );
}
