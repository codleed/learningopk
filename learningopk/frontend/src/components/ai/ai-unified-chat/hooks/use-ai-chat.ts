// learningopk/frontend/src/components/ai/ai-unified-chat/hooks/use-ai-chat.ts

import { useState, useCallback, useEffect, useRef } from "react";
import { normalizeSessionId } from "@learningopk/shared/utils";
import type { ChatMessage } from "../types";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

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
  const reasonSuffix = payload.reason ? ` (${payload.reason})` : "";
  const retrySuffix =
    typeof payload.retryAfterSeconds === "number"
      ? ` Try again in ${payload.retryAfterSeconds} seconds.`
      : "";
  return `${payload.error ?? fallback}${reasonSuffix}${retrySuffix}`;
};

/** Duration in ms to show the "Generation stopped" status */
const STOPPED_STATUS_DURATION = 3000;

export function useAIChat(chapterId?: number, existingSessionId?: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(() =>
    normalizeSessionId(existingSessionId)
  );
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stoppedStatus, setStoppedStatus] = useState<string | null>(null);
  const [proactiveHint, setProactiveHint] = useState<ProactiveHint | null>(null);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
  const [rateLimitTotal, setRateLimitTotal] = useState<number | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const stoppedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (stoppedTimerRef.current) {
        clearTimeout(stoppedTimerRef.current);
      }
    };
  }, []);

  /** Extract rate-limit info from response headers */
  const extractRateLimitHeaders = useCallback((response: Response) => {
    const remaining = response.headers.get("x-ratelimit-remaining");
    const limit = response.headers.get("x-ratelimit-limit");
    if (remaining !== null) {
      const parsed = parseInt(remaining, 10);
      if (!Number.isNaN(parsed)) setRateLimitRemaining(parsed);
    }
    if (limit !== null) {
      const parsed = parseInt(limit, 10);
      if (!Number.isNaN(parsed)) setRateLimitTotal(parsed);
    }
  }, []);

  const stopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSending(false);
    setIsStreaming(false);

    // Show brief "Generation stopped" status
    setStoppedStatus("Generation stopped");
    if (stoppedTimerRef.current) clearTimeout(stoppedTimerRef.current);
    stoppedTimerRef.current = setTimeout(() => {
      setStoppedStatus(null);
    }, STOPPED_STATUS_DURATION);
  }, []);

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      const trimmed = content.trim();
      if (!trimmed || isSending) return;

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsSending(true);
      setIsStreaming(true);
      setError(null);
      setStoppedStatus(null);
      if (stoppedTimerRef.current) clearTimeout(stoppedTimerRef.current);

      const userMessage: ChatMessage = {
        id: createMessageId(),
        role: "user",
        content: trimmed,
      };

      const assistantMessageId = createMessageId();
      const pendingAssistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      };

      const requestMessages = [...messages, userMessage]
        .map((m) => ({
          role: m.role,
          content: m.content,
        }))
        .filter((m) => m.content.trim().length > 0);

      setMessages((prev) => [...prev, userMessage, pendingAssistantMessage]);

      try {
        const requestBody = {
          messages: requestMessages,
          chapterId,
          sessionId: normalizeSessionId(sessionId) ?? undefined,
        };

        // Diagnostic: log the exact payload to help trace 400 errors
        if (process.env.NODE_ENV === "development") {
          console.log("[ai-chat] request body:", JSON.stringify(requestBody, null, 2));
        }

        const response = await fetch(`${backendUrl}/api/ai/chat`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        });

        // Extract rate limit headers from every response
        extractRateLimitHeaders(response);

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as AIChatErrorResponse | null;
          // Diagnostic: log full error payload including Zod validation details
          if (process.env.NODE_ENV === "development") {
            console.error(
              "[ai-chat] error response:",
              response.status,
              JSON.stringify(payload, null, 2)
            );
          }
          if (payload?.sessionId) setSessionId(payload.sessionId);
          setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
          setError(
            formatAssistantError(payload, `AI request failed with status ${response.status}.`)
          );
          return;
        }

        const responseSessionId = response.headers.get("x-ai-session-id");
        const proactiveHintHeader = response.headers.get("x-ai-proactive-hint");
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
          setError("AI response stream was empty.");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantText = "";

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
          setError("AI did not return any text. Please try again.");
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was cancelled by user — keep partial content if any
          setMessages((prev) => {
            const assistantMsg = prev.find((m) => m.id === assistantMessageId);
            if (assistantMsg && assistantMsg.content.trim().length === 0) {
              return prev.filter((m) => m.id !== assistantMessageId);
            }
            return prev;
          });
          return;
        }
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
        setError("Unable to reach AI service. Please try again.");
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
        setIsSending(false);
        setIsStreaming(false);
      }
    },
    [messages, sessionId, chapterId, isSending, extractRateLimitHeaders]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
    setProactiveHint(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setMessagesFromSession = useCallback(
    (sessionMessages: ChatMessage[], newSessionId: string) => {
      setMessages(sessionMessages);
      setSessionId(newSessionId);
      setError(null);
    },
    []
  );

  return {
    messages,
    sessionId,
    isSending,
    isStreaming,
    error,
    stoppedStatus,
    proactiveHint,
    rateLimitRemaining,
    rateLimitTotal,
    sendMessage,
    stopGenerating,
    clearMessages,
    clearError,
    setMessagesFromSession,
  };
}
