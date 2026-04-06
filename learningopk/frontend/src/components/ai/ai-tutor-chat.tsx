"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bot,
  Sparkles,
  ArrowUp,
  Loader2,
  Plus,
  ChevronDown,
  AlertCircle,
  BookOpen,
  BrainCircuit,
  GraduationCap,
  Lightbulb,
  MessageSquareText,
  PanelRightClose,
  PanelRightOpen,
  Settings2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabList,
  TabTrigger,
} from "@/components/ui/tabs";
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
  proactiveHint: {
    topic: string;
    message: string;
    reasons: string[];
  } | null;
};

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

type TutorMode = "explain" | "socratic";

// ============================================================================
// Constants
// ============================================================================

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const createMessageId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const CONVERSATION_STARTERS = [
  {
    label: "Explain a concept simply",
    prompt: "Explain a concept in simple terms",
    icon: Lightbulb,
  },
  {
    label: "Help me study for an exam",
    prompt: "Help me study for my exam",
    icon: GraduationCap,
  },
  {
    label: "Create a study schedule",
    prompt: "Create a study schedule",
    icon: BookOpen,
  },
  {
    label: "Quiz me on a topic",
    prompt: "Quiz me on a topic",
    icon: BrainCircuit,
  },
];

// ============================================================================
// Utilities
// ============================================================================

const formatRelativeTimestamp = (value: string): string => {
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
};

const formatAssistantError = (
  payload: AIChatErrorResponse | null,
  fallback: string
): string => {
  if (!payload) return fallback;
  const reasonSuffix = payload.reason ? ` (${payload.reason})` : "";
  const retrySuffix =
    typeof payload.retryAfterSeconds === "number"
      ? ` Try again in ${payload.retryAfterSeconds} seconds.`
      : "";
  return `${payload.error ?? fallback}${reasonSuffix}${retrySuffix}`;
};

// ============================================================================
// Typing Indicator — Framer Motion stagger animation
// ============================================================================

function TypingIndicator({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-1.5 py-1", className)}
      aria-label="AI is typing"
      role="status"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-accent-primary"
          initial={{ opacity: 0.3, scale: 0.8 }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.15, 0.8] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">AI is typing</span>
    </div>
  );
}

// ============================================================================
// Message Bubble
// ============================================================================

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  isFirstInGroup?: boolean;
}

