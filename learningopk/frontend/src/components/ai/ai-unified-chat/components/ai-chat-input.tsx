"use client";

import { useRef, useCallback, type FormEvent, type ChangeEvent, type KeyboardEvent } from "react";
import { ArrowUp, Square, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type AIChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSending: boolean;
  isStreaming?: boolean;
  onStopGenerating?: () => void;
  stoppedStatus?: string | null;
  rateLimitRemaining?: number | null;
  rateLimitTotal?: number | null;
  placeholder?: string;
  className?: string;
  /** Optional ref to the scrollable messages container — scrolls to bottom on mobile focus */
  messagesContainerRef?: React.RefObject<HTMLDivElement | null>;
};

export function AIChatInput({
  value,
  onChange,
  onSubmit,
  isSending,
  isStreaming = false,
  onStopGenerating,
  stoppedStatus,
  rateLimitRemaining,
  rateLimitTotal,
  placeholder = "Ask a question...",
  className,
  messagesContainerRef,
}: AIChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLimitReached =
    rateLimitRemaining !== null && rateLimitRemaining !== undefined && rateLimitRemaining <= 0;
  const isLimitLow =
    rateLimitRemaining !== null &&
    rateLimitRemaining !== undefined &&
    rateLimitRemaining > 0 &&
    rateLimitRemaining <= 5;
  const isInputDisabled = isSending || isLimitReached;

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, []);

  /** Scroll the messages container to the bottom when the input is focused on mobile */
  const handleFocus = useCallback(() => {
    if (typeof window === "undefined") return;

    const isMobileViewport = window.matchMedia("(max-width: 1023px)").matches;
    if (!isMobileViewport) return;

    const container = messagesContainerRef?.current;
    if (!container) return;

    const scrollToBottom = () => {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    };

    requestAnimationFrame(scrollToBottom);
    window.setTimeout(scrollToBottom, 250);
  }, [messagesContainerRef]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      adjustTextareaHeight();
    },
    [onChange, adjustTextareaHeight]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && value.trim()) {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit, value]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isStreaming && onStopGenerating) {
      onStopGenerating();
      return;
    }
    onSubmit();
  };

  return (
    <div
      className={cn(
        "px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-border-default/50 bg-bg-surface/50",
        className
      )}
    >
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            "relative flex items-end gap-2",
            "rounded-2xl",
            "bg-bg-base",
            "border border-border-default/60",
            "shadow-sm",
            "transition-all duration-200",
            "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 focus-within:shadow-md",
            isInputDisabled && "opacity-80"
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={isLimitReached ? "Daily limit reached. Resets at midnight." : placeholder}
            rows={1}
            disabled={isInputDisabled}
            className={cn(
              "flex-1 resize-none",
              "bg-transparent",
              "px-4 py-3.5 pr-12",
              "text-[15px] text-text-primary placeholder:text-text-secondary/60",
              "outline-none",
              "disabled:cursor-not-allowed",
              "min-h-[52px] max-h-[160px]"
            )}
            aria-label="Message input"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={onStopGenerating}
              className={cn(
                "absolute right-2 bottom-2",
                "flex h-9 w-9 items-center justify-center",
                "rounded-xl",
                "bg-accent-danger text-white",
                "shadow-sm",
                "transition-all duration-200",
                "hover:bg-accent-danger/90 hover:shadow-md hover:scale-105",
                "active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-danger focus-visible:ring-offset-2"
              )}
              aria-label="Stop generating"
            >
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!value.trim() || isInputDisabled}
              className={cn(
                "absolute right-2 bottom-2",
                "flex h-9 w-9 items-center justify-center",
                "rounded-xl",
                "bg-primary text-primary-foreground",
                "shadow-sm",
                "transition-all duration-200",
                "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none",
                "hover:bg-primary-hover hover:shadow-md hover:scale-105",
                "active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              )}
              aria-label="Send message"
            >
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </form>

      {/* Status / hints row */}
      <div className="mt-2 flex items-center justify-center gap-4">
        {stoppedStatus ? (
          <p className="text-[11px] text-text-secondary font-medium">{stoppedStatus}</p>
        ) : (
          <>
            <p className="text-[11px] text-text-secondary/60 flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" />
              Enter to send
            </p>
            <span className="text-text-secondary/30">|</span>
            <p className="text-[11px] text-text-secondary/60">
              {isStreaming
                ? "AI is generating..."
                : isSending
                  ? "AI is thinking..."
                  : "Shift + Enter for new line"}
            </p>
          </>
        )}
      </div>

      {/* Rate limit counter */}
      {rateLimitRemaining !== null && rateLimitRemaining !== undefined && (
        <div className="mt-1.5 flex items-center justify-center">
          {isLimitReached ? (
            <p
              className={cn(
                "text-[11px] font-medium px-2.5 py-1 rounded-lg",
                "text-accent-danger bg-accent-danger/10"
              )}
            >
              Daily limit reached. Resets at midnight.
            </p>
          ) : (
            <p
              className={cn(
                "text-[11px] px-2 py-0.5 rounded-md",
                isLimitLow
                  ? "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 font-medium"
                  : "text-text-muted"
              )}
            >
              {rateLimitRemaining}
              {rateLimitTotal !== null && rateLimitTotal !== undefined
                ? ` / ${rateLimitTotal}`
                : ""}{" "}
              messages remaining today
            </p>
          )}
        </div>
      )}
    </div>
  );
}
