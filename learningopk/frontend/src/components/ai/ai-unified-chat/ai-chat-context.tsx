"use client";

import { createContext, useContext, useCallback, useMemo, useState, type ReactNode } from "react";
import { useAIChat } from "./hooks/use-ai-chat";
import { useAIPersistence } from "./hooks/use-ai-persistence";
import { detectCrisisKeywords } from "./utils/crisis-detection";
import type { AIContext, AIChatContextValue, ChatSession } from "./types";

const AIChatContext = createContext<AIChatContextValue | null>(null);

export function useAIChatContext(): AIChatContextValue {
  const context = useContext(AIChatContext);
  if (!context) {
    throw new Error("useAIChatContext must be used within AIChatProvider");
  }
  return context;
}

type AIChatProviderProps = {
  children: ReactNode;
  initialContext?: AIContext | null;
};

export function AIChatProvider({ children, initialContext = null }: AIChatProviderProps) {
  const persistence = useAIPersistence();

  const chat = useAIChat(
    initialContext?.chapterId,
    initialContext ? persistence.getChapterSessionId(initialContext.chapterId) : null
  );

  const [context, setContext] = useState<AIContext | null>(initialContext);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  const [showCrisisBanner, setShowCrisisBanner] = useState(false);

  const dismissCrisisBanner = useCallback(() => {
    setShowCrisisBanner(false);
  }, []);

  /**
   * Wraps the underlying chat.sendMessage so we can run client-side crisis
   * keyword detection BEFORE the message is sent (non-blocking — the message
   * still goes through regardless).
   */
  const sendMessageWithCrisisCheck = useCallback(
    async (content: string) => {
      if (detectCrisisKeywords(content)) {
        setShowCrisisBanner(true);
      }
      await chat.sendMessage(content);
    },
    [chat]
  );

  const updateContext = useCallback((newContext: Partial<AIContext>) => {
    setContext((prev) => (prev ? { ...prev, ...newContext } : null));
  }, []);

  const toggleVisibility = useCallback(() => {
    persistence.setVisibility(!persistence.isVisible);
  }, [persistence]);

  const toggleExpanded = useCallback(() => {
    persistence.setExpanded(!persistence.isExpanded);
  }, [persistence]);

  const toggleHistory = useCallback(() => {
    setIsHistoryOpen((prev) => !prev);
  }, []);

  const startNewSession = useCallback(() => {
    setShowCrisisBanner(false);
    chat.clearMessages();
    if (context?.chapterId) {
      persistence.setChapterSessionId(context.chapterId, null);
    }
  }, [chat, context, persistence]);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

  const fetchSessionsList = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const response = await fetch(`${backendUrl}/api/ai/sessions`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load sessions");
      const payload = (await response.json()) as { sessions: ChatSession[] };
      setSessions(payload.sessions ?? []);
    } catch {
      // Silently fail — sessions list is non-critical
    } finally {
      setIsLoadingSessions(false);
    }
  }, [backendUrl]);

  const refreshSessionsList = useCallback(
    async (preferredSessionId?: string | null) => {
      try {
        const response = await fetch(`${backendUrl}/api/ai/sessions`, {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { sessions: ChatSession[] };
        const latestSessions = payload.sessions ?? [];
        setSessions(latestSessions);
      } catch {
        // Silently fail
      }
    },
    [backendUrl]
  );

  const loadSession = useCallback(
    async (sessionId: string) => {
      setIsLoadingSessions(true);
      try {
        const response = await fetch(`${backendUrl}/api/ai/sessions/${sessionId}/messages`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to load session");

        const payload = await response.json();
        const sessionMessages = payload.messages.map(
          (m: { id: string; role: "user" | "assistant"; content: string; createdAt: string }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          })
        );

        setShowCrisisBanner(false);
        chat.setMessagesFromSession(sessionMessages, sessionId);
      } catch {
        chat.clearError();
      } finally {
        setIsLoadingSessions(false);
        setIsHistoryOpen(false);
      }
    },
    [chat, backendUrl]
  );

  const value = useMemo<AIChatContextValue>(
    () => ({
      messages: chat.messages,
      sessionId: chat.sessionId,
      isStreaming: chat.isStreaming,
      isSending: chat.isSending,
      error: chat.error,
      stoppedStatus: chat.stoppedStatus,
      proactiveHint: chat.proactiveHint,

      rateLimitRemaining: chat.rateLimitRemaining,
      rateLimitTotal: chat.rateLimitTotal,

      context,
      updateContext,

      isVisible: persistence.isVisible,
      isExpanded: persistence.isExpanded,
      isHistoryOpen,
      isFirstVisit: persistence.isFirstVisit,

      showCrisisBanner,

      sessions,
      activeSessionId: chat.sessionId,
      isLoadingSessions,

      sendMessage: sendMessageWithCrisisCheck,
      stopGenerating: chat.stopGenerating,
      loadSession,
      startNewSession,
      toggleVisibility,
      toggleExpanded,
      toggleHistory,
      clearError: chat.clearError,
      dismissFirstVisit: persistence.dismissFirstVisit,
      dismissCrisisBanner,
      fetchSessionsList,
      refreshSessionsList,
    }),
    [
      chat.messages,
      chat.sessionId,
      chat.isStreaming,
      chat.isSending,
      chat.error,
      chat.stoppedStatus,
      chat.proactiveHint,
      chat.rateLimitRemaining,
      chat.rateLimitTotal,
      sendMessageWithCrisisCheck,
      chat.stopGenerating,
      chat.clearError,
      context,
      updateContext,
      persistence.isVisible,
      persistence.isExpanded,
      persistence.isFirstVisit,
      isHistoryOpen,
      showCrisisBanner,
      sessions,
      isLoadingSessions,
      loadSession,
      startNewSession,
      toggleVisibility,
      toggleExpanded,
      toggleHistory,
      persistence.dismissFirstVisit,
      dismissCrisisBanner,
      fetchSessionsList,
      refreshSessionsList,
    ]
  );

  return <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>;
}
