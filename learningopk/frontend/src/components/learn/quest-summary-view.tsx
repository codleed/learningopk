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
import { LinearProgress } from "@/components/ui/progress";
import { MarkdownContent } from "./markdown-content";
import { AddToNotesDialog } from "@/components/notes/add-to-notes-dialog";
import { splitMarkdownSections } from "@/lib/split-markdown-sections";

interface QuestSummaryViewProps {
  summary: string;
  chapterId: number;
  isRead: boolean;
  onMarkRead: () => void;
}

const READ_CHARS_PER_MINUTE = 1000;

function estimateReadTime(text: string): number {
  return Math.max(1, Math.ceil(text.length / READ_CHARS_PER_MINUTE));
}

export function QuestSummaryView({
  summary,
  chapterId,
  isRead,
  onMarkRead,
}: QuestSummaryViewProps) {
  const reduced = useReducedMotion();

  const sections = useMemo(() => splitMarkdownSections(summary), [summary]);
  const hasMultipleSections = sections.length > 1;

  const [rawSectionIndex, setCurrentSectionIndex] = useState(0);

  // Clamp index defensively if the summary (and therefore sections) changes.
  const currentSectionIndex = Math.min(
    Math.max(0, rawSectionIndex),
    Math.max(0, sections.length - 1),
  );
  const currentSection = sections[currentSectionIndex] ?? sections[0]!;
  const isFirst = currentSectionIndex === 0;
  const isLast = currentSectionIndex === sections.length - 1;

  const currentReadTime = estimateReadTime(currentSection.content);
  const remainingReadTime = sections
    .slice(currentSectionIndex + 1)
    .reduce((sum, section) => sum + estimateReadTime(section.content), 0);

  // Text selection "Add to Notes" feature
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [showFloatingBtn, setShowFloatingBtn] = useState(false);
  const [floatingPos, setFloatingPos] = useState({ top: 0, left: 0 });
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);

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

  const scrollContentToTop = useCallback(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    if (typeof window !== "undefined" && contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      if (rect.top < 0) {
        window.scrollTo({
          top: window.scrollY + rect.top - 80,
          behavior: "smooth",
        });
      }
    }
  }, []);

  const goToSection = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(sections.length - 1, index));
      setCurrentSectionIndex(clamped);
      setShowFloatingBtn(false);
      scrollContentToTop();
    },
    [sections.length, scrollContentToTop],
  );

  const handlePrevious = useCallback(() => {
    goToSection(currentSectionIndex - 1);
  }, [currentSectionIndex, goToSection]);

  const handleNext = useCallback(() => {
    goToSection(currentSectionIndex + 1);
  }, [currentSectionIndex, goToSection]);

  const progressValue = hasMultipleSections
    ? ((currentSectionIndex + 1) / sections.length) * 100
    : 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Clock className="h-4 w-4" />
          <span>~{currentReadTime} min read</span>
          {hasMultipleSections && remainingReadTime > 0 ? (
            <span className="text-text-tertiary">
              · ~{remainingReadTime} min left
            </span>
          ) : null}
        </div>

        {isRead && (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Completed</span>
          </div>
        )}
      </div>

      {hasMultipleSections ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-text-primary">
              <span className="text-text-secondary">
                Section {currentSectionIndex + 1} of {sections.length}:
              </span>{" "}
              {currentSection.title}
            </p>
            <span className="text-xs tabular-nums text-text-tertiary">
              {Math.round(progressValue)}%
            </span>
          </div>

          <LinearProgress value={progressValue} barSize="sm" />

          <div
            className="flex flex-wrap gap-1.5"
            role="tablist"
            aria-label="Summary sections"
          >
            {sections.map((section, index) => {
              const isActive = index === currentSectionIndex;
              return (
                <button
                  key={`${index}-${section.title}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => goToSection(index)}
                  className={
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                    (isActive
                      ? "border-accent-primary bg-accent-primary text-white shadow-sm"
                      : "border-border-default bg-bg-subtle text-text-secondary hover:border-accent-primary/50 hover:text-text-primary")
                  }
                >
                  <span className="mr-1 opacity-60">{index + 1}.</span>
                  {section.title}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <motion.div
        key={currentSectionIndex}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.2 }}
        ref={contentRef}
        className="relative rounded-2xl border border-border-default/50 bg-bg-surface p-6"
        onMouseUp={handleMouseUp}
        data-testid="chapter-summary-markdown"
      >
        <MarkdownContent content={currentSection.content} />

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
      </motion.div>

      {hasMultipleSections ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="secondary"
            onClick={handlePrevious}
            disabled={isFirst}
            className="gap-1.5 sm:w-auto w-full"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <span className="order-first text-center text-xs text-text-tertiary sm:order-none">
            {currentSectionIndex + 1} / {sections.length}
          </span>

          <Button
            onClick={handleNext}
            disabled={isLast}
            className="gap-1.5 sm:w-auto w-full"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {!isRead && isLast && (
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
