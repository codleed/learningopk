"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquareText, PanelLeftClose, PanelLeftOpen, Plus, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/states";
import { cn } from "@/lib/utils";

import { useAIChatContext } from "./ai-chat-context";
import { AIChatMessages } from "./components/ai-chat-messages";
import { AIChatInput } from "./components/ai-chat-input";
import { AIChatEmptyState } from "./components/ai-chat-empty-state";
import { CrisisBanner } from "./components/crisis-banner";
import { useMobileKeyboard } from "./hooks/use-mobile-keyboard";
import type { ChatSession } from "./types";

// ============================================================================
// Constants
// ============================================================================

// Full-page mode uses categorized Pakistani curriculum starters (built into AIChatEmptyState)

// ============================================================================
// Utilities
// ============================================================================

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatRelativeTimestamp(value: string): string {
  const target = new Date(value).getTime();
  if (!Number.isFinite(target)) return "";

  const diffMs = target - Date.now();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const absDiff = Math.abs(diffMs);

  if (absDiff < minuteMs) return "just now";
  if (absDiff < hourMs) return rtf.format(Math.round(diffMs / minuteMs), "minute");
  if (absDiff < dayMs) return rtf.format(Math.round(diffMs / hourMs), "hour");
  if (absDiff < 30 * dayMs) return rtf.format(Math.round(diffMs / dayMs), "day");
  return rtf.format(Math.round(diffMs / (30 * dayMs)), "month");
}

// ============================================================================
// Session Group
// ============================================================================

