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
    setIsLoadingSessions(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'}/api/ai/sessions/${sessionId}/messages`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load session');
      
      const payload = await response.json();
      const sessionMessages = payload.messages.map((m: { id: string; role: 'user' | 'assistant'; content: string; createdAt: string }) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      }));
      
      chat.setMessagesFromSession(sessionMessages, sessionId);
    } catch (err) {
      chat.clearError();
    } finally {
      setIsLoadingSessions(false);
      setIsHistoryOpen(false);
    }
  }, [chat]);
  
  const value = useMemo<AIChatContextValue>(() => ({
    messages: chat.messages,
    sessionId: chat.sessionId,
    isStreaming: chat.isStreaming,
    isSending: chat.isSending,
    error: chat.error,
    proactiveHint: chat.proactiveHint,
    
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
    dismissFirstVisit: persistence.dismissFirstVisit,
  }), [
    chat.messages,
    chat.sessionId,
    chat.isStreaming,
    chat.isSending,
    chat.error,
    chat.proactiveHint,
    chat.sendMessage,
    chat.clearError,
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
    persistence.dismissFirstVisit,
  ]);
  
  return (
    <AIChatContext.Provider value={value}>
      {children}
    </AIChatContext.Provider>
  );
}
