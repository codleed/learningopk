"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { 
  Sparkles, 
  History, 
  ArrowUp, 
  Loader2, 
  X, 
  Plus, 
  ChevronDown,
  AlertCircle
} from "lucide-react";

import { MarkdownMathRenderer } from "@/components/learn/markdown-math-renderer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type ChatSession = {
  id: string;
  title: string;
  lastMessageAt: string;
};

type AISessionListResponse = {
  sessions: ChatSession[];
};

type AISessionMessagesResponse = {
  session: {
    id: string;
    title: string;
    lastMessageAt: string;
  };
  messages: Array<{
    id: string;
    role: ChatRole;
    content: string;
    createdAt: string;
  }>;
};

type AIChatErrorResponse = {
  error?: string;
  reason?: string;
  retryAfterSeconds?: number;
  sessionId?: string;
};

// ============================================================================
// Constants
// ============================================================================

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const createMessageId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const DEFAULT_SUGGESTIONS = [
  "Explain a concept in simple terms",
  "Help me study for my exam",
  "Create a study schedule",
  "Quiz me on a topic"
];

// ============================================================================
// Utilities
// ============================================================================

const formatRelativeTimestamp = (value: string): string => {
  const target = new Date(value).getTime();
  if (!Number.isFinite(target)) {
    return "";
  }

  const diffMs = target - Date.now();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  const absDiff = Math.abs(diffMs);
  if (absDiff < minuteMs) {
    return "just now";
  }

  if (absDiff < hourMs) {
    return rtf.format(Math.round(diffMs / minuteMs), "minute");
  }

  if (absDiff < dayMs) {
    return rtf.format(Math.round(diffMs / hourMs), "hour");
  }

  if (absDiff < 30 * dayMs) {
    return rtf.format(Math.round(diffMs / dayMs), "day");
  }

  return rtf.format(Math.round(diffMs / (30 * dayMs)), "month");
};

const formatAssistantError = (payload: AIChatErrorResponse | null, fallback: string): string => {
  if (!payload) {
    return fallback;
  }

  const reasonSuffix = payload.reason ? ` (${payload.reason})` : "";
  const retrySuffix =
    typeof payload.retryAfterSeconds === "number" ? ` Try again in ${payload.retryAfterSeconds} seconds.` : "";

  return `${payload.error ?? fallback}${reasonSuffix}${retrySuffix}`;
};

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
        Ask about concepts, create study plans, or get exam preparation tips.
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

interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  isLoading: boolean;
}

