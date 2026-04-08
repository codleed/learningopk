"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Clock, NotebookPen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "./markdown-content";
import { AddToNotesDialog } from "@/components/notes/add-to-notes-dialog";

interface QuestSummaryViewProps {
  summary: string;
  chapterId: number;
  isRead: boolean;
  onMarkRead: () => void;
}

export function QuestSummaryView({
  summary,
  chapterId,
  isRead,
  onMarkRead,
}: QuestSummaryViewProps) {
  const estimatedReadTime = Math.max(1, Math.ceil(summary.length / 1000));
  const reduced = useReducedMotion();

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

      <div
        ref={contentRef}
        className="relative rounded-2xl border border-border-default/50 bg-bg-surface p-6"
        onMouseUp={handleMouseUp}
      >
        <MarkdownContent content={summary} />

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