function MessageBubble({
  message,
  isStreaming,
  isFirstInGroup = true,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isEmpty = !message.content;

  return (
    <motion.div
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* AI Avatar */}
      {!isUser && isFirstInGroup && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-primary/10 ring-1 ring-accent-primary/20">
          <Bot className="h-4 w-4 text-accent-primary" aria-hidden="true" />
        </div>
      )}
      {!isUser && !isFirstInGroup && <div className="w-8 shrink-0" />}

      {/* Bubble */}
      <article
        className={cn(
          "max-w-[80%]",
          "px-4 py-3",
          "text-[15px] leading-relaxed",
          isUser
            ? "bg-accent-primary-light text-text-primary rounded-2xl rounded-br-sm"
            : "bg-bg-surface text-text-primary border border-border-default rounded-2xl rounded-bl-sm"
        )}
        aria-label={
          message.content
            ? `${isUser ? "You" : "AI Tutor"}: ${message.content.slice(0, 50)}...`
            : `${isUser ? "You" : "AI Tutor"}`
        }
      >
        {isUser ? (
          <div className="break-words [overflow-wrap:anywhere]">
            {message.content}
          </div>
        ) : isEmpty && isStreaming ? (
          <TypingIndicator />
        ) : (
          <div className="[overflow-wrap:anywhere] [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
            <MarkdownRenderer
              content={message.content}
              className="text-[15px] leading-relaxed"
            />
          </div>
        )}
      </article>
    </motion.div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

interface EmptyStateProps {
  starters: typeof CONVERSATION_STARTERS;
  onStarterClick: (prompt: string) => void;
}

function EmptyState({ starters, onStarterClick }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        {/* Icon */}
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-primary/10 ring-1 ring-accent-primary/20">
          <Sparkles className="h-8 w-8 text-accent-primary" aria-hidden="true" />
        </div>

        {/* Title */}
        <h2 className="mb-2 text-center font-[family-name:var(--font-display)] text-2xl font-bold text-text-primary tracking-tight">
          How can I help you learn?
        </h2>

        {/* Subtitle */}
        <p className="mb-10 max-w-sm text-center text-sm text-text-secondary">
          Ask about concepts, create study plans, get exam tips, or explore any
          topic you&apos;re curious about.
        </p>

        {/* Starter chips */}
        <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
          {starters.map((starter, index) => {
            const Icon = starter.icon;
            return (
              <motion.button
                key={starter.label}
                type="button"
                onClick={() => onStarterClick(starter.prompt)}
                className={cn(
                  "group flex items-center gap-3",
                  "w-full rounded-xl px-4 py-3.5",
                  "border border-border-default bg-bg-surface",
                  "text-left text-sm font-medium text-text-primary",
                  "shadow-[var(--shadow-sm)]",
                  "transition-all duration-200",
                  "hover:border-accent-primary/40 hover:bg-accent-primary-light hover:shadow-[var(--shadow-card)]",
                  "active:scale-[0.98]"
                )}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 + index * 0.07 }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-text-muted group-hover:bg-accent-primary/10 group-hover:text-accent-primary transition-colors duration-200">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>{starter.label}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Scroll-to-Bottom Button
// ============================================================================

function ScrollToBottomButton({
  isVisible,
  onClick,
}: {
  isVisible: boolean;
  onClick: () => void;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          onClick={onClick}
          className={cn(
            "absolute bottom-28 left-1/2 z-30 -translate-x-1/2",
            "flex items-center gap-1.5",
            "rounded-full px-4 py-2",
            "border border-border-default bg-bg-surface",
            "shadow-[var(--shadow-card)]",
            "text-[13px] font-medium text-text-secondary",
            "hover:text-text-primary hover:shadow-[var(--shadow-elevated)]",
            "transition-colors duration-150"
          )}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          aria-label="Scroll to latest messages"
        >
          <ChevronDown className="h-4 w-4" />
          <span>New messages</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Context Panel (Right Column — Desktop)
// ============================================================================

interface ContextPanelProps {
  mode: TutorMode;
  onModeChange: (mode: TutorMode) => void;
  starters: typeof CONVERSATION_STARTERS;
  onStarterClick: (prompt: string) => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  isLoadingSessions: boolean;
}

function ContextPanel({
  mode,
  onModeChange,
  starters,
  onStarterClick,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  isLoadingSessions,
}: ContextPanelProps) {
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
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-border-default bg-bg-surface">
      {/* Panel Header */}
      <div className="flex items-center gap-2 border-b border-border-default px-5 py-4">
        <Settings2 className="h-4 w-4 text-text-muted" aria-hidden="true" />
        <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold text-text-primary">
          Context
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Mode Toggle */}
        <div className="border-b border-border-default px-5 py-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Tutor Mode
          </p>
          <Tabs
            value={mode}
            onValueChange={(v) => onModeChange(v as TutorMode)}
          >
            <TabList variant="pills" className="w-full">
              <TabTrigger
                value="explain"
                variant="pills"
                layoutId="tutor-mode"
                className="flex-1 text-xs"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Explain
              </TabTrigger>
              <TabTrigger
                value="socratic"
                variant="pills"
                layoutId="tutor-mode"
                className="flex-1 text-xs"
              >
                <BrainCircuit className="h-3.5 w-3.5" aria-hidden="true" />
                Socratic
              </TabTrigger>
            </TabList>
          </Tabs>
          <p className="mt-2 text-[11px] text-text-muted leading-relaxed">
            {mode === "explain"
              ? "Direct explanations with examples and breakdowns."
              : "Guided questioning to help you discover answers yourself."}
          </p>
        </div>

        {/* Conversation Starters */}
        <div className="border-b border-border-default px-5 py-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Quick Prompts
          </p>
          <div className="flex flex-col gap-2">
            {starters.map((starter) => {
              const Icon = starter.icon;
              return (
                <button
                  key={starter.label}
                  type="button"
                  onClick={() => onStarterClick(starter.prompt)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5",
                    "text-left text-[13px] font-medium text-text-secondary",
                    "hover:bg-bg-subtle hover:text-text-primary",
                    "transition-colors duration-150",
                    "active:scale-[0.98]"
                  )}
                >
                  <Icon
                    className="h-3.5 w-3.5 shrink-0 text-text-muted"
                    aria-hidden="true"
                  />
                  {starter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat History */}
        <div className="px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Chat History
            </p>
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

          {isLoadingSessions ? (
            <div className="flex items-center justify-center py-6">
              <Spinner size="sm" label="Loading sessions" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-6 text-center">
              <MessageSquareText className="mx-auto mb-2 h-8 w-8 text-text-muted/40" />
              <p className="text-xs text-text-muted">No conversations yet</p>
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
    </aside>
  );
}

// ============================================================================
// Session Group + Item
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
// Mobile Context Sheet (Right panel collapsed)
// ============================================================================

interface MobileContextSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: TutorMode;
  onModeChange: (mode: TutorMode) => void;
  starters: typeof CONVERSATION_STARTERS;
  onStarterClick: (prompt: string) => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  isLoadingSessions: boolean;
}

function MobileContextSheet({
  open,
  onOpenChange,
  mode,
  onModeChange,
  starters,
  onStarterClick,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  isLoadingSessions,
}: MobileContextSheetProps) {
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
    <Sheet open={open} onOpenChange={onOpenChange} side="right">
      <SheetHeader>
        <SheetTitle>Context & History</SheetTitle>
      </SheetHeader>
      <SheetBody className="space-y-6">
        {/* Mode Toggle */}
        <div>
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Tutor Mode
          </p>
          <Tabs
            value={mode}
            onValueChange={(v) => onModeChange(v as TutorMode)}
          >
            <TabList variant="pills" className="w-full">
              <TabTrigger
                value="explain"
                variant="pills"
                layoutId="mobile-tutor-mode"
                className="flex-1 text-xs"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Explain
              </TabTrigger>
              <TabTrigger
                value="socratic"
                variant="pills"
                layoutId="mobile-tutor-mode"
                className="flex-1 text-xs"
              >
                <BrainCircuit className="h-3.5 w-3.5" aria-hidden="true" />
                Socratic
              </TabTrigger>
            </TabList>
          </Tabs>
          <p className="mt-2 text-[11px] text-text-muted leading-relaxed">
            {mode === "explain"
              ? "Direct explanations with examples and breakdowns."
              : "Guided questioning to help you discover answers yourself."}
          </p>
        </div>

        {/* Starters */}
        <div>
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Quick Prompts
          </p>
          <div className="flex flex-col gap-2">
            {starters.map((starter) => {
              const Icon = starter.icon;
              return (
                <button
                  key={starter.label}
                  type="button"
                  onClick={() => {
                    onStarterClick(starter.prompt);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5",
                    "text-left text-[13px] font-medium text-text-secondary",
                    "hover:bg-bg-subtle hover:text-text-primary",
                    "transition-colors duration-150"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                  {starter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat History */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Chat History
            </p>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                onNewChat();
                onOpenChange(false);
              }}
              className="gap-1 text-[11px] text-text-muted hover:text-accent-primary"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              New
            </Button>
          </div>

          {isLoadingSessions ? (
            <div className="flex items-center justify-center py-6">
              <Spinner size="sm" label="Loading sessions" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-6 text-center">
              <MessageSquareText className="mx-auto mb-2 h-8 w-8 text-text-muted/40" />
              <p className="text-xs text-text-muted">No conversations yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {groupedSessions.today.length > 0 && (
                <SessionGroup
                  label="Today"
                  sessions={groupedSessions.today}
                  activeSessionId={activeSessionId}
                  onSelectSession={(id) => {
                    onSelectSession(id);
                    onOpenChange(false);
                  }}
                />
              )}
              {groupedSessions.yesterday.length > 0 && (
                <SessionGroup
                  label="Yesterday"
                  sessions={groupedSessions.yesterday}
                  activeSessionId={activeSessionId}
                  onSelectSession={(id) => {
                    onSelectSession(id);
                    onOpenChange(false);
                  }}
                />
              )}
              {groupedSessions.older.length > 0 && (
                <SessionGroup
                  label="Earlier"
                  sessions={groupedSessions.older}
                  activeSessionId={activeSessionId}
                  onSelectSession={(id) => {
                    onSelectSession(id);
                    onOpenChange(false);
                  }}
                />
              )}
            </div>
          )}
        </div>
      </SheetBody>
    </Sheet>
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
  const [isLoadingHistoryList, setIsLoadingHistoryList] = useState(true);
  const [isLoadingSessionMessages, setIsLoadingSessionMessages] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [tutorMode, setTutorMode] = useState<TutorMode>("explain");
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [isContextPanelVisible, setIsContextPanelVisible] = useState(true);
  const [proactiveHint, setProactiveHint] = useState<ProactiveHint | null>(null);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const placeholder = useMemo(
    () =>
      messages.length > 0
        ? "Ask a follow-up question..."
        : "Ask anything about your studies...",
    [messages.length]
  );

  const hasMessages = messages.length > 0;

  // ---------------------------------------------------------------------------
  // API Functions (preserved from original)
  // ---------------------------------------------------------------------------
  const fetchSessions = useCallback(async (): Promise<ChatSession[]> => {
    const response = await fetch(`${backendUrl}/api/ai/sessions`, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) throw new Error(`Unable to load chat sessions (${response.status}).`);
    const payload = (await response.json()) as AISessionListResponse;
    return payload.sessions ?? [];
  }, []);

  const loadSessionMessages = useCallback(
    async (targetSessionId: string): Promise<void> => {
      setIsLoadingSessionMessages(true);
      try {
        const response = await fetch(
          `${backendUrl}/api/ai/sessions/${targetSessionId}/messages`,
          { method: "GET", credentials: "include" }
        );
        if (!response.ok) throw new Error(`Unable to load session messages (${response.status}).`);
        const payload = (await response.json()) as AISessionMessagesResponse;
        setMessages(
          payload.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        );
        setSessionId(payload.session.id);
        setProactiveHint(payload.proactiveHint);
        setError(null);
      } catch {
        setError("Unable to load this conversation. Please try another session.");
      } finally {
        setIsLoadingSessionMessages(false);
      }
    },
    []
  );

  const refreshSessions = useCallback(
    async (preferredSessionId?: string | null): Promise<void> => {
      try {
        const latestSessions = await fetchSessions();
        setSessions(latestSessions);
        if (
          preferredSessionId &&
          latestSessions.some((s) => s.id === preferredSessionId)
        ) {
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
        if (isCancelled) return;
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
        if (!isCancelled) setIsLoadingHistoryList(false);
      }
    };

    void loadInitialHistory();
    return () => {
      isCancelled = true;
    };
  }, [fetchSessions, loadSessionMessages]);

  // Auto-scroll
  useEffect(() => {
    if (messages.length > 0 && !showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, showScrollButton]);

  // Scroll tracking
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 200);
  }, []);

  // Focus textarea
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
      setProactiveHint(null);
      setInputValue("");
      setError(null);
    textareaRef.current?.focus();
  }, []);

  const onSelectSession = useCallback(
    async (targetSessionId: string) => {
      if (isSending || targetSessionId === sessionId) return;
      await loadSessionMessages(targetSessionId);
      textareaRef.current?.focus();
    },
    [isSending, sessionId, loadSessionMessages]
  );

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      // Max 4 lines ~= 112px
      textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`;
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
    if (!trimmed || isSending) return;

    setIsSending(true);
    setIsStreaming(true);
    setError(null);

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

    const requestMessages = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMessage, pendingAssistantMessage]);
    setInputValue("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await fetch(`${backendUrl}/api/ai/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: requestMessages,
          mode: tutorMode,
          sessionId: sessionId ?? undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as AIChatErrorResponse | null;
        if (payload?.sessionId) {
          setSessionId(payload.sessionId);
          void refreshSessions(payload.sessionId);
        }
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
        setError(
          formatAssistantError(payload, `AI request failed with status ${response.status}.`)
        );
        return;
      }

      const responseSessionId = response.headers.get("x-ai-session-id");
      const proactiveHintHeader = response.headers.get("x-ai-proactive-hint");
      if (responseSessionId) {
        setSessionId(responseSessionId);
        void refreshSessions(responseSessionId);
      }
      if (proactiveHintHeader) {
        try {
          const parsedHint = JSON.parse(decodeURIComponent(proactiveHintHeader)) as ProactiveHint;
          setProactiveHint(parsedHint);
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
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, content: latestText } : m
          )
        );
      }

      assistantText += decoder.decode();
      if (assistantText.trim().length === 0) {
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
        setError("AI did not return any text. Please try again.");
      } else {
        void refreshSessions(responseSessionId ?? sessionId);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
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
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-[calc(100vh-var(--shell-header-height,0px))] h-dvh flex-row bg-bg-base">
      {/* ====== LEFT: Chat Area (flex-1) ====== */}
      <div className="relative flex flex-1 flex-col">
        {/* Chat Header */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border-default bg-bg-base/80 px-4 backdrop-blur-md">
          {/* Left */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10">
              <Sparkles
                className="h-4 w-4 text-accent-primary"
                aria-hidden="true"
              />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-sm font-semibold text-text-primary leading-tight">
                AI Tutor
              </h1>
              <p className="text-[11px] text-text-muted leading-tight">
                {tutorMode === "explain" ? "Explain mode" : "Socratic mode"}
                {isSending && " · Thinking..."}
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1">
            {/* Mobile: Open context sheet */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileSheetOpen(true)}
              className="lg:hidden text-text-muted hover:text-text-primary"
              aria-label="Open context panel"
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>

            {/* Desktop: Toggle context panel */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsContextPanelVisible((v) => !v)}
              className="hidden lg:inline-flex text-text-muted hover:text-text-primary"
              aria-label={isContextPanelVisible ? "Hide context panel" : "Show context panel"}
            >
              {isContextPanelVisible ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={startFreshChat}
              className="gap-1.5 text-text-muted hover:text-text-primary"
              aria-label="New chat"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">New Chat</span>
            </Button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="relative flex-1 overflow-hidden">
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto scrollbar-thin"
            role="log"
            aria-label="Conversation"
            aria-live="polite"
          >
            <div className="mx-auto max-w-3xl px-4">
              {isLoadingSessionMessages ? (
                <div className="flex h-full min-h-[50vh] items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Spinner size="md" label="Loading conversation" />
                    <span className="text-sm text-text-muted">
                      Loading conversation...
                    </span>
                  </div>
                </div>
              ) : !hasMessages ? (
                <EmptyState
                  starters={CONVERSATION_STARTERS}
                  onStarterClick={handleSuggestionClick}
                />
              ) : (
                <div className="pb-8 pt-4">
                  <div className="space-y-1">
                    {messages.map((message, index) => {
                      const prevMessage = messages[index - 1];
                      const isFirstInGroup =
                        index === 0 || prevMessage?.role !== message.role;
                      const isMessageStreaming =
                        isStreaming &&
                        message.id === messages[messages.length - 1]?.id &&
                        !message.content;

                      return (
                        <div
                          key={message.id}
                          className={cn(isFirstInGroup ? "pt-4" : "pt-1")}
                        >
                          <MessageBubble
                            message={message}
                            isStreaming={isMessageStreaming}
                            isFirstInGroup={isFirstInGroup}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        className="mx-auto mt-4 max-w-[85%] rounded-xl border border-accent-danger/20 bg-accent-danger-light px-4 py-3"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                      >
                        <div className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-danger" />
                          <p className="flex-1 text-sm text-accent-danger">
                            {error}
                          </p>
                          <button
                            type="button"
                            onClick={() => setError(null)}
                            className="text-xs font-medium text-accent-danger underline-offset-4 hover:underline"
                          >
                            Dismiss
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Scroll to bottom */}
          <ScrollToBottomButton
            isVisible={showScrollButton && hasMessages}
            onClick={scrollToBottom}
          />
        </div>

        {/* Sticky Bottom Input Bar */}
        <div className="sticky bottom-0 border-t border-border-default bg-bg-base/80 backdrop-blur-md">
          <div className="mx-auto max-w-3xl px-4 py-3">
            {/* Subject context pill */}
            {tutorMode === "socratic" && (
              <div className="mb-2">
                <Badge variant="primary" size="sm">
                  <BrainCircuit className="h-3 w-3" aria-hidden="true" />
                  Socratic Mode
                </Badge>
              </div>
            )}

            <form onSubmit={onSubmit} className="relative">
              <AnimatePresence>
                {proactiveHint ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-left dark:border-amber-500/20 dark:bg-amber-500/10"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Need a hint?</p>
                      <p className="text-sm text-amber-900 dark:text-amber-100">{proactiveHint.message}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setInputValue(proactiveHint.message)}
                    >
                      Need a hint?
                    </Button>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div
                className={cn(
                  "flex items-end gap-2",
                  "rounded-2xl",
                  "border border-border-default bg-bg-surface",
                  "shadow-[var(--shadow-sm)]",
                  "transition-all duration-200",
                  "focus-within:border-accent-primary/50 focus-within:ring-2 focus-within:ring-accent-primary/10 focus-within:shadow-[var(--shadow-card)]"
                )}
              >
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  rows={1}
                  disabled={isSending}
                  className={cn(
                    "flex-1 resize-none",
                    "bg-transparent",
                    "px-4 py-3 text-[15px] text-text-primary",
                    "placeholder:text-text-muted",
                    "outline-none",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "font-[family-name:var(--font-body)]"
                  )}
                  style={{ minHeight: "48px", maxHeight: "112px" }}
                  aria-label="Message input"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isSending}
                  className={cn(
                    "m-1.5 flex h-9 w-9 shrink-0 items-center justify-center",
                    "rounded-xl",
                    "bg-accent-primary text-white",
                    "shadow-[var(--shadow-sm)]",
                    "transition-all duration-200",
                    "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none",
                    "hover:bg-accent-primary-hover hover:shadow-[var(--shadow-card)] hover:scale-105",
                    "active:scale-95"
                  )}
                  aria-label="Send message"
                >
                  {isSending ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </form>

            {/* Hint text */}
            <p className="mt-1.5 text-center text-[11px] text-text-muted">
              {isSending
                ? "AI is thinking..."
                : "Enter to send · Shift+Enter for new line"}
            </p>
          </div>
        </div>
      </div>

      {/* ====== RIGHT: Context Panel (320px, desktop only) ====== */}
      <AnimatePresence>
        {isContextPanelVisible && (
          <motion.div
            className="hidden lg:flex"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <ContextPanel
              mode={tutorMode}
              onModeChange={setTutorMode}
              starters={CONVERSATION_STARTERS}
              onStarterClick={handleSuggestionClick}
              sessions={sessions}
              activeSessionId={sessionId}
              onSelectSession={onSelectSession}
              onNewChat={startFreshChat}
              isLoadingSessions={isLoadingHistoryList}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== MOBILE: Context Sheet ====== */}
      <MobileContextSheet
        open={isMobileSheetOpen}
        onOpenChange={setIsMobileSheetOpen}
        mode={tutorMode}
        onModeChange={setTutorMode}
        starters={CONVERSATION_STARTERS}
        onStarterClick={handleSuggestionClick}
        sessions={sessions}
        activeSessionId={sessionId}
        onSelectSession={onSelectSession}
        onNewChat={startFreshChat}
        isLoadingSessions={isLoadingHistoryList}
      />
    </div>
  );
}
