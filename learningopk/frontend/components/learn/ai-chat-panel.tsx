"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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

export function AIChatPanel({
  chapterId,
  chapterTitle,
  initialPrompt,
  layout = "overlay",
  isOpen = false,
  onClose
}: AIChatPanelProps) {
  const panelIsVisible = layout === "sidebar" ? true : isOpen;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialPrompt || !panelIsVisible) {
      return;
    }
    setInputValue(initialPrompt);
  }, [initialPrompt, panelIsVisible]);

  const placeholderMessage = useMemo(() => {
    if (messages.length > 0) {
      return "Ask a follow-up question...";
    }
    return "Ask your first question...";
  }, [messages.length]);

  const startFreshSession = () => {
    setSessionId(null);
    setMessages([]);
    setInputValue("");
    setError(null);
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
    }
  };

  if (!panelIsVisible) {
    return null;
  }

  const panelBody = (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">AI Tutor</p>
            <h2 className="text-lg font-semibold text-foreground">{chapterTitle}</h2>
          </div>
          {layout === "overlay" && onClose ? (
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={startFreshSession}>
            Start Fresh Session
          </Button>
          {sessionId ? <p className="self-center text-xs text-muted-foreground">Session active</p> : null}
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Ask a question and the tutor will guide you step-by-step before revealing the final method.
          </div>
        ) : null}

        {messages.map((message) => (
          <div
            key={message.id}
            className={[
              "max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed",
              message.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-zinc-100 text-foreground dark:bg-zinc-800"
            ].join(" ")}
          >
            {message.content || (message.role === "assistant" ? "Thinking..." : "")}
          </div>
        ))}

        {error ? <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      </div>

      <form onSubmit={onSubmit} className="border-t border-border p-4">
        <label htmlFor="ai-chat-input" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ask AI tutor
        </label>
        <Textarea
          id="ai-chat-input"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          rows={3}
          disabled={isSending}
          placeholder={placeholderMessage}
          className="resize-none"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {isSending ? "Streaming response..." : "Responses are Socratic and concise."}
          </p>
          <Button type="submit" disabled={isSending || inputValue.trim().length === 0}>
            {isSending ? "Sending..." : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );

  if (layout === "sidebar") {
    return (
      <aside className="flex h-[32rem] min-h-[32rem] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--elevation-card)] xl:h-[calc(100vh-9rem)]">
        {panelBody}
      </aside>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close AI panel overlay"
        className="fixed inset-0 z-40 bg-zinc-950/40"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-xl border-l border-border bg-card shadow-[var(--elevation-strong)]">
        {panelBody}
      </aside>
    </>
  );
}