function SessionSidebar({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  isLoading
}: SessionSidebarProps) {
  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const groups: { today: ChatSession[]; yesterday: ChatSession[]; older: ChatSession[] } = {
      today: [],
      yesterday: [],
      older: []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    sessions.forEach((session) => {
      const sessionDate = new Date(session.lastMessageAt);
      if (sessionDate >= today) {
        groups.today.push(session);
      } else if (sessionDate >= yesterday) {
        groups.yesterday.push(session);
      } else {
        groups.older.push(session);
      }
    });

    return groups;
  }, [sessions]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Sidebar */}
      <aside
        className="animate-sidebar-in fixed right-0 top-0 z-50 flex h-full w-[280px] flex-col border-l border-border bg-card shadow-[-8px_0_24px_rgba(0,0,0,0.08)]"
        aria-label="Chat history"
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <h2 className="text-base font-semibold text-foreground">Chat History</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-accent"
            aria-label="Close history"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* New Chat button */}
        <div className="border-b border-border p-4">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl 
                       bg-primary px-4 py-3 text-sm font-medium text-primary-foreground
                       transition-colors hover:bg-[var(--primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Start a new chat to see it here.</p>
            </div>
          ) : (
            <>
              {groupedSessions.today.length > 0 && (
                <div className="mb-4 mt-4">
                  <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Today
                  </p>
                  {groupedSessions.today.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      onClick={() => {
                        onSelectSession(session.id);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              )}

              {groupedSessions.yesterday.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Yesterday
                  </p>
                  {groupedSessions.yesterday.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      onClick={() => {
                        onSelectSession(session.id);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              )}

              {groupedSessions.older.length > 0 && (
                <div>
                  <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Previous 7 Days
                  </p>
                  {groupedSessions.older.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === activeSessionId}
                      onClick={() => {
                        onSelectSession(session.id);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onClick: () => void;
}

function SessionItem({ session, isActive, onClick }: SessionItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mb-1 w-full rounded-lg px-3 py-2.5 text-left transition-colors",
        isActive
          ? "bg-primary/10 border-l-2 border-primary text-foreground"
          : "hover:bg-accent text-muted-foreground hover:text-foreground"
      )}
    >
      <p className="truncate text-sm font-medium text-foreground">{session.title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {formatRelativeTimestamp(session.lastMessageAt)}
      </p>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AITutorChat() {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoadingHistoryList, setIsLoadingHistoryList] = useState(true);
  const [isLoadingSessionMessages, setIsLoadingSessionMessages] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const placeholder = useMemo(() => {
    return messages.length > 0
      ? "Ask a follow-up question..."
      : "Ask anything about your studies...";
  }, [messages.length]);

  const hasMessages = messages.length > 0;

  // ---------------------------------------------------------------------------
  // API Functions
  // ---------------------------------------------------------------------------
  const fetchSessions = useCallback(async (): Promise<ChatSession[]> => {
    const response = await fetch(`${backendUrl}/api/ai/sessions`, {
      method: "GET",
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error(`Unable to load chat sessions (${response.status}).`);
    }

    const payload = (await response.json()) as AISessionListResponse;
    return payload.sessions ?? [];
  }, []);

  const loadSessionMessages = useCallback(async (targetSessionId: string): Promise<void> => {
    setIsLoadingSessionMessages(true);

    try {
      const response = await fetch(`${backendUrl}/api/ai/sessions/${targetSessionId}/messages`, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Unable to load session messages (${response.status}).`);
      }

      const payload = (await response.json()) as AISessionMessagesResponse;
      setMessages(
        payload.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content
        }))
      );
      setSessionId(payload.session.id);
      setError(null);
    } catch {
      setError("Unable to load this conversation. Please try another session.");
    } finally {
      setIsLoadingSessionMessages(false);
    }
  }, []);

  const refreshSessions = useCallback(
    async (preferredSessionId?: string | null): Promise<void> => {
      try {
        const latestSessions = await fetchSessions();
        setSessions(latestSessions);
        if (preferredSessionId && latestSessions.some((session) => session.id === preferredSessionId)) {
          setSessionId(preferredSessionId);
        }
      } catch {
        setError("Unable to refresh chat history right now.");
      }
    },
    [fetchSessions]
  );

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Initial load
  useEffect(() => {
    let isCancelled = false;

    const loadInitialHistory = async () => {
      setIsLoadingHistoryList(true);

      try {
        const latestSessions = await fetchSessions();
        if (isCancelled) {
          return;
        }

        setSessions(latestSessions);

        const latestSession = latestSessions[0];
        if (!latestSession) {
          setMessages([]);
          setSessionId(null);
          return;
        }

        await loadSessionMessages(latestSession.id);
      } catch {
        if (!isCancelled) {
          setError("Unable to load chat history. Start a new conversation to continue.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingHistoryList(false);
        }
      }
    };

    void loadInitialHistory();

    return () => {
      isCancelled = true;
    };
  }, [fetchSessions, loadSessionMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 && !showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, showScrollButton]);

  // Handle scroll position for scroll-to-bottom button
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    setShowScrollButton(distanceFromBottom > 200);
  }, []);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    setShowScrollButton(false);
  }, []);

  const startFreshChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setInputValue("");
    setError(null);
    textareaRef.current?.focus();
  }, []);

  const onSelectSession = useCallback(
    async (targetSessionId: string) => {
      if (isSending || targetSessionId === sessionId) {
        return;
      }

      await loadSessionMessages(targetSessionId);
      textareaRef.current?.focus();
    },
    [isSending, sessionId, loadSessionMessages]
  );

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
          sessionId: sessionId ?? undefined
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as AIChatErrorResponse | null;
        if (payload?.sessionId) {
          setSessionId(payload.sessionId);
          void refreshSessions(payload.sessionId);
        }

        setMessages((previous) => previous.filter((message) => message.id !== assistantMessageId));
        setError(formatAssistantError(payload, `AI request failed with status ${response.status}.`));
        return;
      }

      const responseSessionId = response.headers.get("x-ai-session-id");
      if (responseSessionId) {
        setSessionId(responseSessionId);
        void refreshSessions(responseSessionId);
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
      } else {
        void refreshSessions(responseSessionId ?? sessionId);
      }
    } catch {
      setMessages((previous) => previous.filter((message) => message.id !== assistantMessageId));
      setError("Unable to reach AI service. Please try again.");
    } finally {
      setIsSending(false);
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const form = e.currentTarget.form;
        if (form) {
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        }
      }
      if (e.key === "Escape" && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    },
    [isSidebarOpen]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-screen h-dvh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm md:h-16">
        {/* Left: Logo and title */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="font-[family-name:var(--font-heading)] text-base font-semibold text-foreground">
            AI Tutor
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(true)}
            className="gap-2 text-muted-foreground hover:text-foreground"
            aria-label="Open chat history"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </Button>
        </div>
      </header>

      {/* Main content area */}
      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
        {/* Messages area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
          role="log"
          aria-label="Conversation"
          aria-live="polite"
        >
          {isLoadingSessionMessages ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading conversation...</span>
              </div>
            </div>
          ) : !hasMessages ? (
            <EmptyState suggestions={DEFAULT_SUGGESTIONS} onSuggestionClick={handleSuggestionClick} />
          ) : (
            <div className="space-y-4 pb-8 pt-4">
              {/* Top padding for first message */}
              <div className="h-4" />

              {messages.map((message, index) => {
                const prevMessage = messages[index - 1];
                const shouldShowAvatar = message.role === "assistant" && 
                  (index === 0 || prevMessage?.role === "user");
                const isConsecutiveSameRole = prevMessage?.role === message.role;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      isConsecutiveSameRole ? "mt-2" : "mt-6"
                    )}
                  >
                    <MessageBubble
                      message={message}
                      isStreaming={isStreaming && message.id === messages[messages.length - 1]?.id}
                      showAvatar={shouldShowAvatar}
                    />
                  </div>
                );
              })}

              {/* Error display */}
              {error && (
                <div className="mx-auto max-w-[85%] rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                    <p className="flex-1 text-sm text-destructive">{error}</p>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="text-sm font-medium text-destructive underline-offset-4 hover:underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Scroll to bottom button */}
        <ScrollToBottomButton isVisible={showScrollButton && hasMessages} onClick={scrollToBottom} />

        {/* Input area */}
        <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-background/80 pb-4 pt-2">
          <form onSubmit={onSubmit} className="relative">
            <div
              className="flex items-end rounded-2xl border border-border bg-card 
                          px-1 py-1 shadow-[0_4px_24px_rgba(0,0,0,0.08)]
                          focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/20
                          transition-all duration-150"
            >
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
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
        </div>
      </div>

      {/* Sidebar */}
      <SessionSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={sessionId}
        onSelectSession={onSelectSession}
        onNewChat={startFreshChat}
        isLoading={isLoadingHistoryList}
      />
    </div>
  );
}
