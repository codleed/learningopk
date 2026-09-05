export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
};

export type ChatSession = {
  id: string;
  title: string;
  lastMessageAt: string;
};

export type AIContext = {
  chapterId: number;
  chapterTitle: string;
  chapterNumber: number;
  subjectName: string;
  boardName: string;
  className: string;

  currentTab: "summary" | "quick-revision" | "exercises" | "flashcards" | "quiz" | "illustration";
  currentExerciseId?: number;
  currentFlashcardIndex?: number;
  quizQuestionId?: number;
};

export type AIChatState = {
  messages: ChatMessage[];
  sessionId: string | null;
  isStreaming: boolean;
  isSending: boolean;
  error: string | null;
  stoppedStatus: string | null;
  proactiveHint: {
    topic: string;
    message: string;
    reasons: string[];
  } | null;

  rateLimitRemaining: number | null;
  rateLimitTotal: number | null;

  context: AIContext | null;

  isVisible: boolean;
  isExpanded: boolean;
  isHistoryOpen: boolean;
  isFirstVisit: boolean;

  /** Whether the crisis-resources banner is visible (triggered by keyword detection). */
  showCrisisBanner: boolean;

  sessions: ChatSession[];
  activeSessionId: string | null;
  isLoadingSessions: boolean;
};

export type AIChatActions = {
  sendMessage: (content: string) => Promise<void>;
  stopGenerating: () => void;
  loadSession: (sessionId: string) => Promise<void>;
  startNewSession: () => void;
  toggleVisibility: () => void;
  toggleExpanded: () => void;
  toggleHistory: () => void;
  clearError: () => void;
  updateContext: (context: Partial<AIContext>) => void;
  dismissFirstVisit: () => void;
  dismissCrisisBanner: () => void;
  fetchSessionsList: () => Promise<void>;
  refreshSessionsList: (preferredSessionId?: string | null) => Promise<void>;
};

export type AIChatContextValue = AIChatState & AIChatActions;
