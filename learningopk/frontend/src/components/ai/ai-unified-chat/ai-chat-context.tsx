'use client';

import { createContext, useContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import { useAIChat } from './hooks/use-ai-chat';
import { useAIPersistence } from './hooks/use-ai-persistence';
import type { AIContext, AIChatContextValue, ChatSession } from './types';

const AIChatContext = createContext<AIChatContextValue | null>(null);

export function useAIChatContext(): AIChatContextValue {
  const context = useContext(AIChatContext);
  if (!context) {
    throw new Error('useAIChatContext must be used within AIChatProvider');
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
  
  const updateContext = useCallback((newContext: Partial<AIContext>) => {
    setContext((prev) => prev ? { ...prev, ...newContext } : null);
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
    chat.clearMessages();
    if (context?.chapterId) {
      persistence.setChapterSessionId(context.chapterId, '');
    }
  }, [chat, context, persistence]);
  
  const loadSession = useCallback(async (sessionId: string) => {
    setIsHistoryOpen(false);
  }, []);
  
  const value = useMemo<AIChatContextValue>(() => ({
    messages: chat.messages,
    sessionId: chat.sessionId,
    isStreaming: chat.isStreaming,
    isSending: chat.isSending,
    error: chat.error,
    
    context,
    updateContext,
    
    isVisible: persistence.isVisible,
    isExpanded: persistence.isExpanded,
    isHistoryOpen,
    isFirstVisit: persistence.isFirstVisit,
    
    sessions,
    activeSessionId: chat.sessionId,
    isLoadingSessions,
    
    sendMessage: chat.sendMessage,
    loadSession,
    startNewSession,
    toggleVisibility,
    toggleExpanded,
    toggleHistory,
    clearError: chat.clearError,
  }), [
    chat,
    context,
    updateContext,
    persistence.isVisible,
    persistence.isExpanded,
    persistence.isFirstVisit,
    isHistoryOpen,
    sessions,
    isLoadingSessions,
    loadSession,
    startNewSession,
    toggleVisibility,
    toggleExpanded,
    toggleHistory,
  ]);
  
  return (
    <AIChatContext.Provider value={value}>
      {children}
    </AIChatContext.Provider>
  );
}
