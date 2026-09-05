"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Dumbbell, HelpCircle, Atom, Check, NotebookPen } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { useChapter } from "./chapter-context";
import type { ChapterTab } from "./chapter-context";

interface TabStatus {
  summary: boolean;
  quickRevision: boolean;
  exercises: number;
  totalExercises: number;
  quizCompleted: boolean;
  illustrations: number;
  totalIllustrations: number;
}

interface QuestTabBarProps {
  status: TabStatus;
}

const TAB_CONFIG: Array<{
  key: ChapterTab;
  label: string;
  icon: typeof BookOpen;
}> = [
  { key: "summary", label: "Study", icon: BookOpen },
  { key: "quick-revision", label: "Quick Revision", icon: NotebookPen },
  { key: "exercises", label: "Training", icon: Dumbbell },
  { key: "quiz", label: "Challenge", icon: HelpCircle },
  { key: "illustration", label: "Illustration", icon: Atom },
];

export function QuestTabBar({ status }: QuestTabBarProps) {
  const { activeTab, boardSlug, classSlug, subjectSlug, chapterSlug } = useChapter();
  const baseHref = useMemo(
    () => `/${boardSlug}/${classSlug}/${subjectSlug}/${chapterSlug}`,
    [boardSlug, classSlug, subjectSlug, chapterSlug]
  );

  // ── Refs ──
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<ChapterTab, HTMLAnchorElement>>(new Map());

  // ── Scroll overflow state ──
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const tolerance = 2; // account for sub-pixel rounding
    setCanScrollLeft(el.scrollLeft > tolerance);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - tolerance);
  }, []);

  // Track scroll position for gradient indicators
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Initial check
    updateScrollIndicators();

    el.addEventListener("scroll", updateScrollIndicators, { passive: true });
    window.addEventListener("resize", updateScrollIndicators);

    return () => {
      el.removeEventListener("scroll", updateScrollIndicators);
      window.removeEventListener("resize", updateScrollIndicators);
    };
  }, [updateScrollIndicators]);

  // Auto-scroll active tab into view
  useEffect(() => {
    const activeEl = tabRefs.current.get(activeTab);
    if (activeEl) {
      // Small delay to let layout settle after tab change
      requestAnimationFrame(() => {
        activeEl.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      });
    }
  }, [activeTab]);

  const reduced = useReducedMotion();

  const setTabRef = useCallback(
    (key: ChapterTab) => (el: HTMLAnchorElement | null) => {
      if (el) {
        tabRefs.current.set(key, el);
      } else {
        tabRefs.current.delete(key);
      }
    },
    []
  );

  const getTabCompleted = (key: ChapterTab): boolean => {
    switch (key) {
      case "summary":
        return status.summary;
      case "quick-revision":
        return status.quickRevision;
      case "exercises":
        return status.totalExercises > 0 && status.exercises >= status.totalExercises;
      case "quiz":
        return status.quizCompleted;
      case "illustration":
        return status.totalIllustrations > 0 && status.illustrations >= status.totalIllustrations;
      default:
        return false;
    }
  };

  const getTabProgress = (key: ChapterTab): string | null => {
    switch (key) {
      case "exercises":
        return status.totalExercises > 0 ? `${status.exercises}/${status.totalExercises}` : null;
      case "illustration":
        return status.totalIllustrations > 0
          ? `${status.illustrations}/${status.totalIllustrations}`
          : null;
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {/* Left gradient fade indicator */}
      <div
        className={cn(
          "pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-8",
          "bg-gradient-to-r from-bg-base to-transparent",
          "transition-opacity duration-200",
          canScrollLeft ? "opacity-100" : "opacity-0"
        )}
        aria-hidden
      />

      {/* Right gradient fade indicator */}
      <div
        className={cn(
          "pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-8",
          "bg-gradient-to-l from-bg-base to-transparent",
          "transition-opacity duration-200",
          canScrollRight ? "opacity-100" : "opacity-0"
        )}
        aria-hidden
      />

      {/* Scrollable tab container */}
      <nav
        ref={scrollRef}
        className={cn(
          "flex gap-1.5 overflow-x-auto pb-1 sm:pb-0",
          // Hide scrollbar across browsers
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
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
              ref={setTabRef(tab.key)}
              href={`${baseHref}?tab=${tab.key}`}
              className={cn(
                "relative flex items-center gap-2 rounded-lg px-3.5 text-sm font-medium",
                // Ensure 44px minimum touch target height
                "min-h-[44px] py-2.5",
                "whitespace-nowrap transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40",
                isActive
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-secondary hover:bg-bg-subtle"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active indicator background */}
              {isActive &&
                (reduced ? (
                  <span
                    className="absolute inset-0 rounded-lg bg-bg-surface shadow-[var(--shadow-sm)] border border-border-default"
                    style={{ zIndex: -1 }}
                  />
                ) : (
                  <motion.span
                    layoutId="quest-tab-active"
                    className="absolute inset-0 rounded-lg bg-bg-surface shadow-[var(--shadow-sm)] border border-border-default"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    style={{ zIndex: -1 }}
                  />
                ))}

              {/* Icon with completion badge */}
              <span className="relative">
                <Icon className="h-4 w-4" aria-hidden />
                {reduced ? (
                  isComplete && (
                    <span
                      className={cn(
                        "absolute -right-1.5 -top-1.5",
                        "flex h-3.5 w-3.5 items-center justify-center rounded-full",
                        "bg-accent-success"
                      )}
                    >
                      <Check className="h-2 w-2 text-white" strokeWidth={3} />
                    </span>
                  )
                ) : (
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
                )}
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
    </div>
  );
}
