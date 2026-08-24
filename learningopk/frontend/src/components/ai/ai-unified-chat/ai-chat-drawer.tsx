"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAIChatContext } from "./ai-chat-context";
import { AIChatHeader } from "./components/ai-chat-header";
import { AIChatMessages } from "./components/ai-chat-messages";
import { AIChatInput } from "./components/ai-chat-input";
import { AIChatEmptyState } from "./components/ai-chat-empty-state";
import { CrisisBanner } from "./components/crisis-banner";
import { useMobileKeyboard } from "./hooks/use-mobile-keyboard";

type AIChatDrawerProps = {
  onClose: () => void;
  className?: string;
};

export function AIChatDrawer({ onClose, className }: AIChatDrawerProps) {
  const {
    messages,
    isStreaming,
    isSending,
    error,
    stoppedStatus,
    proactiveHint,
    isVisible,
    context,
    showCrisisBanner,
    rateLimitRemaining,
    rateLimitTotal,
    sendMessage,
    stopGenerating,
    clearError,
    dismissCrisisBanner,
  } = useAIChatContext();

  const [inputValue, setInputValue] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { keyboardVisible, viewportHeight } = useMobileKeyboard();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isVisible) return null;

  const handleSubmit = async () => {
    if (!inputValue.trim() || isSending) return;
    await sendMessage(inputValue);
    setInputValue("");
  };

  const handleSuggestionClick = (prompt: string) => {
    setInputValue(prompt);
  };

  const placeholder =
    messages.length > 0 ? "Ask a follow-up question..." : "Ask your first question...";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 xl:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50",
          "flex h-[85dvh] max-h-[85dvh] flex-col rounded-t-2xl",
          "border-t border-border-default bg-bg-surface",
          "shadow-[0_-8px_32px_rgba(0,0,0,0.15)]",
          "animate-in slide-in-from-bottom duration-300",
          "xl:hidden",
          className
        )}
        style={
          keyboardVisible
            ? { height: `${viewportHeight}px`, maxHeight: `${viewportHeight}px` }
            : undefined
        }
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-label="AI Chat Drawer"
        aria-modal="true"
        tabIndex={-1}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-border-default" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <AIChatHeader variant="drawer" onClose={onClose} />

          {messages.length === 0 ? (
            <AIChatEmptyState
              context={context}
              onSuggestionClick={handleSuggestionClick}
              className="flex-1"
            />
          ) : (
            <AIChatMessages
              messages={messages}
              isStreaming={isStreaming}
              topBanner={showCrisisBanner ? <CrisisBanner onDismiss={dismissCrisisBanner} /> : null}
              className="min-h-0"
              containerRef={messagesContainerRef}
            />
          )}

          {error && (
            <div className="mx-4 mb-2 rounded-xl border border-accent-danger/30 bg-accent-danger/10 px-4 py-3">
              <p className="text-sm text-accent-danger">{error}</p>
              <button
                type="button"
                onClick={clearError}
                className="text-xs text-accent-danger underline mt-1"
              >
                Dismiss
              </button>
            </div>
          )}

          {proactiveHint && (
            <div className="mx-4 mb-2 rounded-xl border border-amber-300/40 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Need a hint?
              </p>
              <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">
                {proactiveHint.message}
              </p>
              <button
                type="button"
                onClick={() => setInputValue(proactiveHint.message)}
                className="mt-2 text-xs font-medium text-amber-800 underline underline-offset-4 dark:text-amber-200"
              >
                Need a hint?
              </button>
            </div>
          )}

          <AIChatInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            isSending={isSending}
            isStreaming={isStreaming}
            onStopGenerating={stopGenerating}
            stoppedStatus={stoppedStatus}
            rateLimitRemaining={rateLimitRemaining}
            rateLimitTotal={rateLimitTotal}
            placeholder={placeholder}
            className="flex-shrink-0"
            messagesContainerRef={messagesContainerRef}
          />
        </div>
      </div>
    </>
  );
}
