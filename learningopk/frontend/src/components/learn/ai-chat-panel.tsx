"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);

  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const focusedMessageIndex = useRef<number | null>(null);

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
        className={cn("space-y-3 px-3 py-3", usePanelLevelScroll ? "" : "min-h-0 flex-1 overflow-y-auto")}
      >
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Ask a question and the tutor will guide you step-by-step before revealing the final method.
          </div>
        ) : null}

        {messages.map((message, idx) => (
          <div
            key={message.id}
            ref={(el) => { messageRefs.current[idx] = el; }}
            tabIndex={0}
            role="article"
            aria-label={`${message.role} message: ${message.content.substring(0, 50)}${message.content.length > 50 ? "..." : ""}`}
            className={[
              "break-words rounded-xl px-3 py-2 text-sm leading-relaxed [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2",
              message.role === "user"
                ? "ml-auto w-fit min-w-[4.5rem] max-w-[72%] bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "max-w-[90%] bg-muted text-foreground"
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
          </div>
        ))}

        {error ? <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      </div>

      <form onSubmit={onSubmit} className="border-t border-border p-3">
        <label htmlFor="ai-chat-input" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ask AI tutor
        </label>
        <Textarea
          id="ai-chat-input"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          rows={2}
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
