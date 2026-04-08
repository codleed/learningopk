"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { StudyCardArt } from "@/components/common/study-card-art";
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
          "group relative block overflow-hidden rounded-[1.5rem]",
          "border border-border-default bg-bg-surface",
          "transition-all duration-200 ease-out",
          "hover:-translate-y-0.5 hover:border-accent-primary/30 hover:shadow-[var(--shadow-card)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2"
        )}
      >
        <div className="grid gap-0 sm:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <div className="p-3 sm:p-4">
            {chapter.coverImageUrl ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                <Image
                  src={chapter.coverImageUrl}
                  alt={`Cover image for ${chapter.title}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 40vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ) : (
              <StudyCardArt
                subject="Science"
                title={chapter.title}
                chapterNumber={chapter.chapterNumber}
                index={index}
                variant="chapter"
              />
            )}
          </div>

          <div className="flex min-w-0 flex-col justify-between p-4 pt-1 sm:p-5 sm:pl-1">
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-[var(--font-mono)] text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-text-muted">
                  Chapter {String(chapter.chapterNumber).padStart(2, "0")}
                </p>

                <Badge
                  variant={chapter.isPublished ? "success" : "warning"}
                  size="sm"
                >
                  {chapter.isPublished ? "Published" : "Draft"}
                </Badge>
              </div>

              <h3 className="mt-3 line-clamp-2 font-[var(--font-display)] text-lg font-semibold leading-tight text-text-primary sm:text-[1.35rem]">
                {chapter.title}
              </h3>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-base px-2.5 py-1">
                  <FileText className="h-3.5 w-3.5 text-accent-primary" aria-hidden />
                  Study notes, quizzes, and review
                </span>
                {chapter.isPublished ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-base px-2.5 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent-success" aria-hidden />
                    Ready to open
                  </span>
                ) : null}
              </div>


            </div>

            <div className="mt-5 flex items-center justify-between border-t border-border-default/70 pt-4">
              <div>
                <p className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-text-muted">
                  Next step
                </p>
                <p className="mt-1 text-sm font-medium text-text-primary">
                  Open chapter workspace
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-primary transition-transform duration-200 group-hover:translate-x-0.5">
                Start
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
