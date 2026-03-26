"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { 
  Sparkles, 
  Maximize2, 
  Minimize2,
  ArrowUp,
  ChevronDown,
  Loader2
} from "lucide-react";

import { MarkdownMathRenderer } from "@/components/learn/markdown-math-renderer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type AIChatErrorResponse = {
  error?: string;
  reason?: string;
  retryAfterSeconds?: number;
  sessionId?: string;
};

type AIChatPanelProps = {
  chapterId: number;
  chapterTitle: string;
  initialPrompt?: string | null;
  layout?: "overlay" | "sidebar";
  isOpen?: boolean;
  onClose?: () => void;
  isSidebarMaximized?: boolean;
  onToggleSidebarMaximized?: () => void;
  onHideSidebar?: () => void;
};

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const createMessageId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatAssistantError = (payload: AIChatErrorResponse | null, fallback: string): string => {
  if (!payload) {
    return fallback;
  }

  const reasonSuffix = payload.reason ? ` (${payload.reason})` : "";
  const retrySuffix =
    typeof payload.retryAfterSeconds === "number" ? ` Try again in ${payload.retryAfterSeconds} seconds.` : "";

  return `${payload.error ?? fallback}${reasonSuffix}${retrySuffix}`;
};

const DEFAULT_SUGGESTIONS = [
  "Explain a concept in simple terms",
  "Help me with this exercise",
  "Quiz me on this topic",
  "Summarize the key points"
];

// ============================================================================
// Sub-Components
// ============================================================================

interface StreamingIndicatorProps {
  className?: string;
}

function StreamingIndicator({ className }: StreamingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1 px-1", className)}>
      <span className="h-1.5 w-1.5 animate-streaming rounded-full bg-muted-foreground" />
      <span className="h-1.5 w-1.5 animate-streaming rounded-full bg-muted-foreground [animation-delay:0.16s]" />
      <span className="h-1.5 w-1.5 animate-streaming rounded-full bg-muted-foreground [animation-delay:0.32s]" />
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  showAvatar?: boolean;
}

function MessageBubble({ message, isStreaming, showAvatar }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isEmpty = !message.content;

  return (
    <article
      className={cn(
        "animate-message-in",
        isUser
          ? "ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-[15px] text-primary-foreground"
          : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 text-[15px] text-foreground"
      )}
      aria-label={`${isUser ? "You" : "AI Tutor"}: ${message.content.slice(0, 50)}...`}
    >
      {!isUser && showAvatar && (
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
        </div>
      )}
      
      {isUser ? (
        <div className="break-words [overflow-wrap:anywhere]">{message.content}</div>
      ) : isEmpty || isStreaming ? (
        <StreamingIndicator />
      ) : (
        <div className="[overflow-wrap:anywhere] [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
          <MarkdownMathRenderer
            content={message.content}
            forceWrap
            className="text-[15px] leading-relaxed [&_.katex-display]:overflow-x-visible"
          />
        </div>
      )}
    </article>
  );
}

interface EmptyStateProps {
  suggestions: string[];
  onSuggestionClick: (text: string) => void;
}

