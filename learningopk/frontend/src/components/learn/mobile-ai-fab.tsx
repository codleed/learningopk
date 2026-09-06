"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Drawer } from "vaul";

import { cn } from "@/lib/utils";
import { useChapter } from "./chapter-context";
import { AIChatPanel } from "./ai-chat-panel";

// ── Storage key helper ──────────────────────────────────────────────────────
const AI_USED_PREFIX = "learningo:ai-used:chapter:";

function getAiUsedKey(chapterId: number): string {
  return `${AI_USED_PREFIX}${chapterId}`;
}

function hasUsedAiInChapter(chapterId: number): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getAiUsedKey(chapterId)) === "true";
}

function markAiUsedInChapter(chapterId: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getAiUsedKey(chapterId), "true");
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * Mobile-only floating action button that opens the AI Chat panel in a
 * vaul-based bottom sheet drawer with snap points at 50 % and 90 % viewport
 * height. Hidden on md+ screens.
 *
 * A subtle pulse animation plays when the student hasn't interacted with AI
 * in the current chapter, encouraging discovery.
 */
export function MobileAiFab() {
  const { chapterId, chapterTitle } = useChapter();

  const [open, setOpen] = useState(false);
  const [hasUsedAi, setHasUsedAi] = useState(true); // default true to avoid flash
  const [activeSnap, setActiveSnap] = useState<number | string | null>("50%");

  // Hydrate the "has used AI" flag from localStorage after mount.
  useEffect(() => {
    setHasUsedAi(hasUsedAiInChapter(chapterId));
  }, [chapterId]);

  // When the drawer opens, mark AI as used.
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen && !hasUsedAi) {
        markAiUsedInChapter(chapterId);
        setHasUsedAi(true);
      }
      // Reset snap point when reopening
      if (nextOpen) {
        setActiveSnap("50%");
      }
    },
    [chapterId, hasUsedAi]
  );

  const showPulse = !hasUsedAi && !open;

  return (
    <>
      {/* ── Inline CSS keyframes for pulse animation ── */}
      <style>{`
        @keyframes fab-pulse-ring {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          70% {
            transform: scale(1.6);
            opacity: 0;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
      `}</style>

      <Drawer.Root
        open={open}
        onOpenChange={handleOpenChange}
        snapPoints={["50%", "90%"]}
        activeSnapPoint={activeSnap}
        setActiveSnapPoint={setActiveSnap}
        fadeFromIndex={1}
        modal
      >
        {/* ── FAB trigger ── */}
        <Drawer.Trigger asChild>
          <button
            type="button"
            aria-label="Open AI Tutor"
            aria-haspopup="dialog"
            className={cn(
              // Position: fixed bottom-right, mobile only
              "fixed bottom-6 right-5 z-40 md:hidden",
              // Shape & size
              "flex h-14 w-14 items-center justify-center rounded-full",
              // Color – design tokens
              "bg-accent-primary text-white",
              // Shadow
              "shadow-[0_4px_16px_rgba(0,0,0,0.18)]",
              // Transitions
              "transition-all duration-200 ease-out",
              // Hover / active
              "hover:scale-105 hover:shadow-[0_6px_24px_rgba(0,0,0,0.22)]",
              "active:scale-95",
              // Focus ring
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
              // Hide when drawer is open
              open && "pointer-events-none opacity-0"
            )}
          >
            {/* Pulse ring – only when AI hasn't been used */}
            {showPulse ? (
              <span
                className="absolute inset-0 rounded-full bg-accent-primary"
                style={{
                  animation: "fab-pulse-ring 2s ease-out infinite",
                }}
                aria-hidden="true"
              />
            ) : null}

            <Sparkles className="relative h-6 w-6" aria-hidden="true" />
          </button>
        </Drawer.Trigger>

        <Drawer.Portal>
          {/* Overlay */}
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />

          {/* Content */}
          <Drawer.Content
            className={cn(
              "fixed inset-x-0 bottom-0 z-50",
              "flex flex-col",
              "rounded-t-2xl border-t border-border-default bg-bg-surface",
              "shadow-[0_-8px_32px_rgba(0,0,0,0.15)]",
              // When at the 90% snap the content should scroll internally
              activeSnap === "90%" ? "max-h-[90dvh]" : "max-h-[50dvh]"
            )}
            aria-describedby={undefined}
          >
            {/* Drag handle */}
            <Drawer.Handle className="mt-3 mb-1" />

            {/* Accessible title (visually hidden so the header inside AIChatPanel takes precedence) */}
            <Drawer.Title className="sr-only">AI Tutor</Drawer.Title>

            {/* AI Chat Panel – sidebar layout fills the drawer body */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <AIChatPanel
                chapterId={chapterId}
                chapterTitle={chapterTitle}
                layout="sidebar"
                onClose={() => setOpen(false)}
                onHideSidebar={() => setOpen(false)}
              />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
