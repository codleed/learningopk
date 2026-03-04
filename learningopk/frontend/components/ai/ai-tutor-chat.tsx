"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

import { DashboardChromeHeader } from "@/components/dashboard/dashboard-chrome-layout";
import { MarkdownMathRenderer } from "@/components/learn/markdown-math-renderer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
const createMessageId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

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

export function AITutorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);
  const [isLoadingHistoryList, setIsLoadingHistoryList] = useState(true);
  const [isLoadingSessionMessages, setIsLoadingSessionMessages] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  const placeholder = useMemo(() => {
    if (messages.length > 0) {
      return "Ask a follow-up question...";
    }
    return "Ask anything about studies, concepts, exams, or practice strategy...";
  }, [messages.length]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

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

  const startFreshChat = () => {
    setMessages([]);
    setSessionId(null);
    setInputValue("");
    setError(null);
  };

  const onSelectSession = async (targetSessionId: string) => {
    if (isSending || targetSessionId === sessionId) {
      return;
    }

    await loadSessionMessages(targetSessionId);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = inputValue.trim();

    if (!trimmed || isSending) {
      return;
    }

    setIsSending(true);
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
    }
  };

  return (
    <section
      className={cn(
        "grid min-w-0 gap-4 xl:items-start",
        isHistoryVisible ? "xl:grid-cols-[minmax(0,1fr)_19rem]" : "xl:grid-cols-[minmax(0,1fr)_auto]"
      )}
    >
      <div className="min-w-0 space-y-4">
        <DashboardChromeHeader
          eyebrow="AI"
          title="AI Tutor"
          subtitle="Get general learning support, concept clarity, and exam-focused study guidance."
        />

        <div className="surface-card flex h-[72vh] min-h-[34rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-border xl:h-[calc(100vh-2.5rem)]">
          <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">General Tutor</p>
              <h2 className="text-lg font-semibold text-foreground">Always-on AI study assistant</h2>
            </div>
          </header>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto bg-muted/10 px-5 py-5">
              {isLoadingSessionMessages ? (
                <p className="text-sm text-muted-foreground">Loading conversation...</p>
              ) : null}

              {!isLoadingSessionMessages && messages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-6">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">Start learning with AI Tutor</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ask for concept explanations, practice plans, quiz revision tips, or step-by-step guidance.
                  </p>
                </div>
              ) : null}

              {messages.map((message) => (
                <article
                  key={message.id}
                  className={[
                    "max-w-[88%] break-words rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-[var(--elevation-soft)] [overflow-wrap:anywhere]",
                    message.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "border border-border bg-card text-foreground"
                  ].join(" ")}
                >
                  {message.role === "assistant" ? (
                    message.content ? (
                      <MarkdownMathRenderer
                        content={message.content}
                        forceWrap
                        className="text-sm [&_.katex-display]:overflow-x-visible [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                      />
                    ) : (
                      "Thinking..."
                    )
                  ) : (
                    message.content
                  )}
                </article>
              ))}

              {error ? (
                <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
              ) : null}

              <div ref={endOfMessagesRef} />
            </div>

            <form onSubmit={onSubmit} className="border-t border-border bg-card px-5 py-4">
              <label
                htmlFor="ai-tutor-input"
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
              >
                Ask AI tutor
              </label>
              <Textarea
                id="ai-tutor-input"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                rows={3}
                disabled={isSending}
                placeholder={placeholder}
                className="resize-none"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {isSending ? "Streaming response..." : "Clear, concise, exam-focused help."}
                </p>
                <Button type="submit" disabled={isSending || inputValue.trim().length === 0}>
                  {isSending ? "Sending..." : "Send"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="xl:sticky xl:top-4 xl:self-start">
        {isHistoryVisible ? (
          <aside
            aria-label="Chat history sidebar"
            className="surface-card flex min-h-[18rem] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card/90 xl:h-[calc(100vh-2.5rem)] xl:w-[19rem]"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">History</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsHistoryVisible(false)}
                aria-label="Hide chat history"
              >
                Hide
              </Button>
            </div>

            <div className="border-b border-border px-3 py-3">
              <Button type="button" variant="secondary" size="sm" width="full" onClick={startFreshChat} disabled={isSending}>
                New Chat
              </Button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-2 py-2">
              {isLoadingHistoryList ? <p className="px-2 py-1 text-xs text-muted-foreground">Loading history...</p> : null}

              {!isLoadingHistoryList && sessions.length === 0 ? (
                <p className="px-2 py-1 text-xs text-muted-foreground">No previous chats yet.</p>
              ) : null}

              {sessions.map((session) => {
                const isActive = session.id === sessionId;
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => void onSelectSession(session.id)}
                    disabled={isSending || isLoadingSessionMessages}
                    className={cn(
                      "w-full rounded-xl border px-3 py-2 text-left transition",
                      isActive
                        ? "border-primary/45 bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground"
                    )}
                  >
                    <p className="truncate text-sm font-medium">{session.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTimestamp(session.lastMessageAt)}</p>
                  </button>
                );
              })}
            </div>
          </aside>
        ) : (
          <div className="surface-card flex items-center rounded-2xl border border-border bg-card/90 p-2 xl:min-h-[3rem]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsHistoryVisible(true)}
              aria-label="Show chat history"
            >
              Show History
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
