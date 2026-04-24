"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  NotebookPen,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "./markdown-content";
import { AddToNotesDialog } from "@/components/notes/add-to-notes-dialog";

interface QuestSummaryViewProps {
  summary: string;
  subparts: Array<{
    id: number;
    chapterId: number;
    orderIndex: number;
    heading: string;
    content: string;
  }>;
  chapterId: number;
  isRead: boolean;
  onMarkRead: (subpartId?: number) => void;
}

export function QuestSummaryView({
  summary,
  subparts,
  chapterId,
  isRead,
  onMarkRead,
}: QuestSummaryViewProps) {
  const reduced = useReducedMotion();
  const orderedSubparts = useMemo(
    () => [...subparts].sort((left, right) => left.orderIndex - right.orderIndex || left.id - right.id),
    [subparts]
  );
  const hasSubparts = orderedSubparts.length > 0;
  const totalParts = hasSubparts ? orderedSubparts.length : 1;

  const [activeIndex, setActiveIndex] = useState(0);
  const currentIndex = Math.max(0, Math.min(activeIndex, totalParts - 1));

  const activeSubpart = hasSubparts ? orderedSubparts[currentIndex] : null;
  const activeHeading = activeSubpart?.heading ?? "Chapter Summary";
  const activeContent = activeSubpart?.content?.trim().length ? activeSubpart.content : summary;
  const readingText = hasSubparts
    ? orderedSubparts.map((part) => `${part.heading}\n${part.content}`).join("\n")
    : summary;
  const estimatedReadTime = Math.max(1, Math.ceil(readingText.length / 1000));
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalParts - 1;
  const isLastPart = currentIndex >= totalParts - 1;
  const progressPercent = (currentIndex + 1) / totalParts * 100;

  const summaryViewRef = useRef<HTMLDivElement>(null);

  // Text selection "Add to Notes" feature
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [showFloatingBtn, setShowFloatingBtn] = useState(false);
  const [floatingPos, setFloatingPos] = useState({ top: 0, left: 0 });
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);

  const goToSubpart = useCallback(
    (nextIndex: number) => {
      if (!hasSubparts || nextIndex < 0 || nextIndex >= orderedSubparts.length) {
        return;
      }
      setActiveIndex(nextIndex);
      setShowFloatingBtn(false);
    },
    [hasSubparts, orderedSubparts.length]
  );

  const goToPrevious = useCallback(() => {
    if (canGoPrev) {
      goToSubpart(currentIndex - 1);
    }
  }, [canGoPrev, currentIndex, goToSubpart]);

  const goToNext = useCallback(() => {
    if (canGoNext) {
      goToSubpart(currentIndex + 1);
    }
  }, [canGoNext, currentIndex, goToSubpart]);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";

    if (text.length > 5 && contentRef.current?.contains(selection?.anchorNode ?? null)) {
      setSelectedText(text);

      const range = selection?.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        const containerRect = contentRef.current.getBoundingClientRect();
        setFloatingPos({
          top: rect.top - containerRect.top - 40,
          left: rect.left - containerRect.left + rect.width / 2,
        });
        setShowFloatingBtn(true);
      }
    } else {
      setShowFloatingBtn(false);
    }
  }, []);

  const handleAddToNotes = useCallback(() => {
    setShowFloatingBtn(false);
    setNotesDialogOpen(true);
  }, []);

  useEffect(() => {
    if (!hasSubparts || totalParts < 2) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const targetElement = event.target as HTMLElement | null;
      if (!summaryViewRef.current?.contains(targetElement)) {
        return;
      }

      if (targetElement?.closest("input, textarea, [contenteditable='true']")) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        goToNext();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        goToPrevious();
      } else if (event.key === "Home") {
        event.preventDefault();
        goToSubpart(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goToSubpart(totalParts - 1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, goToSubpart, hasSubparts, totalParts]);

  // Hide floating btn on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      // Small delay to allow button click to register
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection?.toString().trim()) {
          setShowFloatingBtn(false);
        }
      }, 100);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Track previous subpart to mark as read when navigating away
  const prevSubpartIdRef = useRef<number | null>(null);

  useEffect(() => {
    const currentSubpartId = activeSubpart?.id ?? null;

    // If we have a previous subpart and we're now on a different one, mark the previous as read
    if (prevSubpartIdRef.current !== null && prevSubpartIdRef.current !== currentSubpartId) {
      onMarkRead(prevSubpartIdRef.current);
    }

    // Update the ref to track the current subpart
    prevSubpartIdRef.current = currentSubpartId;

    // On unmount, mark the last viewed subpart as read
    return () => {
      if (prevSubpartIdRef.current !== null) {
        onMarkRead(prevSubpartIdRef.current);
      }
    };
  }, [activeSubpart?.id, onMarkRead]);

  return (
    <div ref={summaryViewRef} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Clock className="h-4 w-4" />
          <span>~{estimatedReadTime} min read</span>
        </div>

        <div className="flex items-center gap-2">
          {totalParts > 1 ? (
            <span className="font-[var(--font-mono)] text-[0.625rem] uppercase tracking-[0.08em] text-text-muted">
              Part {currentIndex + 1}/{totalParts}
            </span>
          ) : null}

          {isRead ? (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Completed</span>
            </div>
          ) : null}
        </div>
      </div>

      {hasSubparts ? (
        <div className="space-y-3 rounded-2xl border border-border-default/50 bg-bg-surface p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-[var(--font-mono)] text-[0.625rem] uppercase tracking-[0.08em] text-text-muted">
                Summary Quest
              </p>
              <p className="truncate text-sm font-medium text-text-primary">{activeHeading}</p>
            </div>

            {totalParts > 1 ? (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  shape="square"
                  variant="secondary"
                  onClick={goToPrevious}
                  disabled={!canGoPrev}
                  aria-label="Go to previous subpart"
                  iconLeft={<ChevronLeft />}
                />
                <Button
                  size="sm"
                  shape="square"
                  variant="secondary"
                  onClick={goToNext}
                  disabled={!canGoNext}
                  aria-label="Go to next subpart"
                  iconLeft={<ChevronRight />}
                />
              </div>
            ) : null}
          </div>

          {totalParts > 1 ? (
            <div
              role="tablist"
              aria-label="Chapter summary sections"
              aria-orientation="horizontal"
              className="flex gap-2 overflow-x-auto pb-1"
            >
              {orderedSubparts.map((part, index) => {
                const isActive = index === currentIndex;

                return (
                  <button
                    key={part.id}
                    id={`summary-subpart-tab-${part.id}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`summary-subpart-panel-${part.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => goToSubpart(index)}
                    className={[
                      "shrink-0 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2",
                      isActive
                        ? "border-accent-primary bg-accent-primary/10 text-text-primary"
                        : "border-border-default bg-bg-surface text-text-secondary hover:bg-bg-subtle",
                    ].join(" ")}
                  >
                    <p className="font-[var(--font-mono)] text-[0.625rem] uppercase tracking-[0.08em] text-text-muted">
                      Part {index + 1}
                    </p>
                    <p className="max-w-[12rem] truncate text-xs font-medium">{part.heading}</p>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle" aria-hidden>
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-info transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      <div
        ref={contentRef}
        className="relative rounded-2xl border border-border-default/50 bg-bg-surface p-6"
        onMouseUp={handleMouseUp}
      >
        {hasSubparts ? (
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-border-default/60 pb-3">
            <h3 className="truncate font-[var(--font-display)] text-base font-semibold text-text-primary">
              {activeHeading}
            </h3>
            <span className="font-[var(--font-mono)] text-[0.625rem] uppercase tracking-[0.08em] text-text-muted">
              Part {currentIndex + 1} of {totalParts}
            </span>
          </div>
        ) : null}

        <div
          id={activeSubpart ? `summary-subpart-panel-${activeSubpart.id}` : "summary-subpart-panel-fallback"}
          role={hasSubparts ? "tabpanel" : undefined}
          aria-labelledby={activeSubpart ? `summary-subpart-tab-${activeSubpart.id}` : undefined}
        >
          <MarkdownContent content={activeContent} />
        </div>

        {/* Floating "Add to Notes" button */}
        {showFloatingBtn && (
          <div
            className="absolute z-30 -translate-x-1/2 animate-in fade-in-0 zoom-in-95"
            style={{ top: floatingPos.top, left: floatingPos.left }}
          >
            <button
              type="button"
              onClick={handleAddToNotes}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-bg-elevated px-2.5 py-1.5 text-xs font-medium text-text-primary shadow-[var(--shadow-elevated)] transition-colors hover:bg-accent-primary hover:text-white"
            >
              <NotebookPen className="h-3 w-3" />
              Add to Notes
            </button>
          </div>
        )}
      </div>

      {totalParts > 1 ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border-default bg-bg-surface p-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={goToPrevious}
            disabled={!canGoPrev}
            iconLeft={<ChevronLeft />}
          >
            Previous
          </Button>

          <span
            className="font-[var(--font-mono)] text-[0.625rem] uppercase tracking-[0.08em] text-text-muted"
            aria-live="polite"
          >
            Part {currentIndex + 1} of {totalParts}
          </span>

          <Button
            size="sm"
            variant="secondary"
            onClick={goToNext}
            disabled={!canGoNext}
            iconRight={<ChevronRight />}
          >
            Next
          </Button>
        </div>
      ) : null}

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
              {isLastPart ? "Mark as complete to earn +10 XP" : "Keep going to finish all sections"}
            </p>
          </div>

          {isLastPart ? (
            <Button onClick={() => onMarkRead(activeSubpart?.id)} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              I&apos;ve Read This
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                +10 XP
              </span>
            </Button>
          ) : (
            <Button onClick={goToNext} className="gap-2" disabled={!canGoNext}>
              Continue to Next Part
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </motion.div>
      )}

      {/* Add to Notes Dialog */}
      <AddToNotesDialog
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        initialContent={selectedText}
        chapterId={chapterId}
        suggestedTitle="Summary Note"
      />
    </div>
  );
}
