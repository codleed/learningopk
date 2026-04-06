// learningopk/frontend/src/components/ai/ai-unified-chat/hooks/use-ai-chat.ts

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage } from '../types';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

const createMessageId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type AIChatErrorResponse = {
  error?: string;
  reason?: string;
  retryAfterSeconds?: number;
  sessionId?: string;
};

type ProactiveHint = {
  topic: string;
  message: string;
  reasons: string[];
};

const formatAssistantError = (payload: AIChatErrorResponse | null, fallback: string): string => {
  if (!payload) return fallback;
  const reasonSuffix = payload.reason ? ` (${payload.reason})` : '';
  const retrySuffix = typeof payload.retryAfterSeconds === 'number' 
    ? ` Try again in ${payload.retryAfterSeconds} seconds.` 
    : '';
  return `${payload.error ?? fallback}${reasonSuffix}${retrySuffix}`;
};

export function useAIChat(chapterId?: number, existingSessionId?: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(existingSessionId ?? null);
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proactiveHint, setProactiveHint] = useState<ProactiveHint | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setIsSending(true);
    setIsStreaming(true);
    setError(null);
    
    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: trimmed,
    };
    
    const assistantMessageId = createMessageId();
    const pendingAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
    };
    
    const requestMessages = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));
    
    setMessages((prev) => [...prev, userMessage, pendingAssistantMessage]);
    
    try {
      const response = await fetch(`${backendUrl}/api/ai/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: requestMessages,
          chapterId,
          sessionId: sessionId ?? undefined,
        }),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as AIChatErrorResponse | null;
        if (payload?.sessionId) setSessionId(payload.sessionId);
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
        setError(formatAssistantError(payload, `AI request failed with status ${response.status}.`));
        return;
      }
      
      const responseSessionId = response.headers.get('x-ai-session-id');
      const proactiveHintHeader = response.headers.get('x-ai-proactive-hint');
      if (responseSessionId) setSessionId(responseSessionId);
      if (proactiveHintHeader) {
        try {
          setProactiveHint(JSON.parse(decodeURIComponent(proactiveHintHeader)) as ProactiveHint);
        } catch {
          // Ignore malformed hint headers.
        }
      }
      
      if (!response.body) {
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
        setError('AI response stream was empty.');
        return;
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        assistantText += decoder.decode(chunk.value, { stream: true });
        const latestText = assistantText;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMessageId ? { ...m, content: latestText } : m))
        );
      }
      
      assistantText += decoder.decode();
      if (assistantText.trim().length === 0) {
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
        setError('AI did not return any text. Please try again.');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, don't show error
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
      setError('Unable to reach AI service. Please try again.');
    } finally {
      setIsSending(false);
      setIsStreaming(false);
    }
  }, [messages, sessionId, chapterId, isSending]);
  
  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
    setProactiveHint(null);
  }, []);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  const setMessagesFromSession = useCallback((sessionMessages: ChatMessage[], newSessionId: string) => {
    setMessages(sessionMessages);
    setSessionId(newSessionId);
    setError(null);
  }, []);
  
  return {
    messages,
    sessionId,
    isSending,
    isStreaming,
      error,
      proactiveHint,
      sendMessage,
    clearMessages,
    clearError,
    setMessagesFromSession,
  };
}