function SessionGroup({
  label,
  sessions,
  activeSessionId,
  onSelectSession,
}: {
  label: string;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
}) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </p>
      {sessions.map((session) => (
        <button
          key={session.id}
          type="button"
          onClick={() => onSelectSession(session.id)}
          className={cn(
            "mb-0.5 w-full rounded-lg px-3 py-2 text-left transition-colors duration-150",
            session.id === activeSessionId
              ? "bg-accent-primary/10 text-text-primary"
              : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
          )}
        >
          <p className="truncate text-[13px] font-medium">{session.title}</p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            {formatRelativeTimestamp(session.lastMessageAt)}
          </p>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Conversation History Panel
// ============================================================================

function ConversationHistoryPanel({
  sessions,
  activeSessionId,
  isLoadingSessions,
  onSelectSession,
  onNewChat,
}: {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isLoadingSessions: boolean;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
}) {
  const groupedSessions = useMemo(() => {
    const groups: {
      today: ChatSession[];
      yesterday: ChatSession[];
      older: ChatSession[];
    } = { today: [], yesterday: [], older: [] };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    sessions.forEach((session) => {
      const d = new Date(session.lastMessageAt);
      if (d >= today) groups.today.push(session);
      else if (d >= yesterday) groups.yesterday.push(session);
      else groups.older.push(session);
    });

    return groups;
  }, [sessions]);

  return (
    <div className="flex h-full flex-col">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold text-text-primary">
          Conversations
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onNewChat}
          className="gap-1 text-[11px] text-text-muted hover:text-accent-primary"
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
          New
        </Button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
        {isLoadingSessions ? (
          <div className="py-4">
            <LoadingSkeleton title="Loading sessions" rows={3} variant="list" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-10 text-center">
            <MessageSquareText className="mx-auto mb-2 h-8 w-8 text-text-muted/40" />
            <p className="text-xs text-text-muted">No conversations yet</p>
            <p className="mt-1 text-[11px] text-text-muted/60">Start a new conversation to begin</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {groupedSessions.today.length > 0 && (
              <SessionGroup
                label="Today"
                sessions={groupedSessions.today}
                activeSessionId={activeSessionId}
                onSelectSession={onSelectSession}
              />
            )}
            {groupedSessions.yesterday.length > 0 && (
              <SessionGroup
                label="Yesterday"
                sessions={groupedSessions.yesterday}
                activeSessionId={activeSessionId}
                onSelectSession={onSelectSession}
              />
            )}
            {groupedSessions.older.length > 0 && (
              <SessionGroup
                label="Earlier"
                sessions={groupedSessions.older}
                activeSessionId={activeSessionId}
                onSelectSession={onSelectSession}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Full-Page Chat Component
// ============================================================================

export function AIChatFullPage() {
  const {
    messages,
    isStreaming,
    isSending,
    error,
    stoppedStatus,
    proactiveHint,
    sessions,
    activeSessionId,
    isLoadingSessions,
    showCrisisBanner,
    rateLimitRemaining,
    rateLimitTotal,
    sendMessage,
    stopGenerating,
    loadSession,
    startNewSession,
    clearError,
    dismissCrisisBanner,
    fetchSessionsList,
    refreshSessionsList,
  } = useAIChatContext();

  const [inputValue, setInputValue] = useState("");
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { keyboardVisible, viewportHeight } = useMobileKeyboard();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const syncHistoryPanel = (matches: boolean) => {
      setIsHistoryPanelOpen(matches);
    };

    syncHistoryPanel(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncHistoryPanel(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  // Load session list on mount
  useEffect(() => {
    void fetchSessionsList();
  }, [fetchSessionsList]);

  // Refresh sessions after each message send (sessionId changes)
  useEffect(() => {
    if (activeSessionId) {
      void refreshSessionsList(activeSessionId);
    }
  }, [activeSessionId, refreshSessionsList]);

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || isSending) return;
    const text = inputValue;
    setInputValue("");
    await sendMessage(text);
  }, [inputValue, isSending, sendMessage]);

  const handleSuggestionClick = useCallback((prompt: string) => {
    setInputValue(prompt);
  }, []);

  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      if (isSending || sessionId === activeSessionId) return;
      await loadSession(sessionId);
    },
    [isSending, activeSessionId, loadSession]
  );

  const handleNewChat = useCallback(() => {
    startNewSession();
    setInputValue("");
  }, [startNewSession]);

  const placeholder =
    messages.length > 0 ? "Ask a follow-up question..." : "Ask anything about your studies...";

  const hasMessages = messages.length > 0;

  return (
    <div
      className="flex h-[calc(100dvh-var(--shell-header-height,0px))] flex-row bg-bg-base -mx-3 sm:-mx-5 lg:-mx-6 -mt-3 -mb-10"
      style={
        keyboardVisible
          ? { height: `calc(${viewportHeight}px - var(--shell-header-height, 0px))` }
          : undefined
      }
    >
      {/* ====== LEFT: Conversation History Panel ====== */}
      <AnimatePresence initial={false}>
        {isHistoryPanelOpen && (
          <motion.aside
            className="hidden shrink-0 border-r border-border-default bg-bg-surface md:flex"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            aria-label="Conversation history"
          >
            <div className="w-[280px]">
              <ConversationHistoryPanel
                sessions={sessions}
                activeSessionId={activeSessionId}
                isLoadingSessions={isLoadingSessions}
                onSelectSession={handleSelectSession}
                onNewChat={handleNewChat}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ====== RIGHT: Chat Area (flex-1) ====== */}
      <div className="relative flex flex-1 flex-col">
        {/* Chat Header */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border-default bg-bg-base/80 px-4 backdrop-blur-md">
          {/* Left */}
          <div className="flex items-center gap-2.5">
            {/* Toggle history panel */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsHistoryPanelOpen((v) => !v)}
              className="hidden text-text-muted hover:text-text-primary md:inline-flex"
              aria-label={
                isHistoryPanelOpen ? "Hide conversation history" : "Show conversation history"
              }
            >
              {isHistoryPanelOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>

            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10">
              <Sparkles className="h-4 w-4 text-accent-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-sm font-semibold text-text-primary leading-tight">
                AI Tutor
              </h1>
              <p className="text-[11px] text-text-muted leading-tight">
                {isSending ? "Thinking..." : "Ask me anything"}
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1">
            {/* Mobile: toggle history (opens as overlay or could be extended) */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsHistoryPanelOpen((v) => !v)}
              className="text-text-muted hover:text-text-primary md:hidden"
              aria-label="Toggle conversation history"
            >
              {isHistoryPanelOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="gap-1.5 text-text-muted hover:text-text-primary"
              aria-label="New chat"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden text-xs sm:inline">New Chat</span>
            </Button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="relative flex-1 overflow-hidden">
          <div
            ref={messagesContainerRef}
            className="h-full overflow-y-auto scrollbar-thin"
            role="log"
            aria-label="Conversation"
            aria-live="polite"
          >
            <div className="mx-auto max-w-3xl px-4">
              {!hasMessages ? (
                <AIChatEmptyState
                  onSuggestionClick={handleSuggestionClick}
                  className="min-h-[60vh]"
                />
              ) : (
                <AIChatMessages
                  messages={messages}
                  isStreaming={isStreaming}
                  topBanner={
                    showCrisisBanner ? <CrisisBanner onDismiss={dismissCrisisBanner} /> : null
                  }
                  className="pb-4"
                />
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="mx-auto w-full max-w-3xl px-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              <div className="mb-3 rounded-xl border border-accent-danger/20 bg-accent-danger/5 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 text-sm text-accent-danger">{error}</p>
                  <button
                    type="button"
                    onClick={clearError}
                    className="text-xs font-medium text-accent-danger underline-offset-4 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Proactive Hint */}
        <AnimatePresence>
          {proactiveHint && (
            <motion.div
              className="mx-auto w-full max-w-3xl px-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
            >
              <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-300/40 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    Need a hint?
                  </p>
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    {proactiveHint.message}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setInputValue(proactiveHint.message)}
                >
                  Use hint
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sticky Bottom Input */}
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
          className="flex-shrink-0 border-t border-border-default bg-bg-base/80 backdrop-blur-md"
          messagesContainerRef={messagesContainerRef}
        />
      </div>

      {/* ====== MOBILE: History Panel Overlay ====== */}
      <AnimatePresence>
        {isHistoryPanelOpen && (
          <motion.div
            className="fixed inset-0 z-40 flex md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsHistoryPanelOpen(false)}
              aria-hidden="true"
            />

            {/* Panel */}
            <motion.aside
              className="relative z-50 w-[280px] shrink-0 bg-bg-surface shadow-[var(--shadow-elevated)]"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <ConversationHistoryPanel
                sessions={sessions}
                activeSessionId={activeSessionId}
                isLoadingSessions={isLoadingSessions}
                onSelectSession={(id) => {
                  void handleSelectSession(id);
                  setIsHistoryPanelOpen(false);
                }}
                onNewChat={() => {
                  handleNewChat();
                  setIsHistoryPanelOpen(false);
                }}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