function EmptyState({ suggestions, onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-12">
      {/* Icon */}
      <Sparkles className="mb-4 h-12 w-12 text-primary opacity-90" />
      
      {/* Title */}
      <h2 className="mb-3 text-center font-[family-name:var(--font-heading)] text-2xl font-semibold text-foreground">
        How can I help you?
      </h2>
      
      {/* Subtitle */}
      <p className="mb-8 max-w-[360px] text-center text-[15px] text-muted-foreground">
        Ask about concepts, get help with exercises, or test your knowledge.
      </p>
      
      {/* Suggestion chips */}
      <div className="grid w-full max-w-[560px] grid-cols-1 gap-3 sm:grid-cols-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggestionClick(suggestion)}
            className="w-full rounded-3xl border border-border bg-card px-4 py-3 
                       text-left text-sm font-medium text-foreground shadow-sm
                       transition-all duration-150
                       hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md
                       active:translate-y-0 active:shadow-sm"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ScrollToBottomButtonProps {
  isVisible: boolean;
  onClick: () => void;
}

function ScrollToBottomButton({ isVisible, onClick }: ScrollToBottomButtonProps) {
  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="animate-scroll-btn fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 
                 rounded-full border border-border bg-card px-4 py-2 shadow-md
                 transition-all duration-200 hover:scale-105 active:scale-100"
      aria-label="Scroll to latest messages"
    >
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
      <span className="text-[13px] font-medium text-muted-foreground">New messages</span>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AIChatPanel({
  chapterId,
  chapterTitle,
  initialPrompt,
  layout = "overlay",
  isOpen = false,
  onClose,
  isSidebarMaximized = false,
  onToggleSidebarMaximized,
  onHideSidebar
}: AIChatPanelProps) {
  const panelIsVisible = layout === "sidebar" ? true : isOpen;
  const usePanelLevelScroll = layout === "sidebar" && isSidebarMaximized;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const focusedMessageIndex = useRef<number | null>(null);

  const hasMessages = messages.length > 0;

  const placeholder = useMemo(() => {
    return messages.length > 0
      ? "Ask a follow-up question..."
      : "Ask your first question...";
  }, [messages.length]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 && !showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, showScrollButton]);

  // Handle scroll position for scroll-to-bottom button
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    setShowScrollButton(distanceFromBottom > 200);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    setShowScrollButton(false);
  }, []);

  useEffect(() => {
    if (isOpen && layout === "overlay") {
      document.getElementById("ai-chat-input")?.focus();
    }
  }, [isOpen, layout]);

  useEffect(() => {
    if (!isOpen) return;

    const panel = document.getElementById("ai-chat-panel");
    if (!panel) return;

    const focusableElements = panel.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableElements[0] as HTMLElement;
    const lastEl = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    };

    panel.addEventListener("keydown", handleTabKey);
    return () => panel.removeEventListener("keydown", handleTabKey);
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && layout === "overlay" && onClose) {
      onClose();
      const trigger = document.querySelector("[data-ai-chat-trigger]") as HTMLElement;
      trigger?.focus();
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const messageElements = messageRefs.current.filter(Boolean);
      if (messageElements.length === 0) return;

      if (e.key === "ArrowDown") {
        if (focusedMessageIndex.current === null || focusedMessageIndex.current >= messageElements.length - 1) {
          focusedMessageIndex.current = 0;
        } else {
          focusedMessageIndex.current!++;
        }
      } else {
        if (focusedMessageIndex.current === null || focusedMessageIndex.current <= 0) {
          focusedMessageIndex.current = messageElements.length - 1;
        } else {
          focusedMessageIndex.current!--;
        }
      }

      const nextIndex = focusedMessageIndex.current;
      if (nextIndex !== null && messageElements[nextIndex]) {
        e.preventDefault();
        messageElements[nextIndex]?.focus();
      }
    }
  };

  useEffect(() => {
    if (!initialPrompt || !panelIsVisible) {
      return;
    }
    setInputValue(initialPrompt);
  }, [initialPrompt, panelIsVisible]);

  const startFreshSession = () => {
    setSessionId(null);
    setMessages([]);
    setInputValue("");
    setError(null);
  };

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
      adjustTextareaHeight();
    },
    [adjustTextareaHeight]
  );

  const handleSuggestionClick = useCallback(
    (text: string) => {
      setInputValue(text);
      adjustTextareaHeight();
      textareaRef.current?.focus();
    },
    [adjustTextareaHeight]
  );

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const form = e.currentTarget.form;
        if (form) {
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        }
      }
    },
    []
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) {
      return;
    }

    setIsSending(true);
    setIsStreaming(true);
    setError(null);

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmed
    };

    const assistantMessageId = createMessageId();
    const pendingAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: ""
    };

    const requestMessages = [...messages, userMessage].map((message) => ({
      role: message.role,
      content: message.content
    }));

    setMessages((previous) => [...previous, userMessage, pendingAssistantMessage]);
    setInputValue("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await fetch(`${backendUrl}/api/ai/chat`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          messages: requestMessages,
          chapterId,
          sessionId: sessionId ?? undefined
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as AIChatErrorResponse | null;
        const responseSessionId = payload?.sessionId;
        if (responseSessionId) {
          setSessionId(responseSessionId);
        }

        setMessages((previous) => previous.filter((message) => message.id !== assistantMessageId));
        setError(formatAssistantError(payload, `AI request failed with status ${response.status}.`));
        return;
      }

      const responseSessionId = response.headers.get("x-ai-session-id");
      if (responseSessionId) {
        setSessionId(responseSessionId);
      }

      if (!response.body) {
        setMessages((previous) => previous.filter((message) => message.id !== assistantMessageId));
        setError("AI response stream was empty.");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const chunk = await reader.read();
        if (chunk.done) {
          break;
        }

        assistantText += decoder.decode(chunk.value, { stream: true });
        const latestText = assistantText;
        setMessages((previous) =>
          previous.map((message) => (message.id === assistantMessageId ? { ...message, content: latestText } : message))
        );
      }

      assistantText += decoder.decode();
      if (assistantText.trim().length === 0) {
        setMessages((previous) => previous.filter((message) => message.id !== assistantMessageId));
        setError("AI did not return any text. Please try again.");
      }
    } catch {
      setMessages((previous) => previous.filter((message) => message.id !== assistantMessageId));
      setError("Unable to reach AI service. Please try again.");
    } finally {
      setIsSending(false);
      setIsStreaming(false);
    }
  };

  if (!panelIsVisible) {
    return null;
  }

  const panelBody = (
    <div className={cn("flex min-h-0 flex-col", usePanelLevelScroll ? "" : "h-full")}>
      <header className="border-b border-border px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">AI Tutor</p>
            <h2 className="text-base font-semibold text-foreground">{chapterTitle}</h2>
          </div>
          {layout === "overlay" && onClose ? (
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={startFreshSession}>
            Start Fresh Session
          </Button>
          {layout === "sidebar" && onToggleSidebarMaximized ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleSidebarMaximized}
              aria-pressed={isSidebarMaximized}
              aria-label={isSidebarMaximized ? "Restore AI sidebar size" : "Maximize AI sidebar"}
            >
              {isSidebarMaximized ? <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />}
              {isSidebarMaximized ? "Restore" : "Maximize"}
            </Button>
          ) : null}
          {layout === "sidebar" && onHideSidebar ? (
            <Button type="button" variant="ghost" size="sm" onClick={onHideSidebar} aria-label="Hide AI sidebar">
              Hide
            </Button>
          ) : null}
          {sessionId ? <p className="self-center text-xs text-muted-foreground">Session active</p> : null}
        </div>
      </header>

      <div
        ref={containerRef}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        className={cn("space-y-3 px-3 py-3", usePanelLevelScroll ? "" : "min-h-0 flex-1 overflow-y-auto")}
        role="log"
        aria-label="Conversation"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <EmptyState suggestions={DEFAULT_SUGGESTIONS} onSuggestionClick={handleSuggestionClick} />
        ) : (
          <>
            {messages.map((message, index) => {
              const prevMessage = messages[index - 1];
              const shouldShowAvatar = message.role === "assistant" && 
                (index === 0 || prevMessage?.role === "user");
              const isConsecutiveSameRole = prevMessage?.role === message.role;
              const isMessageStreaming = isStreaming && message.id === messages[messages.length - 1]?.id;

              return (
                <div
                  key={message.id}
                  ref={(el) => { messageRefs.current[index] = el; }}
                  className={cn(
                    isConsecutiveSameRole ? "mt-1" : "mt-4"
                  )}
                >
                  <MessageBubble
                    message={message}
                    isStreaming={isMessageStreaming}
                    showAvatar={shouldShowAvatar}
                  />
                </div>
              );
            })}

            {error ? (
              <div className="mx-auto max-w-[85%] rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            ) : null}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      <ScrollToBottomButton isVisible={showScrollButton && hasMessages} onClick={scrollToBottom} />

      {/* Input area */}
      <div className="border-t border-border p-3">
        <form onSubmit={onSubmit} className="relative">
          <div
            className="flex items-end rounded-2xl border border-border bg-card 
                        px-1 py-1 shadow-[0_4px_24px_rgba(0,0,0,0.08)]
                        focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/20
                        transition-all duration-150"
          >
            <textarea
              ref={textareaRef}
              id="ai-chat-input"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleTextareaKeyDown}
              placeholder={placeholder}
              rows={1}
              disabled={isSending}
              className="flex-1 resize-none rounded-xl bg-transparent px-3 py-2.5 text-[15px] 
                         outline-none placeholder:text-muted-foreground
                         disabled:cursor-not-allowed disabled:opacity-50"
              style={{ minHeight: "44px", maxHeight: "184px" }}
              aria-label="Message input"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isSending}
              className="m-1 flex h-9 w-9 shrink-0 items-center justify-center 
                         rounded-full bg-primary text-primary-foreground shadow-sm
                         transition-all duration-150
                         disabled:cursor-not-allowed disabled:opacity-50
                         hover:bg-[var(--primary-hover)] hover:shadow-md
                         active:scale-95"
              aria-label="Send message"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          {isSending ? "Streaming response..." : "Responses are Socratic and concise."}
        </p>
      </div>
    </div>
  );

  if (layout === "sidebar") {
    return (
      <aside
        id="ai-chat-panel"
        className={cn(
          "flex w-full flex-col rounded-2xl border border-border bg-card shadow-[var(--elevation-card)] xl:h-[calc(100vh-2.5rem)] xl:min-h-[calc(100vh-2.5rem)]",
          isSidebarMaximized
            ? "h-[calc(100vh-2.5rem)] min-h-[calc(100vh-2.5rem)] overflow-y-auto"
            : "h-[32rem] min-h-[32rem] overflow-hidden"
        )}
      >
        {panelBody}
      </aside>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close AI panel overlay"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <aside id="ai-chat-panel" className="fixed inset-y-0 right-0 z-50 w-full max-w-xl border-l border-border bg-card shadow-[var(--elevation-strong)]">
        {panelBody}
      </aside>
    </>
  );
}
